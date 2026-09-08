"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { isUuid } from "@/lib/ids";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  rpcCanManageVenueTournaments,
  rpcCanScoreTournament,
} from "@/lib/tournaments/authz-load";
import {
  appendMatchEvent,
  confirmMatchResult,
  voidMatchEvent,
  type AppendMatchEventInput,
} from "@/lib/tournaments/match-events";
import {
  formatSupportsStageGeneration,
  isTournamentFormat,
  isTournamentSport,
  parseCreateTournamentInput,
  startKnockoutStageFromGroups,
  startStageForTournament,
  validateTeamName,
  type CreateTournamentInput,
  type RegisterTeamInput,
} from "@/lib/tournaments/service";
import type { TeamSide } from "@/lib/tournaments/sports";

export type TournamentActionResult =
  | { ok: true; id: string; message?: string }
  | { ok: false; error: string };

function revalidateTournamentPaths(
  slug: string,
  tournamentId?: string,
  bmMatchId?: number,
) {
  revalidatePath(`/canchas/${slug}/admin/torneos`);
  revalidatePath(`/canchas/${slug}/torneos`);
  if (tournamentId) {
    revalidatePath(`/canchas/${slug}/admin/torneos/${tournamentId}`);
    revalidatePath(`/canchas/${slug}/torneos/${tournamentId}`);
    if (bmMatchId != null) {
      revalidatePath(
        `/canchas/${slug}/admin/torneos/${tournamentId}/partidos/${bmMatchId}`,
      );
    }
  }
}

async function resolveVenueForSlug(slug: string, venueId: string) {
  const supabase = await createClient();
  const { data: venue, error } = await supabase
    .from("venues")
    .select("id, slug")
    .eq("id", venueId)
    .maybeSingle();
  if (error || !venue || venue.slug !== slug) {
    return null;
  }
  return venue;
}

/**
 * Crea torneo (RPC create_tournament + check premium/staff en DB).
 */
export async function createTournamentAction(
  slug: string,
  input: CreateTournamentInput,
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(input.venueId)) {
    return { ok: false, error: "Cancha no válida." };
  }

  const venue = await resolveVenueForSlug(slug, input.venueId);
  if (!venue) return { ok: false, error: "Cancha no encontrada." };

  const parsed = parseCreateTournamentInput(input);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_tournament", {
    p_venue_id: parsed.data.venueId,
    p_name: parsed.data.name,
    p_sport: parsed.data.sport,
    p_format: parsed.data.format,
    p_max_teams: parsed.data.maxTeams,
    p_visibility: parsed.data.visibility,
    p_status: parsed.data.status,
    p_starts_at: parsed.data.startsAt,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || !isUuid(String(data))) {
    return { ok: false, error: "No se pudo crear el torneo." };
  }

  revalidateTournamentPaths(slug, String(data));
  return { ok: true, id: String(data) };
}

/**
 * Inscribe equipo (RPC register_participant / register_tournament_team).
 */
export async function registerParticipantAction(
  slug: string,
  input: RegisterTeamInput,
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(input.tournamentId)) {
    return { ok: false, error: "Torneo no válido." };
  }

  const nameErr = validateTeamName(input.name);
  if (nameErr) return { ok: false, error: nameErr };

  const supabase = await createClient();
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, venue_id")
    .eq("id", input.tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", tournament.venue_id)
    .maybeSingle();
  if (!venue || venue.slug !== slug) {
    return { ok: false, error: "Torneo no pertenece a esta cancha." };
  }

  const members = (input.members ?? []).map((m) => ({
    display_name: m.displayName.trim(),
    user_id: m.userId ?? null,
    jersey_number: m.jerseyNumber ?? null,
  }));

  const { data, error } = await supabase.rpc("register_participant", {
    p_tournament_id: input.tournamentId,
    p_name: input.name.trim(),
    p_captain_user_id: input.captainUserId ?? undefined,
    p_seed: input.seed ?? undefined,
    p_members: members as unknown as Json,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || !isUuid(String(data))) {
    return { ok: false, error: "No se pudo inscribir el equipo." };
  }

  revalidateTournamentPaths(slug, input.tournamentId);
  return { ok: true, id: String(data) };
}

/**
 * Genera stage BM (single/double elim, round-robin o fase de grupos).
 * Solo servidor + service role.
 */
export async function generateStageAction(
  slug: string,
  tournamentId: string,
  options?: { groupCount?: number },
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(tournamentId)) {
    return { ok: false, error: "Torneo no válido." };
  }

  const userClient = await createClient();
  const { data: tournament, error: tErr } = await userClient
    .from("tournaments")
    .select("id, venue_id, format")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const { data: venue } = await userClient
    .from("venues")
    .select("slug")
    .eq("id", tournament.venue_id)
    .maybeSingle();
  if (!venue || venue.slug !== slug) {
    return { ok: false, error: "Torneo no pertenece a esta cancha." };
  }

  if (
    !isTournamentFormat(tournament.format) ||
    !formatSupportsStageGeneration(tournament.format)
  ) {
    return {
      ok: false,
      error: "Este formato no genera bracket automático.",
    };
  }

  const allowed = await rpcCanManageVenueTournaments(userClient, tournament.venue_id);
  if (!allowed) {
    return {
      ok: false,
      error: "No tenés permiso para generar el bracket (premium + manager/owner).",
    };
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return {
      ok: false,
      error: "Falta configuración de servicio (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const result = await startStageForTournament(service, tournamentId, {
    groupCount: options?.groupCount,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateTournamentPaths(slug, tournamentId);
  const groupsNote =
    result.data.groupCount > 1
      ? ` · ${result.data.groupCount} grupos`
      : "";
  return {
    ok: true,
    id: String(result.data.stageId),
    message: `Stage generado (${result.data.participantCount} equipos${groupsNote}).`,
  };
}

/**
 * Segunda fase groups_knockout: llave con clasificados de grupos.
 */
export async function generateKnockoutStageAction(
  slug: string,
  tournamentId: string,
  options?: { qualifyPerGroup?: number },
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(tournamentId)) {
    return { ok: false, error: "Torneo no válido." };
  }

  const userClient = await createClient();
  const { data: tournament, error: tErr } = await userClient
    .from("tournaments")
    .select("id, venue_id, format")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const { data: venue } = await userClient
    .from("venues")
    .select("slug")
    .eq("id", tournament.venue_id)
    .maybeSingle();
  if (!venue || venue.slug !== slug) {
    return { ok: false, error: "Torneo no pertenece a esta cancha." };
  }

  if (tournament.format !== "groups_knockout") {
    return { ok: false, error: "Solo aplica a formato grupos + llave." };
  }

  const allowed = await rpcCanManageVenueTournaments(userClient, tournament.venue_id);
  if (!allowed) {
    return {
      ok: false,
      error: "No tenés permiso para generar la llave (premium + manager/owner).",
    };
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return {
      ok: false,
      error: "Falta configuración de servicio (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const result = await startKnockoutStageFromGroups(service, tournamentId, {
    qualifyPerGroup: options?.qualifyPerGroup,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateTournamentPaths(slug, tournamentId);
  return {
    ok: true,
    id: String(result.data.stageId),
    message: `Llave generada (${result.data.qualifiedCount} clasificados, top ${result.data.qualifyPerGroup}/grupo).`,
  };
}

/**
 * Append evento de acta (assertEventAllowed + RPC append_match_event).
 */
export async function appendMatchEventAction(
  slug: string,
  input: AppendMatchEventInput,
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(input.tournamentId)) {
    return { ok: false, error: "Torneo no válido." };
  }
  if (!Number.isFinite(input.bmMatchId) || input.bmMatchId < 1) {
    return { ok: false, error: "Partido no válido." };
  }
  if (input.teamSide !== "a" && input.teamSide !== "b") {
    return { ok: false, error: "Lado de equipo inválido." };
  }

  const supabase = await createClient();
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, venue_id")
    .eq("id", input.tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", tournament.venue_id)
    .maybeSingle();
  if (!venue || venue.slug !== slug) {
    return { ok: false, error: "Torneo no pertenece a esta cancha." };
  }

  const canScore = await rpcCanScoreTournament(supabase, tournament.venue_id);
  if (!canScore) {
    return {
      ok: false,
      error: "No tenés permiso para cargar acta (premium + scorer/manager/owner).",
    };
  }

  const result = await appendMatchEvent(supabase, input);
  if (!result.ok) return { ok: false, error: result.error };

  revalidateTournamentPaths(slug, input.tournamentId, input.bmMatchId);
  return { ok: true, id: result.data.eventId };
}

/**
 * Anula evento de acta (RPC void_match_event).
 */
export async function voidMatchEventAction(
  slug: string,
  tournamentId: string,
  eventId: string,
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(tournamentId) || !isUuid(eventId)) {
    return { ok: false, error: "Identificadores no válidos." };
  }

  const supabase = await createClient();
  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, venue_id")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const { data: venue } = await supabase
    .from("venues")
    .select("slug")
    .eq("id", tournament.venue_id)
    .maybeSingle();
  if (!venue || venue.slug !== slug) {
    return { ok: false, error: "Torneo no pertenece a esta cancha." };
  }

  const canScore = await rpcCanScoreTournament(supabase, tournament.venue_id);
  if (!canScore) {
    return { ok: false, error: "No tenés permiso para anular eventos." };
  }

  const result = await voidMatchEvent(supabase, eventId);
  if (!result.ok) return { ok: false, error: result.error };

  revalidateTournamentPaths(slug, tournamentId);
  return { ok: true, id: result.data.eventId, message: "Evento anulado." };
}

/**
 * Confirma resultado: derive → BM update.match (service) → finalize agregados.
 */
export async function confirmMatchResultAction(
  slug: string,
  tournamentId: string,
  bmMatchId: number,
): Promise<TournamentActionResult> {
  await requireUserId(`/canchas/${slug}/admin/torneos`);

  if (!isUuid(tournamentId)) {
    return { ok: false, error: "Torneo no válido." };
  }
  if (!Number.isFinite(bmMatchId) || bmMatchId < 1) {
    return { ok: false, error: "Partido no válido." };
  }

  const userClient = await createClient();
  const { data: tournament, error: tErr } = await userClient
    .from("tournaments")
    .select("id, venue_id")
    .eq("id", tournamentId)
    .maybeSingle();

  if (tErr || !tournament) {
    return { ok: false, error: "Torneo no encontrado." };
  }

  const { data: venue } = await userClient
    .from("venues")
    .select("slug")
    .eq("id", tournament.venue_id)
    .maybeSingle();
  if (!venue || venue.slug !== slug) {
    return { ok: false, error: "Torneo no pertenece a esta cancha." };
  }

  const canScore = await rpcCanScoreTournament(userClient, tournament.venue_id);
  if (!canScore) {
    return {
      ok: false,
      error: "No tenés permiso para confirmar (premium + scorer/manager/owner).",
    };
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return {
      ok: false,
      error: "Falta configuración de servicio (SUPABASE_SERVICE_ROLE_KEY).",
    };
  }

  const result = await confirmMatchResult(userClient, service, {
    tournamentId,
    bmMatchId,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateTournamentPaths(slug, tournamentId, bmMatchId);
  return {
    ok: true,
    id: String(bmMatchId),
    message: `Confirmado ${result.data.score.a}-${result.data.score.b}.`,
  };
}

/** Helpers exportados para formularios tipados. */
export function assertSportFormat(sport: string, format: string) {
  return isTournamentSport(sport) && isTournamentFormat(format);
}

export function isTeamSide(v: string): v is TeamSide {
  return v === "a" || v === "b";
}
