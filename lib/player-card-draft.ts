import type { Format, Level, Position, Sport } from "@/lib/constants";
import { SPORTS, FORMATS, POSITIONS } from "@/lib/constants";
import type { AvatarFocus } from "@/lib/avatar-focus";
import type { PlayerCardDraft, PlayerCardStats, PreferredFoot } from "@/lib/player-card";
import { ageFromBirthDate, asLevel } from "@/lib/player-card";
import { avatarFocusFromProfile } from "@/lib/avatar-focus";
import { profileAvatarPublicUrl } from "@/lib/profile-photos";
import type { ProfileWithContact } from "@/lib/types";

function asSport(value: string | null | undefined): Sport | null {
  return value && (SPORTS as readonly string[]).includes(value) ? (value as Sport) : null;
}

function asFormat(value: string | null | undefined): Format | null {
  return value && (FORMATS as readonly string[]).includes(value) ? (value as Format) : null;
}

function asPosition(value: string | null | undefined): Position | null {
  return value && (POSITIONS as readonly string[]).includes(value) ? (value as Position) : null;
}

/** Overrides locales (p. ej. onboarding en vivo) sin duplicar el mapeo del draft. */
export type PlayerCardDraftOverrides = {
  displayName?: string;
  avatarUrl?: string | null;
  sport?: Sport | null;
  format?: Format | null;
  position?: Position | null;
  secondaryPosition?: Position | null;
  level?: Level | null;
  avatarFocus?: AvatarFocus;
};

export function toPlayerCardDraft(
  profile: ProfileWithContact,
  stats: PlayerCardStats,
  cityName?: string | null,
  overrides?: PlayerCardDraftOverrides,
): PlayerCardDraft {
  const draft: PlayerCardDraft = {
    displayName: profile.display_name,
    avatarUrl: profile.avatar_path ? profileAvatarPublicUrl(profile.avatar_path) : null,
    sport: asSport(profile.preferred_sport),
    format: asFormat(profile.preferred_format),
    position: asPosition(profile.preferred_position),
    secondaryPosition: asPosition(profile.secondary_position),
    neighborhood: profile.neighborhood,
    cityName: cityName ?? null,
    preferredFoot: (profile.preferred_foot as PreferredFoot | null) ?? null,
    heightCm: profile.height_cm,
    age: ageFromBirthDate(profile.birth_date),
    playsForPay: profile.plays_for_pay,
    level: asLevel(profile.level),
    avatarFocus: avatarFocusFromProfile(profile),
    stats,
  };
  if (!overrides) return draft;
  return {
    ...draft,
    ...overrides,
    displayName: overrides.displayName ?? draft.displayName,
    avatarUrl: overrides.avatarUrl !== undefined ? overrides.avatarUrl : draft.avatarUrl,
  };
}
