import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  MAX_PARTICIPANTS_PER_TOURNAMENT,
  MAX_PARTICIPANTS_PER_TOURNAMENT_HARD,
  TOURNAMENT_FORMATS,
  TOURNAMENT_SPORTS,
  type TournamentFormat,
  type TournamentSport,
} from "@/lib/tournaments/authz";
import { createTournamentBracketsManager } from "@/lib/tournaments/manager";

type StageType = "round_robin" | "single_elimination" | "double_elimination";

/** Fórmula 3-1-0 (estilo fútbol) para ranking RR de brackets-manager. */
export const DEFAULT_RR_RANKING_FORMULA = (item: {
  wins: number;
  draws: number;
  losses: number;
}) => 3 * item.wins + 1 * item.draws + 0 * item.losses;

export type CreateTournamentInput = {
  venueId: string;
  name: string;
  sport: TournamentSport;
  format: TournamentFormat;
  maxTeams?: number;
  visibility?: "private" | "published";
  status?: "draft" | "registration";
  startsAt?: string | null;
};

export type RegisterTeamInput = {
  tournamentId: string;
  name: string;
  captainUserId?: string | null;
  seed?: number | null;
  members?: Array<{
    displayName: string;
    userId?: string | null;
    jerseyNumber?: number | null;
  }>;
};

export type DomainResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type StartStageOptions = {
  stageName?: string;
  /** Cantidad de grupos (RR / fase de grupos). */
  groupCount?: number;
};

export type StartKnockoutOptions = {
  stageName?: string;
  /** Clasificados por grupo (default 2). */
  qualifyPerGroup?: number;
};

const NAME_MIN = 2;
const NAME_MAX = 80;
const TEAM_NAME_MAX = 60;

/** Status BM: Completed */
const BM_STATUS_COMPLETED = 4;

export function isTournamentSport(v: string): v is TournamentSport {
  return (TOURNAMENT_SPORTS as readonly string[]).includes(v);
}

export function isTournamentFormat(v: string): v is TournamentFormat {
  return (TOURNAMENT_FORMATS as readonly string[]).includes(v);
}

/**
 * Mapea formato BaFut → tipo de stage brackets-manager (fase inicial).
 * `groups_knockout` arranca como round_robin multi-grupo; la llave es un 2º stage.
 */
export function formatToStageType(format: TournamentFormat): StageType | null {
  switch (format) {
    case "single_elim":
      return "single_elimination";
    case "double_elim":
      return "double_elimination";
    case "round_robin":
    case "groups_knockout":
      return "round_robin";
    default:
      return null;
  }
}

/** ¿El formato genera stage automáticamente con `startStageForTournament`? */
export function formatSupportsStageGeneration(format: TournamentFormat): boolean {
  return formatToStageType(format) != null;
}

/**
 * Cantidad de grupos por defecto según formato y N equipos.
 * - round_robin → 1 (liga única)
 * - groups_knockout → 2–4 según tamaño (grupos ~3–4)
 */
export function defaultGroupCount(
  format: TournamentFormat,
  teamCount: number,
): number {
  if (format === "round_robin") return 1;
  if (format !== "groups_knockout") return 1;
  if (teamCount < 4) return 2;
  if (teamCount <= 7) return 2;
  if (teamCount <= 11) return 2;
  if (teamCount <= 15) return 3;
  return 4;
}

export function clampGroupCount(
  raw: number | undefined,
  teamCount: number,
  format: TournamentFormat,
): number {
  const fallback = defaultGroupCount(format, teamCount);
  const n = Number.isFinite(raw) ? Math.trunc(raw as number) : fallback;
  const maxByTeams = Math.max(1, Math.floor(teamCount / 2));
  return Math.min(maxByTeams, Math.max(1, n || fallback));
}

export function nextPowerOfTwo(n: number): number {
  if (n <= 1) return 1;
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Orden de seeding de clasificados: todos los 1º, luego 2º, etc.
 * Con seedOrdering `natural` en SE de 4: [1A,1B,2A,2B] → 1Avs2B y 1Bvs2A.
 * `byGroup` debe venir ordenado por rank ASC dentro de cada grupo.
 */
export function interleaveGroupQualifiers(
  byGroup: Array<Array<{ id: number }>>,
): number[] {
  if (byGroup.length === 0) return [];
  const maxRank = Math.max(0, ...byGroup.map((g) => g.length));
  const out: number[] = [];
  for (let rank = 0; rank < maxRank; rank++) {
    for (const group of byGroup) {
      const item = group[rank];
      if (item) out.push(item.id);
    }
  }
  return out;
}

export function padSeedingIdsWithByes(
  ids: number[],
  size = nextPowerOfTwo(ids.length),
): Array<number | null> {
  const seeding: Array<number | null> = [...ids];
  while (seeding.length < size) seeding.push(null);
  return seeding;
}

export function stageNameForFormat(
  tournamentName: string,
  format: TournamentFormat,
  override?: string,
): string {
  if (override?.trim()) return override.trim();
  switch (format) {
    case "round_robin":
      return `${tournamentName} — Liga`;
    case "groups_knockout":
      return `${tournamentName} — Grupos`;
    case "double_elim":
      return `${tournamentName} — Doble elim.`;
    default:
      return `${tournamentName} — Eliminación`;
  }
}

export function clampMaxTeams(raw: number | undefined): number {
  const n = Number.isFinite(raw) ? Math.trunc(raw as number) : MAX_PARTICIPANTS_PER_TOURNAMENT;
  return Math.min(
    MAX_PARTICIPANTS_PER_TOURNAMENT_HARD,
    Math.max(2, n || MAX_PARTICIPANTS_PER_TOURNAMENT),
  );
}

export function validateTournamentName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) {
    return `El nombre debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
  }
  return null;
}

export function validateTeamName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > TEAM_NAME_MAX) {
    return `El nombre del equipo debe tener entre 1 y ${TEAM_NAME_MAX} caracteres.`;
  }
  return null;
}

/** Orden de seeding: seed ASC (nulls al final), luego created_at. */
export function orderTeamsForSeeding<
  T extends { seed: number | null; created_at: string; name: string },
>(teams: T[]): T[] {
  return [...teams].sort((a, b) => {
    if (a.seed != null && b.seed != null && a.seed !== b.seed) {
      return a.seed - b.seed;
    }
    if (a.seed != null && b.seed == null) return -1;
    if (a.seed == null && b.seed != null) return 1;
    return a.created_at.localeCompare(b.created_at);
  });
}

type Db = SupabaseClient<Database>;

async function linkParticipantsToTeams(
  supabase: Db,
  tournamentId: string,
  ordered: Array<{ id: string; name: string }>,
): Promise<DomainResult<true>> {
  const { data: participants, error: pErr } = await supabase
    .from("bm_participant")
    .select("id, name")
    .eq("tournament_id", tournamentId);
  if (pErr) return { ok: false, error: pErr.message };

  const byName = new Map((participants ?? []).map((p) => [p.name, p.id]));
  for (const team of ordered) {
    const pid = byName.get(team.name);
    if (pid == null) continue;
    const { error: linkErr } = await supabase
      .from("tournament_teams")
      .update({ bm_participant_id: pid })
      .eq("id", team.id);
    if (linkErr) return { ok: false, error: linkErr.message };
  }
  return { ok: true, data: true };
}

/**
 * Orquesta create.stage de BM + link de bm_participant_id en tournament_teams.
 * Requiere cliente con write a bm_* (service role).
 * Soporta single/double elim, round-robin y fase de grupos (groups_knockout).
 */
export async function startStageForTournament(
  supabase: Db,
  tournamentId: string,
  options?: StartStageOptions,
): Promise<
  DomainResult<{ stageId: IdLike; participantCount: number; groupCount: number }>
> {
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, name, format, status, max_teams")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  if (tournament.status !== "registration" && tournament.status !== "draft") {
    return {
      ok: false,
      error: "Solo se puede generar el bracket desde borrador o inscripción.",
    };
  }

  const format = tournament.format as TournamentFormat;
  if (!isTournamentFormat(format)) {
    return { ok: false, error: "Formato de torneo no válido." };
  }

  const stageType = formatToStageType(format);
  if (!stageType) {
    return { ok: false, error: "Este formato no genera bracket automático." };
  }

  const { data: existingStages, error: stErr } = await supabase
    .from("bm_stage")
    .select("id")
    .eq("tournament_id", tournamentId)
    .limit(1);
  if (stErr) return { ok: false, error: stErr.message };
  if (existingStages && existingStages.length > 0) {
    return { ok: false, error: "El torneo ya tiene un stage generado." };
  }

  const { data: teams, error: teamsErr } = await supabase
    .from("tournament_teams")
    .select("id, name, seed, created_at, bm_participant_id")
    .eq("tournament_id", tournamentId);

  if (teamsErr) return { ok: false, error: teamsErr.message };
  const list = teams ?? [];
  if (list.length < 2) {
    return { ok: false, error: "Se necesitan al menos 2 equipos para generar el bracket." };
  }
  if (format === "groups_knockout" && list.length < 4) {
    return {
      ok: false,
      error: "Grupos + llave necesita al menos 4 equipos.",
    };
  }
  if (list.length > tournament.max_teams) {
    return { ok: false, error: "Hay más equipos que el máximo del torneo." };
  }

  const ordered = orderTeamsForSeeding(list);
  const seeding = ordered.map((t) => t.name);
  const groupCount =
    stageType === "round_robin"
      ? clampGroupCount(options?.groupCount, ordered.length, format)
      : 1;

  if (stageType === "round_robin" && groupCount > 1) {
    const perGroup = ordered.length / groupCount;
    if (perGroup < 2) {
      return {
        ok: false,
        error: `Con ${ordered.length} equipos no caben ${groupCount} grupos (mín. 2 por grupo).`,
      };
    }
  }

  const manager = createTournamentBracketsManager(supabase, tournamentId);

  try {
    const settings =
      stageType === "round_robin"
        ? {
            groupCount,
            roundRobinMode: "simple" as const,
            seedOrdering: ["groups.effort_balanced" as const],
          }
        : {
            seedOrdering: ["natural" as const],
            balanceByes: true,
          };

    const stage = await manager.create.stage({
      tournamentId,
      name: stageNameForFormat(tournament.name, format, options?.stageName),
      type: stageType,
      seeding,
      settings,
    });

    const linked = await linkParticipantsToTeams(supabase, tournamentId, ordered);
    if (!linked.ok) return linked;

    const { error: statusErr } = await supabase
      .from("tournaments")
      .update({ status: "active" })
      .eq("id", tournamentId);
    if (statusErr) return { ok: false, error: statusErr.message };

    return {
      ok: true,
      data: {
        stageId: stage.id,
        participantCount: ordered.length,
        groupCount,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar el bracket.";
    return { ok: false, error: msg };
  }
}

/**
 * Segunda fase de groups_knockout: crea single_elim con clasificados de la fase de grupos.
 */
export async function startKnockoutStageFromGroups(
  supabase: Db,
  tournamentId: string,
  options?: StartKnockoutOptions,
): Promise<
  DomainResult<{ stageId: IdLike; qualifiedCount: number; qualifyPerGroup: number }>
> {
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, name, format, status")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }
  if (tournament.format !== "groups_knockout") {
    return { ok: false, error: "Solo aplica a formato grupos + llave." };
  }
  if (tournament.status !== "active") {
    return { ok: false, error: "El torneo debe estar en curso para generar la llave." };
  }

  const { data: stages, error: stErr } = await supabase
    .from("bm_stage")
    .select("id, type, number, name")
    .eq("tournament_id", tournamentId)
    .order("number", { ascending: true });
  if (stErr) return { ok: false, error: stErr.message };

  const groupStage = (stages ?? []).find((s) => s.type === "round_robin");
  if (!groupStage) {
    return { ok: false, error: "Falta la fase de grupos. Generá los grupos primero." };
  }
  if ((stages ?? []).some((s) => s.type === "single_elimination" || s.type === "double_elimination")) {
    return { ok: false, error: "La llave eliminatoria ya está generada." };
  }

  const { data: groupMatches, error: mErr } = await supabase
    .from("bm_match")
    .select("id, status")
    .eq("tournament_id", tournamentId)
    .eq("stage_id", groupStage.id);
  if (mErr) return { ok: false, error: mErr.message };
  const matches = groupMatches ?? [];
  if (matches.length === 0) {
    return { ok: false, error: "No hay partidos en la fase de grupos." };
  }
  const unfinished = matches.filter((m) => m.status !== BM_STATUS_COMPLETED);
  if (unfinished.length > 0) {
    return {
      ok: false,
      error: `Todavía hay ${unfinished.length} partido(s) de grupos sin completar en el bracket.`,
    };
  }

  const qualifyPerGroup = Math.max(
    1,
    Math.min(4, Math.trunc(options?.qualifyPerGroup ?? 2) || 2),
  );

  const manager = createTournamentBracketsManager(supabase, tournamentId);

  try {
    const standings = await manager.get.finalStandings(groupStage.id, {
      rankingFormula: DEFAULT_RR_RANKING_FORMULA,
      maxQualifiedParticipantsPerGroup: qualifyPerGroup,
    });

    // Agrupar por groupId preservando orden de rank
    const groupOrder: number[] = [];
    const byGroup = new Map<number, Array<{ id: number; rank: number }>>();
    for (const row of standings) {
      const gid = Number(row.groupId);
      if (!byGroup.has(gid)) {
        byGroup.set(gid, []);
        groupOrder.push(gid);
      }
      byGroup.get(gid)!.push({ id: Number(row.id), rank: row.rank });
    }
    for (const list of byGroup.values()) {
      list.sort((a, b) => a.rank - b.rank);
    }

    const orderedGroups = groupOrder.map((gid) => byGroup.get(gid) ?? []);
    const qualifiedIds = interleaveGroupQualifiers(orderedGroups);

    if (qualifiedIds.length < 2) {
      return {
        ok: false,
        error: "No hay suficientes clasificados para armar la llave.",
      };
    }

    const seedingIds = padSeedingIdsWithByes(qualifiedIds);
    const stage = await manager.create.stage({
      tournamentId,
      name:
        options?.stageName?.trim() ||
        `${tournament.name} — Llave`,
      type: "single_elimination",
      seedingIds,
      settings: {
        seedOrdering: ["natural"],
        balanceByes: true,
      },
    });

    return {
      ok: true,
      data: {
        stageId: stage.id,
        qualifiedCount: qualifiedIds.length,
        qualifyPerGroup,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al generar la llave.";
    return { ok: false, error: msg };
  }
}

type IdLike = string | number;

/** Validación pura previa a RPC create_tournament. */
export function parseCreateTournamentInput(
  input: CreateTournamentInput,
): DomainResult<{
  venueId: string;
  name: string;
  sport: TournamentSport;
  format: TournamentFormat;
  maxTeams: number;
  visibility: "private" | "published";
  status: "draft" | "registration";
  startsAt: string | null;
}> {
  const nameErr = validateTournamentName(input.name);
  if (nameErr) return { ok: false, error: nameErr };
  if (!isTournamentSport(input.sport)) {
    return { ok: false, error: "Deporte no válido." };
  }
  if (!isTournamentFormat(input.format)) {
    return { ok: false, error: "Formato no válido." };
  }
  const visibility = input.visibility ?? "private";
  if (visibility !== "private" && visibility !== "published") {
    return { ok: false, error: "Visibilidad no válida." };
  }
  const status = input.status ?? "registration";
  if (status !== "draft" && status !== "registration") {
    return { ok: false, error: "Estado inicial no válido." };
  }
  return {
    ok: true,
    data: {
      venueId: input.venueId,
      name: input.name.trim(),
      sport: input.sport,
      format: input.format,
      maxTeams: clampMaxTeams(input.maxTeams),
      visibility,
      status,
      startsAt: input.startsAt ?? null,
    },
  };
}
