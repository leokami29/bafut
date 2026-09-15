"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  CITY_COOKIE,
  DEFAULT_CITY_SLUG,
  FORMATS,
  LEVELS,
  POSITIONS,
  SPORTS,
  type Format,
  type Position,
  type Sport,
} from "@/lib/constants";
import { requireUserId } from "@/lib/auth";
import { getCityBySlug } from "@/lib/data";
import {
  isAllowedBirthDate,
  isPlayerGender,
  isPreferredFoot,
  isProfileTimeSlot,
  isWeekday,
  sportUsesPreferredFoot,
  type PreferredFoot,
  type ProfileTimeSlot,
  type Weekday,
} from "@/lib/player-card";
import {
  isProfileAvatarPathForUser,
  PROFILE_AVATARS_BUCKET,
} from "@/lib/profile-photos";
import { parseAvatarFocusFields } from "@/lib/avatar-focus";
import { safeNextPath } from "@/lib/safe-next";
import {
  defaultFormatForSport,
  formatAllowedForSport,
  positionAllowedForSport,
} from "@/lib/sport-rules";
import { isProfileComplete } from "@/lib/profile";
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";
import { isDeleteAccountConfirmation } from "@/lib/delete-account-confirmation";
import { SERVICE_ROLE_CONFIG_ERROR, tryCreateServiceClient } from "@/lib/supabase/admin";

type State = { ok?: true; error?: string };

function asOne<T extends readonly string[]>(value: FormDataEntryValue | null, allowed: T, fallback: T[number]) {
  if (typeof value !== "string" || !allowed.includes(value as T[number])) {
    return fallback;
  }
  return value as T[number];
}

function optionalOne<T extends readonly string[]>(
  value: FormDataEntryValue | null,
  allowed: T,
): T[number] | null {
  if (typeof value !== "string" || !value || value === "none") return null;
  return allowed.includes(value as T[number]) ? (value as T[number]) : null;
}

function parseChips<T extends string>(formData: FormData, name: string, isT: (v: string) => v is T): T[] {
  return formData
    .getAll(name)
    .map((item) => (typeof item === "string" ? item : ""))
    .filter(isT);
}

function parseOptionalInt(raw: FormDataEntryValue | null, min: number, max: number): number | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

async function bumpProfile() {
  revalidatePath("/");
  revalidatePath("/perfil");
}

export async function saveProfileAvatarPathAction(formData: FormData): Promise<State> {
  const { supabase, userId } = await requireUserId("/perfil");
  const path = String(formData.get("avatar_path") ?? "").trim();
  if (!isProfileAvatarPathForUser(path, userId)) {
    return { error: "Esa foto no quedó asociada a tu cuenta." };
  }
  const focus = parseAvatarFocusFields(formData);

  const { data: current } = await supabase.from("profiles").select("avatar_path").eq("id", userId).maybeSingle();
  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_path: path,
      avatar_focus_x: focus.x,
      avatar_focus_y: focus.y,
      avatar_zoom: focus.zoom,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    return { error: "No se pudo guardar la foto." };
  }

  const oldPath = current?.avatar_path;
  if (oldPath && oldPath !== path) {
    await supabase.storage.from(PROFILE_AVATARS_BUCKET).remove([oldPath]);
  }
  await bumpProfile();
  return { ok: true };
}

export async function saveProfileAvatarFocusAction(formData: FormData): Promise<State> {
  const { supabase, userId } = await requireUserId("/perfil");
  const focus = parseAvatarFocusFields(formData);
  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_focus_x: focus.x,
      avatar_focus_y: focus.y,
      avatar_zoom: focus.zoom,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    return { error: "No se pudo guardar el recorte." };
  }
  await bumpProfile();
  return { ok: true };
}

export async function saveProfileIdentityAction(formData: FormData): Promise<State> {
  const { supabase, userId } = await requireUserId("/perfil");
  const displayName = String(formData.get("display_name") ?? "").trim();
  if (displayName.length < 2 || displayName.length > 40) {
    return { error: "El nombre debe tener entre 2 y 40 caracteres." };
  }
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    return { error: "No se pudo guardar el nombre." };
  }
  await bumpProfile();
  return { ok: true };
}

export async function saveProfileGameAction(formData: FormData): Promise<State> {
  const { supabase, userId } = await requireUserId("/perfil");
  const preferredSport = asOne(formData.get("preferred_sport"), SPORTS, "futbol") as Sport;
  let preferredFormat = asOne(
    formData.get("preferred_format"),
    FORMATS,
    defaultFormatForSport(preferredSport),
  ) as Format;
  if (!formatAllowedForSport(preferredSport, preferredFormat)) {
    preferredFormat = defaultFormatForSport(preferredSport);
  }
  let preferredPosition = asOne(formData.get("preferred_position"), POSITIONS, "any") as Position;
  if (!positionAllowedForSport(preferredSport, preferredPosition)) {
    preferredPosition = "any";
  }
  const level = asOne(formData.get("level"), LEVELS, "mid");
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_sport: preferredSport,
      preferred_format: preferredFormat,
      preferred_position: preferredPosition,
      level: level === "any" ? "mid" : level,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) {
    return { error: "No se pudo guardar tu juego." };
  }
  await bumpProfile();
  return { ok: true };
}

export async function saveProfileContactAction(formData: FormData): Promise<State> {
  const nextRaw = String(formData.get("next") ?? "");
  const nextPath = safeNextPath(nextRaw, "/perfil");
  const { supabase, userId } = await requireUserId("/perfil");

  const whatsapp = normalizeWhatsapp(String(formData.get("whatsapp") ?? ""));
  if (!whatsapp) {
    return { error: "Pon un WhatsApp válido (celular colombiano de 10 dígitos)." };
  }

  const accepted = formData.get("legal_accepted") === "on" || formData.get("legal_accepted") === "true";
  const { data: current } = await supabase
    .from("profiles")
    .select("terms_accepted_at, city_id")
    .eq("id", userId)
    .maybeSingle();
  if (!accepted && !current?.terms_accepted_at) {
    return { error: "Para armar tu ficha tenés que aceptar los términos y la política de privacidad." };
  }

  const city = await getCityBySlug(String(formData.get("city_slug") ?? DEFAULT_CITY_SLUG));
  const patch: {
    city_id: string | null;
    terms_accepted_at?: string;
    updated_at: string;
  } = {
    city_id: city?.id ?? current?.city_id ?? null,
    updated_at: new Date().toISOString(),
  };
  if (!current?.terms_accepted_at) {
    patch.terms_accepted_at = new Date().toISOString();
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) {
    return { error: "No se pudo guardar el contacto." };
  }

  const { error: contactError } = await supabase.from("profile_contacts").upsert({
    user_id: userId,
    whatsapp,
    updated_at: new Date().toISOString(),
  });
  if (contactError) {
    return { error: "Se guardó el perfil, pero no el WhatsApp. Inténtalo de nuevo." };
  }

  if (city?.slug) {
    const jar = await cookies();
    jar.set(CITY_COOKIE, city.slug, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  await bumpProfile();

  const [{ data: profile }, { data: contact }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("profile_contacts").select("whatsapp").eq("user_id", userId).maybeSingle(),
    supabase.auth.getUser(),
  ]);
  if (
    profile &&
    isProfileComplete({ ...profile, whatsapp: contact?.whatsapp ?? whatsapp }, authData.user?.email) &&
    nextPath !== "/perfil"
  ) {
    redirect(nextPath);
  }
  return { ok: true };
}

export async function saveProfileExtrasAction(formData: FormData): Promise<State> {
  const { supabase, userId } = await requireUserId("/perfil");
  const { data: current } = await supabase
    .from("profiles")
    .select("preferred_sport, preferred_position")
    .eq("id", userId)
    .maybeSingle();
  const sport = (current?.preferred_sport ?? "futbol") as Sport;

  let secondary = optionalOne(formData.get("secondary_position"), POSITIONS) as Position | null;
  if (secondary && (!positionAllowedForSport(sport, secondary) || secondary === current?.preferred_position)) {
    secondary = null;
  }
  if (secondary === "any") secondary = null;

  let foot = optionalOne(formData.get("preferred_foot"), ["right", "left", "both"] as const) as PreferredFoot | null;
  if (foot && !sportUsesPreferredFoot(sport)) foot = null;
  if (foot && !isPreferredFoot(foot)) foot = null;

  const genderRaw = String(formData.get("gender") ?? "").trim();
  const gender = isPlayerGender(genderRaw) ? genderRaw : null;

  const birthRaw = String(formData.get("birth_date") ?? "").trim();
  let birthDate: string | null = null;
  if (birthRaw) {
    if (!isAllowedBirthDate(birthRaw)) {
      return { error: "La fecha de nacimiento no es válida. Tenés que tener 18 años o más." };
    }
    birthDate = birthRaw;
  }

  const neighborhood = String(formData.get("neighborhood") ?? "").trim().slice(0, 80) || null;
  const days = parseChips(formData, "preferred_days", isWeekday) as Weekday[];
  const slots = parseChips(formData, "preferred_time_slots", isProfileTimeSlot) as ProfileTimeSlot[];
  const heightCm = parseOptionalInt(formData.get("height_cm"), 120, 230);
  const weightKg = parseOptionalInt(formData.get("weight_kg"), 35, 180);
  const playsForPay = formData.get("plays_for_pay") === "on" || formData.get("plays_for_pay") === "true";

  const { error } = await supabase
    .from("profiles")
    .update({
      secondary_position: secondary,
      preferred_foot: foot,
      gender,
      birth_date: birthDate,
      neighborhood,
      preferred_days: days,
      preferred_time_slots: slots,
      height_cm: heightCm,
      weight_kg: weightKg,
      plays_for_pay: playsForPay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    return { error: "No se pudo guardar el resto de la ficha." };
  }
  await bumpProfile();
  return { ok: true };
}

async function removeProfileAvatarStorage(userId: string, avatarPath: string | null) {
  const service = tryCreateServiceClient();
  if (!service) return;

  const paths = new Set<string>();
  if (avatarPath) paths.add(avatarPath);

  const { data: listed } = await service.storage.from(PROFILE_AVATARS_BUCKET).list(userId, {
    limit: 100,
  });
  for (const item of listed ?? []) {
    if (item.name) paths.add(`${userId}/${item.name}`);
  }

  if (paths.size > 0) {
    await service.storage.from(PROFILE_AVATARS_BUCKET).remove([...paths]);
  }
}

export async function deleteAccountAction(formData: FormData): Promise<{ error?: string }> {
  const confirm = String(formData.get("confirm") ?? "");
  if (!isDeleteAccountConfirmation(confirm)) {
    return { error: "Escribí ELIMINAR exactamente para confirmar." };
  }

  const { supabase, userId } = await requireUserId("/perfil");
  const service = tryCreateServiceClient();
  if (!service) {
    return { error: SERVICE_ROLE_CONFIG_ERROR };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", userId)
    .maybeSingle();

  const { error: rpcError } = await supabase.rpc("delete_own_account");
  if (rpcError) {
    console.error("delete_own_account", rpcError);
    return {
      error:
        "No se pudo eliminar la cuenta. Si el problema sigue, escribinos desde Apoyar BaFut.",
    };
  }

  await removeProfileAvatarStorage(userId, profile?.avatar_path ?? null);

  const { error: authError } = await service.auth.admin.deleteUser(userId);
  if (authError) {
    console.error("auth.admin.deleteUser", authError);
    return {
      error:
        "Se borraron tus datos, pero no pudimos cerrar la sesión de acceso. Contactanos para terminar el proceso.",
    };
  }

  await supabase.auth.signOut();
  revalidatePath("/");
  redirect("/entrar");
}
