"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CITY_COOKIE,
  DEFAULT_CITY_SLUG,
  GENDERS,
  LEVELS,
  POSITIONS,
  SPORTS,
  type Format,
  type Position,
  type Sport,
} from "@/lib/constants";
import { requireUserId } from "@/lib/auth";
import { getCityBySlug } from "@/lib/data";
import { datetimeLocalInZoneToDate, cityDayBoundsFromLocal } from "@/lib/datetime";
import { DECLARED_LEVELS, isDeclaredLevel } from "@/lib/level-trust";
import { isProfileComplete } from "@/lib/profile";
import { safeNextPath } from "@/lib/safe-next";
import {
  defaultFormatForSport,
  formatAllowedForSport,
  isDuration,
  isSport,
  positionAllowedForSport,
  SPORT_RULES,
} from "@/lib/sport-rules";
import {
  isGenderPolicy,
  parseCostPerPerson,
  parsePitchSlotsJson,
  parseSlotsJson,
  resolveFormationIdInput,
} from "@/lib/match-write";
import {
  occupancyReason,
  humanizeSideBError,
  occupancyUserMessage,
  parseOccupancyShareCode,
  type OccupancyConflict,
  type OccupancyHit,
  type VenueDayOccupancy,
} from "@/lib/occupancy";
import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";

export type OccupancyActionState = { error?: string; occupancy?: OccupancyConflict };
export type VenueDayOccupancyState = { items?: VenueDayOccupancy[]; error?: string };

/** Estado estándar de una action de mutación: error legible o éxito. */
export type MutationActionState = { ok?: true; error?: string };

/** Compose (crear/editar partido): además puede devolver el conflicto de ocupación. */
export type MatchComposeActionState = MutationActionState & { occupancy?: OccupancyConflict };

/** Resultado de getMatchContactAction. */
export type MatchContactState = {
  ok?: true;
  displayName?: string;
  whatsapp?: string;
  error?: string;
};

type ServerClient = Awaited<ReturnType<typeof createClient>>;

function mapOccupancyHit(row: {
  match_id: string;
  share_code: string;
  host_id: string;
  starts_at: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  away_opened_by: string | null;
  open_slot_count: number;
  has_side_b: boolean;
  sport?: string | null;
  format?: string | null;
}): OccupancyHit {
  return {
    match_id: row.match_id,
    share_code: row.share_code,
    host_id: row.host_id,
    starts_at: row.starts_at,
    duration_min: row.duration_min,
    venue_id: row.venue_id,
    venue_name: row.venue_name,
    away_opened_by: row.away_opened_by ?? null,
    open_slot_count: row.open_slot_count,
    has_side_b: row.has_side_b,
    sport: row.sport ?? "futbol",
    format: row.format ?? null,
  };
}

async function findVenueOccupancy(
  supabase: ServerClient,
  userId: string | null,
  params: {
    venueId: string;
    startsAt: Date;
    durationMin: number;
    excludeMatchId?: string;
  },
): Promise<OccupancyConflict | null> {
  const { data, error } = await supabase.rpc("lookup_venue_occupancy", {
    p_venue_id: params.venueId,
    p_starts_at: params.startsAt.toISOString(),
    p_duration_min: params.durationMin,
    p_exclude_match_id: params.excludeMatchId,
  });
  if (error) {
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }
  const hit = mapOccupancyHit(row);
  return { ...hit, reason: occupancyReason(userId, hit) };
}

function occupancyState(conflict: OccupancyConflict): OccupancyActionState {
  return { error: occupancyUserMessage(conflict), occupancy: conflict };
}

function asOne<T extends readonly string[]>(value: FormDataEntryValue | null, allowed: T, fallback: T[number]) {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) {
    return fallback;
  }
  return value as T[number];
}

export async function setCityAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? DEFAULT_CITY_SLUG);
  const city = await getCityBySlug(slug);
  const jar = await cookies();
  jar.set(CITY_COOKIE, city?.slug ?? DEFAULT_CITY_SLUG, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/");
}

export async function createMatchAction(formData: FormData): Promise<MatchComposeActionState> {
  const { supabase, userId } = await requireUserId("/partidos/nuevo");

  const city = await getCityBySlug(String(formData.get("city_slug") ?? DEFAULT_CITY_SLUG));
  if (!city) {
    return { error: "Esa ciudad todavía no está en BaFut." };
  }

  const venueId = String(formData.get("venue_id") ?? "");
  const startsRaw = String(formData.get("starts_at") ?? "");
  const startsAt = datetimeLocalInZoneToDate(startsRaw, city.timezone);
  if (!venueId || !startsAt || startsAt.getTime() <= Date.now()) {
    return { error: "Elige cancha y una hora que todavía no haya pasado." };
  }

  const sportRaw = String(formData.get("sport") ?? "");
  if (!isSport(sportRaw)) {
    return { error: "Elige un deporte válido." };
  }
  const sport: Sport = sportRaw;

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, city_id, sports")
    .eq("id", venueId)
    .maybeSingle();

  if (venueError || !venue || venue.city_id !== city.id) {
    return { error: "Esa cancha no está en la ciudad activa." };
  }
  if (!venue.sports?.includes(sport)) {
    return { error: "Esa cancha no ofrece ese deporte." };
  }

  const format = asOne(formData.get("format"), SPORT_RULES[sport].formats, defaultFormatForSport(sport)) as Format;
  if (!formatAllowedForSport(sport, format)) {
    return { error: "Ese formato no aplica para el deporte." };
  }

  const durationMin = Number(formData.get("duration_min") ?? 60);
  if (!isDuration(durationMin)) {
    return { error: "La duración debe ser 30, 60 o 90 minutos." };
  }

  const occupancy = await findVenueOccupancy(supabase, userId, {
    venueId,
    startsAt,
    durationMin,
  });
  if (occupancy) {
    return occupancyState(occupancy);
  }

  const position = asOne(formData.get("position"), POSITIONS, "any") as Position;
  if (!positionAllowedForSport(sport, position)) {
    return { error: "Esa posición no aplica para el deporte." };
  }

  const formationResolved = resolveFormationIdInput(
    String(formData.get("formation_id") ?? ""),
    sport,
    format,
  );
  if (formationResolved && typeof formationResolved === "object" && "error" in formationResolved) {
    return { error: formationResolved.error };
  }
  const formationId = typeof formationResolved === "string" ? formationResolved : null;

  const pitchParsed = parsePitchSlotsJson(String(formData.get("pitch_slots_json") ?? ""), sport);
  if (pitchParsed && "error" in pitchParsed) {
    return { error: pitchParsed.error };
  }

  const needKeeper = formData.get("need_keeper") === "on" && SPORT_RULES[sport].hasKeeper;
  const level = asOne(formData.get("level"), LEVELS, "any");
  const costParsed = parseCostPerPerson(String(formData.get("cost_per_person") ?? ""));
  if (costParsed && typeof costParsed === "object" && "error" in costParsed) {
    return { error: costParsed.error };
  }
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 500) {
    return { error: "La nota es demasiado larga (máx. 500 caracteres)." };
  }

  let slotsPayload: Array<{
    match_id?: string;
    position: Position;
    level: string;
    side: "a";
    pitch_index?: number | null;
  }>;

  if (pitchParsed && "slots" in pitchParsed) {
    slotsPayload = pitchParsed.slots.map((slot) => ({
      position: slot.position,
      level: slot.level,
      side: "a" as const,
      pitch_index: slot.pitch_index,
    }));
  } else {
    const openCountRaw = Number(formData.get("open_count") ?? "");
    if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
      return { error: "Los cupos deben ser un número entero entre 1 y 12." };
    }
    slotsPayload = Array.from({ length: openCountRaw }, (_, index) => ({
      position: (needKeeper && index === 0 ? "gk" : position) as Position,
      level,
      side: "a" as const,
      pitch_index: null,
    }));
  }

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      city_id: city.id,
      venue_id: venueId,
      host_id: userId,
      starts_at: startsAt.toISOString(),
      duration_min: durationMin,
      sport,
      format,
      formation_id: formationId,
      cost_per_person: typeof costParsed === "number" ? costParsed : null,
      gender_policy: asOne(formData.get("gender_policy"), GENDERS, "mixed"),
      notes: notes || null,
      status: "open",
    })
    .select("id, share_code")
    .single();

  if (error || !match) {
    const rateLimited = /demasiados partidos/i.test(error?.message ?? "");
    if (error?.code === "23P01" || /occupy|exclusion/i.test(error?.message ?? "")) {
      const raced = await findVenueOccupancy(supabase, userId, {
        venueId,
        startsAt,
        durationMin,
      });
      if (raced) return occupancyState(raced);
    }
    return {
      error: rateLimited
        ? "Publicaste demasiados partidos en poco tiempo. Espera un rato."
        : "No se pudo publicar el partido. Revisa los datos.",
    };
  }

  const slots = slotsPayload.map((slot) => ({ ...slot, match_id: match.id }));

  const { error: slotError } = await supabase.from("match_slots").insert(slots);
  if (slotError) {
    await supabase.from("matches").delete().eq("id", match.id);
    return { error: "El partido se armó mal. Inténtalo de nuevo." };
  }

  revalidatePath("/partidos");
  redirect(`/p/${match.share_code}`);
}

export async function lookupVenueOccupancyAction(input: {
  citySlug: string;
  venueId: string;
  startsAt: string;
  durationMin: number;
  excludeMatchId?: string;
}): Promise<OccupancyActionState> {
  const city = await getCityBySlug(input.citySlug || DEFAULT_CITY_SLUG);
  if (!city || !input.venueId || !isDuration(input.durationMin)) {
    return {};
  }
  const startsAt = datetimeLocalInZoneToDate(input.startsAt, city.timezone);
  if (!startsAt) {
    return {};
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const occupancy = await findVenueOccupancy(supabase, userId, {
    venueId: input.venueId,
    startsAt,
    durationMin: input.durationMin,
    excludeMatchId: input.excludeMatchId && isUuidParam(input.excludeMatchId) ? input.excludeMatchId : undefined,
  });
  return occupancy ? occupancyState(occupancy) : {};
}

export async function listVenueDayOccupancyAction(input: {
  citySlug: string;
  venueId: string;
  dayLocal: string;
  excludeMatchId?: string;
}): Promise<VenueDayOccupancyState> {
  const city = await getCityBySlug(input.citySlug || DEFAULT_CITY_SLUG);
  if (!city || !input.venueId || !isUuidParam(input.venueId)) {
    return { items: [] };
  }
  const bounds = cityDayBoundsFromLocal(input.dayLocal, city.timezone);
  if (!bounds) {
    return { items: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_venue_day_occupancy", {
    p_venue_id: input.venueId,
    p_day_start: bounds.dayStart.toISOString(),
    p_day_end: bounds.dayEnd.toISOString(),
    p_exclude_match_id:
      input.excludeMatchId && isUuidParam(input.excludeMatchId) ? input.excludeMatchId : undefined,
  });

  if (error) {
    return { items: [], error: error.message };
  }

  const items: VenueDayOccupancy[] = (data ?? []).map((row) => ({
    match_id: row.match_id,
    share_code: row.share_code,
    starts_at: row.starts_at,
    duration_min: row.duration_min,
    sport: row.sport,
    format: row.format,
    open_slot_count: row.open_slot_count,
    has_side_b: row.has_side_b,
  }));

  return { items };
}

export async function openMatchSideBAction(
  formData: FormData,
): Promise<OccupancyActionState> {
  const matchId = String(formData.get("match_id") ?? "").trim();
  const shareCode = String(formData.get("share_code") ?? "").trim();
  const nextPath = shareCode && isShareCode(shareCode) ? `/p/${shareCode}` : "/partidos";
  const { supabase } = await requireUserId(nextPath);

  if (!isUuidParam(matchId)) {
    return { error: "Partido no válido." };
  }

  const openCount = Number(formData.get("open_count") ?? 1);
  if (openCount !== 1 && openCount !== 2) {
    return { error: humanizeSideBError("El lado B admite 1 o 2 cupos.") };
  }

  const position = asOne(formData.get("position"), POSITIONS, "any") as Position;
  const level = asOne(formData.get("level"), LEVELS, "any");

  const { data, error } = await supabase.rpc("open_match_side_b", {
    p_match_id: matchId,
    p_open_count: openCount,
    p_position: position,
    p_level: level,
  });

  if (error) {
    return { error: humanizeSideBError(error.message || "No se pudo abrir el otro lado.") };
  }

  const code = typeof data === "string" && isShareCode(data) ? data : shareCode;
  revalidatePath("/partidos");
  if (code) {
    revalidatePath(`/p/${code}`);
    redirect(`/p/${code}`);
  }
  return { error: humanizeSideBError("No se pudo abrir el otro lado.") };
}

export async function updateMatchAction(formData: FormData): Promise<MatchComposeActionState> {
  const matchId = String(formData.get("match_id") ?? "").trim();
  const shareCode = String(formData.get("share_code") ?? "").trim();
  if (!isUuidParam(matchId) || !isShareCode(shareCode)) {
    return { error: "Partido no válido." };
  }

  const { supabase, userId } = await requireUserId(`/p/${shareCode}/editar`);

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("id, host_id, status, starts_at, city_id, share_code")
    .eq("id", matchId)
    .maybeSingle();

  if (matchError || !match || match.host_id !== userId || match.share_code !== shareCode) {
    return { error: "No podés editar ese partido." };
  }
  if (match.status !== "open" || match.starts_at <= new Date().toISOString()) {
    return { error: "Ese partido ya no se puede editar." };
  }

  const { data: cityRow } = await supabase.from("cities").select("timezone").eq("id", match.city_id).maybeSingle();
  const venueId = String(formData.get("venue_id") ?? "");
  const startsRaw = String(formData.get("starts_at") ?? "");
  const startsAt = datetimeLocalInZoneToDate(startsRaw, cityRow?.timezone ?? "America/Bogota");
  if (!venueId || !isUuidParam(venueId) || !startsAt || startsAt.getTime() <= Date.now()) {
    return { error: "Elige cancha y una hora que todavía no haya pasado." };
  }

  const sportRaw = String(formData.get("sport") ?? "");
  if (!isSport(sportRaw)) {
    return { error: "Elige un deporte válido." };
  }
  const sport: Sport = sportRaw;

  const { data: venue, error: venueError } = await supabase
    .from("venues")
    .select("id, city_id, sports")
    .eq("id", venueId)
    .maybeSingle();

  if (venueError || !venue || venue.city_id !== match.city_id) {
    return { error: "Esa cancha no está en la ciudad del partido." };
  }
  if (!venue.sports?.includes(sport)) {
    return { error: "Esa cancha no ofrece ese deporte." };
  }

  const format = asOne(formData.get("format"), SPORT_RULES[sport].formats, defaultFormatForSport(sport)) as Format;
  if (!formatAllowedForSport(sport, format)) {
    return { error: "Ese formato no aplica para el deporte." };
  }

  const durationMin = Number(formData.get("duration_min") ?? 60);
  if (!isDuration(durationMin)) {
    return { error: "La duración debe ser 30, 60 o 90 minutos." };
  }

  const genderRaw = String(formData.get("gender_policy") ?? "mixed");
  if (!isGenderPolicy(genderRaw)) {
    return { error: "Elige quién juega." };
  }

  const costParsed = parseCostPerPerson(String(formData.get("cost_per_person") ?? ""));
  if (costParsed && typeof costParsed === "object" && "error" in costParsed) {
    return { error: costParsed.error };
  }

  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 500) {
    return { error: "La nota es demasiado larga (máx. 500 caracteres)." };
  }

  const parsedSlots = parseSlotsJson(String(formData.get("slots_json") ?? ""), sport);
  if ("error" in parsedSlots) {
    return { error: parsedSlots.error };
  }

  const formationResolved = resolveFormationIdInput(
    String(formData.get("formation_id") ?? ""),
    sport,
    format,
  );
  if (formationResolved && typeof formationResolved === "object" && "error" in formationResolved) {
    return { error: formationResolved.error };
  }
  const formationId = typeof formationResolved === "string" ? formationResolved : null;

  const { error } = await supabase.rpc("update_match", {
    p_match_id: matchId,
    p_venue_id: venueId,
    p_starts_at: startsAt.toISOString(),
    p_duration_min: durationMin,
    p_sport: sport,
    p_format: format,
    p_gender_policy: genderRaw,
    p_cost_per_person: typeof costParsed === "number" ? costParsed : null,
    p_notes: notes || null,
    p_slots: parsedSlots.slots,
    p_formation_id: formationId,
  });

  if (error) {
    const occupiedCode = parseOccupancyShareCode(error.message);
    if (occupiedCode || error.message === "OCCUPANCY") {
      const raced = await findVenueOccupancy(supabase, userId, {
        venueId,
        startsAt,
        durationMin,
        excludeMatchId: matchId,
      });
      if (raced) return occupancyState(raced);
      return { error: "Esa cancha ya está ocupada a esa hora." };
    }
    const rateLimited = /espera un momento|demasiados/i.test(error.message ?? "");
    return {
      error: rateLimited
        ? "Espera un momento y volvé a guardar."
        : error.message || "No se pudo guardar el partido. Revisa los datos.",
    };
  }

  revalidatePath(`/p/${shareCode}`);
  revalidatePath(`/p/${shareCode}/editar`);
  revalidatePath("/partidos");
  revalidatePath("/perfil/partidos");
  redirect(`/p/${shareCode}`);
}

function isUuidParam(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isShareCode(value: string) {
  return /^[a-f0-9]{8}$/.test(value);
}

export async function claimSlotAction(formData: FormData): Promise<MutationActionState> {
  const slotId = String(formData.get("slot_id") ?? "");
  const shareCode = String(formData.get("share_code") ?? "");
  const declaredRaw = String(formData.get("declared_level") ?? "");
  const declaredLevel = isDeclaredLevel(declaredRaw) ? declaredRaw : "mid";
  const levelAck = formData.get("level_ack") === "on" || formData.get("level_ack") === "true";
  const { supabase, userId } = await requireUserId(shareCode ? `/p/${shareCode}` : "/partidos");

  const profile = await (async () => {
    const { data, error } = await supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    if (error || !data) return null;
    const { data: contact } = await supabase
      .from("profile_contacts")
      .select("whatsapp")
      .eq("user_id", userId)
      .maybeSingle();
    return { ...data, whatsapp: contact?.whatsapp ?? null };
  })();

  if (!profile) {
    return { error: "No encontramos tu perfil." };
  }

  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? null;
  if (!isProfileComplete(profile, email)) {
    redirect(`/perfil?next=${encodeURIComponent(`/p/${shareCode}`)}`);
  }

  if (!DECLARED_LEVELS.includes(declaredLevel)) {
    return { error: "Elige un nivel válido." };
  }

  const { error } = await supabase.rpc("claim_slot", {
    p_slot_id: slotId,
    p_declared_level: declaredLevel,
    p_level_ack: levelAck,
  });
  if (error) {
    return { error: error.message || "Ese cupo ya no está o ya lo pediste." };
  }

  revalidatePath(`/p/${shareCode}`);
  revalidatePath("/partidos");
  revalidatePath("/perfil/partidos");
  return { ok: true };
}

export async function submitLevelFeedbackAction(formData: FormData): Promise<MutationActionState> {
  const claimId = String(formData.get("claim_id") ?? "");
  const levelOkRaw = String(formData.get("level_ok") ?? "");
  const levelOk = levelOkRaw === "true" || levelOkRaw === "1";
  if (levelOkRaw !== "true" && levelOkRaw !== "false" && levelOkRaw !== "1" && levelOkRaw !== "0") {
    return { error: "Respuesta no válida." };
  }

  const { supabase } = await requireUserId("/perfil/partidos");
  const { error } = await supabase.rpc("submit_level_feedback", {
    p_claim_id: claimId,
    p_level_ok: levelOk,
  });
  if (error) {
    return { error: error.message || "No se pudo guardar el feedback." };
  }

  revalidatePath("/perfil/partidos");
  return { ok: true };
}

export async function respondClaimAction(formData: FormData): Promise<MutationActionState> {
  const claimId = String(formData.get("claim_id") ?? "");
  const shareCode = String(formData.get("share_code") ?? "");
  const status = String(formData.get("status") ?? "");
  const { supabase } = await requireUserId(shareCode ? `/p/${shareCode}` : "/partidos");

  if (status !== "accepted" && status !== "rejected") {
    return { error: "Acción no válida." };
  }

  const { error } = await supabase.rpc("respond_claim", {
    p_claim_id: claimId,
    p_status: status,
  });
  if (error) {
    return { error: error.message || "No se pudo actualizar el cupo." };
  }

  revalidatePath(`/p/${shareCode}`);
  revalidatePath("/partidos");
  revalidatePath("/perfil/partidos");
  return { ok: true };
}

export async function withdrawClaimAction(formData: FormData): Promise<MutationActionState> {
  const claimId = String(formData.get("claim_id") ?? "");
  const shareCode = String(formData.get("share_code") ?? "");
  const { supabase } = await requireUserId(shareCode ? `/p/${shareCode}` : "/perfil/partidos");

  const { error } = await supabase.rpc("withdraw_claim", { p_claim_id: claimId });
  if (error) {
    return { error: error.message || "No se pudo retirar el pedido." };
  }

  if (shareCode) revalidatePath(`/p/${shareCode}`);
  revalidatePath("/partidos");
  revalidatePath("/perfil/partidos");
  return { ok: true };
}

export async function cancelMatchAction(formData: FormData): Promise<void> {
  const matchId = String(formData.get("match_id") ?? "");
  const shareCode = String(formData.get("share_code") ?? "");
  const { supabase, userId } = await requireUserId(shareCode ? `/p/${shareCode}` : "/perfil/partidos");

  const { data: match } = await supabase
    .from("matches")
    .select("id, host_id, share_code, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || match.host_id !== userId) {
    return;
  }
  if (match.status === "cancelled") {
    return;
  }

  await supabase.from("matches").update({ status: "cancelled" }).eq("id", match.id);

  revalidatePath(`/p/${match.share_code}`);
  revalidatePath("/partidos");
  revalidatePath("/perfil/partidos");
}

export async function getMatchContactAction(claimId: string): Promise<MatchContactState> {
  const { supabase } = await requireUserId();
  const { data, error } = await supabase.rpc("get_match_contact", { p_claim_id: claimId });
  if (error) {
    return { error: "No se pudo cargar el contacto." };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.whatsapp) {
    return { error: "Todavía no hay WhatsApp de la otra parte." };
  }
  return {
    ok: true as const,
    displayName: row.display_name as string,
    whatsapp: row.whatsapp as string,
  };
}

export async function updateProfileAction(formData: FormData): Promise<MutationActionState> {
  const nextRaw = String(formData.get("next") ?? "");
  const nextPath = safeNextPath(nextRaw, "/perfil");
  const { supabase, userId } = await requireUserId("/perfil");
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 40) {
    return { error: "El nombre debe tener entre 2 y 40 caracteres." };
  }

  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp") ?? ""));
  if (!whatsapp) {
    return { error: "Pon un WhatsApp válido (celular colombiano de 10 dígitos)." };
  }

  const preferredSport = asOne(formData.get("preferred_sport"), SPORTS, "futbol") as Sport;
  let preferredPosition = asOne(formData.get("preferred_position"), POSITIONS, "any") as Position;
  if (!positionAllowedForSport(preferredSport, preferredPosition)) {
    preferredPosition = "any";
  }

  const city = await getCityBySlug(String(formData.get("city_slug") ?? DEFAULT_CITY_SLUG));
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      city_id: city?.id ?? null,
      preferred_sport: preferredSport,
      preferred_position: preferredPosition,
      level: asOne(formData.get("level"), LEVELS, "mid"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: "No se pudo guardar el perfil." };
  }

  const { error: contactError } = await supabase.from("profile_contacts").upsert({
    user_id: userId,
    whatsapp,
    updated_at: new Date().toISOString(),
  });
  if (contactError) {
    return { error: "Se guardó el nombre, pero no el WhatsApp. Inténtalo de nuevo." };
  }

  if (city?.slug) {
    const jar = await cookies();
    jar.set(CITY_COOKIE, city.slug, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  if (nextPath !== "/perfil") {
    redirect(nextPath);
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  const { supabase } = await requireUserId();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
