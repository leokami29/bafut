import type { Profile } from "@/lib/types";

/** Perfil listo para pedir cupo: nombre real + WhatsApp. */
export function isProfileComplete(
  profile: Pick<Profile, "display_name"> & { whatsapp?: string | null },
  email?: string | null,
): boolean {
  const name = profile.display_name.trim();
  if (name.length < 2) {
    return false;
  }
  if (!profile.whatsapp?.trim()) {
    return false;
  }
  if (!email) {
    return true;
  }
  const prefix = email.split("@")[0]?.toLowerCase() ?? "";
  return prefix.length < 2 || name.toLowerCase() !== prefix;
}

export function profileCompletenessHint(
  profile: Pick<Profile, "display_name"> & { whatsapp?: string | null },
  email?: string | null,
): string | null {
  if (isProfileComplete(profile, email)) {
    return null;
  }
  if (!profile.whatsapp?.trim()) {
    return "Agrega tu WhatsApp para que el host te escriba si te confirma el cupo.";
  }
  return "Pon tu nombre de cancha para que el host sepa quién pide el cupo.";
}
