import type { Profile } from "@/lib/types";

/** Perfil listo para pedir cupo: nombre real, no prefijo del correo. */
export function isProfileComplete(profile: Pick<Profile, "display_name">, email?: string | null): boolean {
  const name = profile.display_name.trim();
  if (name.length < 2) {
    return false;
  }
  if (!email) {
    return true;
  }
  const prefix = email.split("@")[0]?.toLowerCase() ?? "";
  return prefix.length < 2 || name.toLowerCase() !== prefix;
}

export function profileCompletenessHint(
  profile: Pick<Profile, "display_name">,
  email?: string | null,
): string | null {
  if (isProfileComplete(profile, email)) {
    return null;
  }
  return "Pon tu nombre de cancha para que el host sepa quién pide el cupo.";
}
