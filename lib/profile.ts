import { isProfilePurged } from "@/lib/account-deletion";
import type { ProfileGate } from "@/lib/player-card";
import { formatMatchesPosition, formatMatchesSportAndFormat } from "@/lib/player-card";

function realDisplayName(
  profile: Pick<ProfileGate, "display_name">,
  email?: string | null,
): boolean {
  const name = profile.display_name.trim();
  if (name.length < 2) return false;
  if (!email) return true;
  const prefix = email.split("@")[0]?.toLowerCase() ?? "";
  return prefix.length < 2 || name.toLowerCase() !== prefix;
}

/** Carta pública en /carta/[code]: misma ficha visible sin filtrar WhatsApp. */
export function isPublicPlayerCard(
  profile: ProfileGate & { deleted_at?: string | null; card_share_code?: string | null },
): boolean {
  if (isProfilePurged(profile)) return false;
  if (!profile.card_share_code?.trim()) return false;
  if (!profile.display_name?.trim() || profile.display_name.trim().length < 2) return false;
  if (!profile.avatar_path?.trim()) return false;
  if (!formatMatchesSportAndFormat(profile.preferred_sport, profile.preferred_format)) {
    return false;
  }
  if (!formatMatchesPosition(profile.preferred_sport, profile.preferred_position)) {
    return false;
  }
  if (!profile.terms_accepted_at) return false;
  return true;
}

/** Perfil listo para pedir cupo: nombre real, foto, deporte+formato, posición, WhatsApp y términos. */
export function isProfileComplete(profile: ProfileGate, email?: string | null): boolean {
  if (!realDisplayName(profile, email)) return false;
  const whatsapp = profile.whatsapp?.trim() ?? "";
  if (whatsapp.length < 10) return false;
  if (!profile.avatar_path?.trim()) return false;
  if (!formatMatchesSportAndFormat(profile.preferred_sport, profile.preferred_format)) {
    return false;
  }
  if (!formatMatchesPosition(profile.preferred_sport, profile.preferred_position)) {
    return false;
  }
  if (!profile.terms_accepted_at) return false;
  return true;
}

export function profileCompletenessHint(profile: ProfileGate, email?: string | null): string | null {
  if (isProfileComplete(profile, email)) return null;
  if (!realDisplayName(profile, email)) {
    return "Pon tu nombre de cancha para que el host sepa quién pide el cupo.";
  }
  if (!profile.avatar_path?.trim()) {
    return "Subí una foto para armar tu carta.";
  }
  if (!formatMatchesSportAndFormat(profile.preferred_sport, profile.preferred_format)) {
    return "Elegí deporte y formato (5v5, 11v11, 3v3…).";
  }
  if (!profile.whatsapp?.trim()) {
    return "Pon un WhatsApp para que el host te escriba cuando confirmen.";
  }
  if (!profile.terms_accepted_at) {
    return "Aceptá los términos para usar tu ficha.";
  }
  return "Terminá tu carta para pedir cupo.";
}

export function missingProfileSteps(profile: ProfileGate, email?: string | null) {
  return {
    identity: !realDisplayName(profile, email) || !profile.avatar_path?.trim(),
    game:
      !formatMatchesSportAndFormat(profile.preferred_sport, profile.preferred_format) ||
      !formatMatchesPosition(profile.preferred_sport, profile.preferred_position),
    contact: (profile.whatsapp?.trim().length ?? 0) < 10 || !profile.terms_accepted_at,
  };
}
