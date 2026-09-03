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
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";

function asOne<T extends readonly string[]>(value: FormDataEntryValue | null, allowed: T, fallback: T[number]) {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) {
    return fallback;
  }
  return value as T[number];
}

export async function setCityAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? DEFAULT_CITY_SLUG);
  const city = await getCityBySlug(slug);
  const jar = await cookies();
  jar.set(CITY_COOKIE, city?.slug ?? DEFAULT_CITY_SLUG, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/");
}

export async function createMatchAction(formData: FormData) {
  const { supabase, userId } = await requireUserId("/partidos/nuevo");

  const city = await getCityBySlug(String(formData.get("city_slug") ?? DEFAULT_CITY_SLUG));
  if (!city) {
    return { error: "Esa ciudad todavía no está en BaFut." };
  }

  const venueId = String(formData.get("venue_id") ?? "");
  const startsRaw = String(formData.get("starts_at") ?? "");
  const startsAt = new Date(startsRaw);
  if (!venueId || Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
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

  const position = asOne(formData.get("position"), POSITIONS, "any") as Position;
  if (!positionAllowedForSport(sport, position)) {
    return { error: "Esa posición no aplica para el deporte." };
  }

  const openCountRaw = Number(formData.get("open_count") ?? "");
  if (!Number.isInteger(openCountRaw) || openCountRaw < 1 || openCountRaw > 12) {
    return { error: "Los cupos deben ser un número entero entre 1 y 12." };
  }
  const openCount = openCountRaw;
  const needKeeper = formData.get("need_keeper") === "on" && SPORT_RULES[sport].hasKeeper;
  const level = asOne(formData.get("level"), LEVELS, "any");
  const costRaw = String(formData.get("cost_per_person") ?? "").replace(/\D/g, "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 500) {
    return { error: "La nota es demasiado larga (máx. 500 caracteres)." };
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
      cost_per_person: costRaw ? Number(costRaw) : null,
      gender_policy: asOne(formData.get("gender_policy"), GENDERS, "mixed"),
      notes: notes || null,
      status: "open",
    })
    .select("id, share_code")
    .single();

  if (error || !match) {
    const rateLimited = /demasiados partidos/i.test(error?.message ?? "");
    return {
      error: rateLimited
        ? "Publicaste demasiados partidos en poco tiempo. Espera un rato."
        : "No se pudo publicar el partido. Revisa los datos.",
    };
  }

  const slots = Array.from({ length: openCount }, (_, index) => ({
    match_id: match.id,
    position: needKeeper && index === 0 ? "gk" : position,
    level,
  }));

  const { error: slotError } = await supabase.from("match_slots").insert(slots);
  if (slotError) {
    await supabase.from("matches").delete().eq("id", match.id);
    return { error: "El partido se armó mal. Inténtalo de nuevo." };
  }

  revalidatePath("/partidos");
  redirect(`/p/${match.share_code}`);
}

export async function claimSlotAction(formData: FormData) {
  const slotId = String(formData.get("slot_id") ?? "");
  const shareCode = String(formData.get("share_code") ?? "");
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

  const { error } = await supabase.rpc("claim_slot", { p_slot_id: slotId });
  if (error) {
    return { error: error.message || "Ese cupo ya no está o ya lo pediste." };
  }

  revalidatePath(`/p/${shareCode}`);
  revalidatePath("/partidos");
  revalidatePath("/perfil/partidos");
  return { ok: true };
}

export async function respondClaimAction(formData: FormData) {
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

export async function withdrawClaimAction(formData: FormData) {
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

export async function getMatchContactAction(claimId: string) {
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

export async function updateProfileAction(formData: FormData) {
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

export async function signOutAction() {
  const { supabase } = await requireUserId();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
