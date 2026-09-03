"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CITY_COOKIE, DEFAULT_CITY_SLUG, FORMATS, GENDERS, LEVELS, POSITIONS, SPORTS } from "@/lib/constants";
import { requireUserId } from "@/lib/auth";
import { getCityBySlug } from "@/lib/data";
import { isProfileComplete } from "@/lib/profile";

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

  const openCount = Math.min(12, Math.max(1, Number(formData.get("open_count") ?? 1)));
  const needKeeper = formData.get("need_keeper") === "on";
  const position = asOne(formData.get("position"), POSITIONS, "any");
  const level = asOne(formData.get("level"), LEVELS, "any");
  const costRaw = String(formData.get("cost_per_person") ?? "").replace(/\D/g, "");

  const { data: match, error } = await supabase
    .from("matches")
    .insert({
      city_id: city.id,
      venue_id: venueId,
      host_id: userId,
      starts_at: startsAt.toISOString(),
      duration_min: Number(formData.get("duration_min") ?? 60),
      sport: asOne(formData.get("sport"), SPORTS, "futbol"),
      format: asOne(formData.get("format"), FORMATS, "5v5"),
      cost_per_person: costRaw ? Number(costRaw) : null,
      gender_policy: asOne(formData.get("gender_policy"), GENDERS, "mixed"),
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id, share_code")
    .single();

  if (error || !match) {
    return { error: "No se pudo publicar el partido. Revisa los datos." };
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile) {
    return { error: "No encontramos tu perfil." };
  }

  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email ?? null;
  if (!isProfileComplete(profile, email)) {
    redirect(`/perfil?next=/p/${shareCode}`);
  }

  const { error } = await supabase.rpc("claim_slot", { p_slot_id: slotId });
  if (error) {
    return { error: "Ese cupo ya no está o ya lo pediste." };
  }

  revalidatePath(`/p/${shareCode}`);
  revalidatePath("/partidos");
  return { ok: true };
}

export async function respondClaimAction(formData: FormData) {
  const claimId = String(formData.get("claim_id") ?? "");
  const shareCode = String(formData.get("share_code") ?? "");
  const status = String(formData.get("status") ?? "");
  const { supabase, userId } = await requireUserId(shareCode ? `/p/${shareCode}` : "/partidos");

  if (status !== "accepted" && status !== "rejected") {
    return { error: "Acción no válida." };
  }

  const { data: claim } = await supabase
    .from("slot_claims")
    .select("id, match_id, matches!inner(host_id)")
    .eq("id", claimId)
    .maybeSingle();

  if (!claim || (claim.matches as { host_id: string }).host_id !== userId) {
    return { error: "Solo quien armó el partido puede confirmar." };
  }

  const { error } = await supabase.from("slot_claims").update({ status }).eq("id", claimId);
  if (error) {
    return { error: "No se pudo actualizar el cupo." };
  }

  revalidatePath(`/p/${shareCode}`);
  revalidatePath("/partidos");
  return { ok: true };
}

export async function updateProfileAction(formData: FormData) {
  const { supabase, userId } = await requireUserId("/perfil");
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 2) {
    return { error: "Pon un nombre para que te reconozcan en la cancha." };
  }

  const city = await getCityBySlug(String(formData.get("city_slug") ?? DEFAULT_CITY_SLUG));
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      city_id: city?.id ?? null,
      preferred_sport: asOne(formData.get("preferred_sport"), SPORTS, "futbol"),
      preferred_position: asOne(formData.get("preferred_position"), POSITIONS, "any"),
      level: asOne(formData.get("level"), LEVELS, "mid"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: "No se pudo guardar el perfil." };
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
  return { ok: true };
}

export async function signOutAction() {
  const { supabase } = await requireUserId();
  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/");
}
