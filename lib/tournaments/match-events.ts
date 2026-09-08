import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { createTournamentBracketsManager } from "@/lib/tournaments/manager";
import {
  assertEventAllowed,
  deriveMatchScore,
  getSportCatalog,
  type MatchEvent,
  type MatchScore,
  type SportId,
  type TeamSide,
} from "@/lib/tournaments/sports";
import { activeEvents } from "@/lib/tournaments/sports/helpers";
import type { DomainResult } from "@/lib/tournaments/service";

type Db = SupabaseClient<Database>;

export type AppendMatchEventInput = {
  tournamentId: string;
  bmMatchId: number;
  teamSide: TeamSide;
  type: string;
  playerId?: string | null;
  period?: number | null;
  clock?: number | null;
  payload?: unknown;
};

export type ConfirmMatchResultInput = {
  tournamentId: string;
  bmMatchId: number;
};

function opponentId(op: Json | null): number | null {
  if (!op || typeof op !== "object" || Array.isArray(op)) return null;
  const id = (op as { id?: unknown }).id;
  return typeof id === "number" ? id : null;
}

/** Agrega métricas de leaderboard por team_member_id desde eventos activos. */
export function aggregatePlayerMetricsFromEvents(
  sport: SportId,
  events: MatchEvent[],
): Record<string, Record<string, number>> {
  const catalog = getSportCatalog(sport);
  const typeToKeys = new Map<string, string[]>();
  for (const metric of catalog.leaderboardMetrics) {
    for (const t of metric.fromTypes) {
      const list = typeToKeys.get(t) ?? [];
      list.push(metric.key);
      typeToKeys.set(t, list);
    }
  }

  // Basquet PTS: sumar puntos reales, no solo conteo de eventos
  const basquetPts: Record<string, number> = {
    fg2_made: 2,
    fg3_made: 3,
    ft_made: 1,
  };

  const out: Record<string, Record<string, number>> = {};

  for (const e of activeEvents(events)) {
    if (!e.player_id) continue;
    const keys = typeToKeys.get(e.type);
    if (!keys?.length) continue;
    const bucket = (out[e.player_id] ??= {});
    for (const key of keys) {
      let delta = 1;
      if (sport === "basquet" && key === "pts") {
        delta = basquetPts[e.type] ?? 0;
      } else if (sport === "futbol" && key === "cards") {
        delta = e.type === "red_card" ? 2 : 1;
      }
      bucket[key] = (bucket[key] ?? 0) + delta;
    }
  }

  return out;
}

export function eventsToDomain(
  rows: Array<{
    type: string;
    team_side: string;
    player_id: string | null;
    period: number | null;
    clock: number | null;
    payload: Json;
    voided_at: string | null;
    sport?: string;
  }>,
): MatchEvent[] {
  return rows.map((r) => ({
    sport: r.sport as SportId | undefined,
    type: r.type,
    team_side: r.team_side as TeamSide,
    player_id: r.player_id,
    period: r.period,
    clock: r.clock,
    payload: r.payload,
    voided_at: r.voided_at,
  }));
}

/**
 * Valida catálogo y llama RPC append_match_event (cliente autenticado).
 */
export async function appendMatchEvent(
  supabase: Db,
  input: AppendMatchEventInput,
): Promise<DomainResult<{ eventId: string }>> {
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, sport, status")
    .eq("id", input.tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const sport = tournament.sport as SportId;
  const allowed = assertEventAllowed(sport, input.type, input.payload ?? {});
  if (!allowed.ok) {
    return { ok: false, error: allowed.error };
  }

  const { data, error } = await supabase.rpc("append_match_event", {
    p_tournament_id: input.tournamentId,
    p_bm_match_id: input.bmMatchId,
    p_team_side: input.teamSide,
    p_type: input.type,
    p_player_id: input.playerId ?? undefined,
    p_period: input.period ?? undefined,
    p_clock: input.clock ?? undefined,
    p_payload: (allowed.payload ?? {}) as Json,
  });

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No se pudo registrar el evento." };
  return { ok: true, data: { eventId: String(data) } };
}

export async function voidMatchEvent(
  supabase: Db,
  eventId: string,
): Promise<DomainResult<{ eventId: string }>> {
  const { data, error } = await supabase.rpc("void_match_event", {
    p_event_id: eventId,
  });
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No se pudo anular el evento." };
  return { ok: true, data: { eventId: String(data) } };
}

/**
 * Derive score → manager.update.match (service) → finalize_match_confirm (user).
 */
export async function confirmMatchResult(
  userClient: Db,
  serviceClient: Db,
  input: ConfirmMatchResultInput,
): Promise<DomainResult<{ score: MatchScore; teamAId: string | null; teamBId: string | null }>> {
  const { data: tournament, error: tErr } = await userClient
    .from("tournaments")
    .select("id, sport, status, venue_id")
    .eq("id", input.tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }
  if (tournament.status !== "active") {
    return { ok: false, error: "Solo se confirman partidos de torneos activos." };
  }

  const sport = tournament.sport as SportId;

  const { data: existing } = await userClient
    .from("tournament_match_results")
    .select("bm_match_id")
    .eq("tournament_id", input.tournamentId)
    .eq("bm_match_id", input.bmMatchId)
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "El partido ya tiene resultado confirmado." };
  }

  const { data: matchRow, error: mErr } = await userClient
    .from("bm_match")
    .select("id, opponent1, opponent2, status")
    .eq("id", input.bmMatchId)
    .eq("tournament_id", input.tournamentId)
    .maybeSingle();

  if (mErr || !matchRow) {
    return { ok: false, error: "Partido no encontrado." };
  }

  const { data: eventRows, error: eErr } = await userClient
    .from("match_events")
    .select("type, team_side, player_id, period, clock, payload, voided_at, sport")
    .eq("tournament_id", input.tournamentId)
    .eq("bm_match_id", input.bmMatchId)
    .order("created_at", { ascending: true });

  if (eErr) return { ok: false, error: eErr.message };

  const events = eventsToDomain(eventRows ?? []);
  const score = deriveMatchScore(sport, events);

  if (!score.complete) {
    return {
      ok: false,
      error: "El partido aún no está completo según las reglas del deporte (sets).",
    };
  }

  if (activeEvents(events).length === 0) {
    return { ok: false, error: "No hay eventos activos para confirmar." };
  }

  if (score.a === score.b) {
    return {
      ok: false,
      error: "Empate no soportado al confirmar (brackets-manager requiere ganador).",
    };
  }

  const pid1 = opponentId(matchRow.opponent1);
  const pid2 = opponentId(matchRow.opponent2);

  const { data: teams } = await userClient
    .from("tournament_teams")
    .select("id, bm_participant_id")
    .eq("tournament_id", input.tournamentId)
    .in(
      "bm_participant_id",
      [pid1, pid2].filter((x): x is number => x != null),
    );

  const byParticipant = new Map(
    (teams ?? []).map((t) => [t.bm_participant_id, t.id] as const),
  );
  const teamAId = pid1 != null ? (byParticipant.get(pid1) ?? null) : null;
  const teamBId = pid2 != null ? (byParticipant.get(pid2) ?? null) : null;

  try {
    const manager = createTournamentBracketsManager(serviceClient, input.tournamentId);
    const aWins = score.a > score.b;
    await manager.update.match({
      id: input.bmMatchId,
      opponent1: { score: score.a, result: aWins ? "win" : "loss" },
      opponent2: { score: score.b, result: aWins ? "loss" : "win" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al actualizar brackets-manager.";
    return { ok: false, error: msg };
  }

  const playerMetrics = aggregatePlayerMetricsFromEvents(sport, events);

  const { error: finErr } = await userClient.rpc("finalize_match_confirm", {
    p_tournament_id: input.tournamentId,
    p_bm_match_id: input.bmMatchId,
    p_score_a: score.a,
    p_score_b: score.b,
    p_team_a_id: teamAId ?? undefined,
    p_team_b_id: teamBId ?? undefined,
    p_player_metrics: playerMetrics as unknown as Json,
  });

  if (finErr) {
    return {
      ok: false,
      error: `Marcador aplicado en bracket, pero falló persistir agregados: ${finErr.message}`,
    };
  }

  return {
    ok: true,
    data: { score, teamAId, teamBId },
  };
}

/** Preview puro: derive desde filas de eventos (tests / UI). */
export function previewMatchScoreFromEvents(
  sport: SportId,
  events: MatchEvent[],
): MatchScore {
  return deriveMatchScore(sport, events);
}
