import type { Format, Level, Position, Sport } from "@/lib/constants";
import { LEVELS } from "@/lib/constants";
import { formatAllowedForSport, positionAllowedForSport } from "@/lib/sport-rules";
import type { AvatarFocus } from "@/lib/avatar-focus";

export const PLAYER_GENDERS = ["woman", "man", "other", "undisclosed"] as const;
export type PlayerGender = (typeof PLAYER_GENDERS)[number];

export const PREFERRED_FEET = ["right", "left", "both"] as const;
export type PreferredFoot = (typeof PREFERRED_FEET)[number];

export const WEEKDAYS = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const PROFILE_TIME_SLOTS = ["manana", "tarde", "noche"] as const;
export type ProfileTimeSlot = (typeof PROFILE_TIME_SLOTS)[number];

export const MIN_PLAYER_AGE = 18;

export type ProfileGate = {
  display_name: string;
  whatsapp?: string | null;
  avatar_path?: string | null;
  preferred_sport?: string | null;
  preferred_format?: string | null;
  preferred_position?: string | null;
  terms_accepted_at?: string | null;
};

export type PlayerCardStats = {
  played: number;
  confirmed: number;
  hosted: number;
  decidedClaims: number;
  levelOk: number;
  levelFeedback: number;
  overall: number;
};

/** Labels cortos compartidos entre carta y perfil. */
export const PLAYER_CARD_STAT_LABELS = {
  played: "PJ",
  confirmed: "CF",
  hosted: "ORG",
  trust: "OK",
} as const;

const TRUST_SIGNAL_MIN = 3;

/** Tier visual de la carta según logros (solo datos existentes en stats). */
export type CardTier = "rookie" | "club" | "oro" | "elite";

/**
 * Umbrales de tier de carta:
 * - rookie: overall 0 o menos de 3 partidos jugados (PJ)
 * - club: resto (forma ticket estándar)
 * - oro: overall ≥ 60, o confianza de nivel ≥ 70% con ≥ 3 feedbacks
 * - elite: overall ≥ 80 → forma hexagonal premium
 */
export const CARD_TIER_ELITE_OVERALL = 80;
export const CARD_TIER_ORO_OVERALL = 60;
export const CARD_TIER_ORO_TRUST = 70;
export const CARD_TIER_ROOKIE_MAX_PLAYED = 3;

export function cardTier(stats: PlayerCardStats): CardTier {
  if (stats.overall >= CARD_TIER_ELITE_OVERALL) return "elite";
  const trust = trustPercent(stats);
  if (
    stats.overall >= CARD_TIER_ORO_OVERALL ||
    (trust != null && trust >= CARD_TIER_ORO_TRUST)
  ) {
    return "oro";
  }
  if (stats.overall === 0 || stats.played < CARD_TIER_ROOKIE_MAX_PLAYED) return "rookie";
  return "club";
}

/** Confianza de nivel como % (0–99) cuando hay ≥3 feedbacks; si no, null. */
export function trustPercent(
  stats: Pick<PlayerCardStats, "levelOk" | "levelFeedback">,
): number | null {
  if (stats.levelFeedback < TRUST_SIGNAL_MIN) return null;
  return Math.round((stats.levelOk / stats.levelFeedback) * 99);
}

export function formatStatCount(n: number): string {
  return n > 0 ? String(n).padStart(2, "0") : "—";
}

export function formatTrustStat(stats: Pick<PlayerCardStats, "levelOk" | "levelFeedback">): string {
  const pct = trustPercent(stats);
  return pct != null ? String(pct).padStart(2, "0") : "—";
}

export function asLevel(value: string | null | undefined): Level | null {
  return value && (LEVELS as readonly string[]).includes(value) ? (value as Level) : null;
}

export type PlayerCardDraft = {
  displayName: string;
  avatarUrl: string | null;
  sport: Sport | null;
  format: Format | null;
  position: Position | null;
  secondaryPosition?: Position | null;
  neighborhood?: string | null;
  cityName?: string | null;
  preferredFoot?: PreferredFoot | null;
  heightCm?: number | null;
  age?: number | null;
  playsForPay?: boolean;
  level?: Level | null;
  avatarFocus?: AvatarFocus;
  stats: PlayerCardStats;
};

export function sportUsesPreferredFoot(sport: string | null | undefined) {
  return sport === "futbol" || sport === "futbol_sala";
}

export function isPlayerGender(value: string): value is PlayerGender {
  return (PLAYER_GENDERS as readonly string[]).includes(value);
}

export function isPreferredFoot(value: string): value is PreferredFoot {
  return (PREFERRED_FEET as readonly string[]).includes(value);
}

export function isWeekday(value: string): value is Weekday {
  return (WEEKDAYS as readonly string[]).includes(value);
}

export function isProfileTimeSlot(value: string): value is ProfileTimeSlot {
  return (PROFILE_TIME_SLOTS as readonly string[]).includes(value);
}

export function ageFromBirthDate(isoDate: string | null | undefined, now = new Date()): number | null {
  if (!isoDate) return null;
  const birth = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

export function isAllowedBirthDate(isoDate: string, now = new Date()): boolean {
  const age = ageFromBirthDate(isoDate, now);
  if (age == null) return false;
  if (age < MIN_PLAYER_AGE) return false;
  const year = Number(isoDate.slice(0, 4));
  return year >= 1920;
}

export function computePlayerOverall(input: {
  played: number;
  hosted: number;
  confirmed: number;
  decidedClaims: number;
  levelOk: number;
  levelFeedback: number;
}): number {
  const played = Math.max(0, input.played);
  const hosted = Math.max(0, input.hosted);
  if (played + hosted === 0) return 0;

  const playPts = Math.min(32, played * 4 + hosted * 2);
  const confirmPts =
    input.decidedClaims > 0 ? Math.round((input.confirmed / input.decidedClaims) * 16) : 8;
  const trustPts =
    input.levelFeedback >= 3 ? Math.round((input.levelOk / input.levelFeedback) * 12) : 4;
  return Math.min(99, 40 + playPts + confirmPts + trustPts);
}

export function emptyPlayerCardStats(): PlayerCardStats {
  return {
    played: 0,
    confirmed: 0,
    hosted: 0,
    decidedClaims: 0,
    levelOk: 0,
    levelFeedback: 0,
    overall: 0,
  };
}

export function statsFromActivity(input: {
  played: number;
  hosted: number;
  confirmed: number;
  decidedClaims: number;
  levelOk: number;
  levelFeedback: number;
}): PlayerCardStats {
  return {
    ...input,
    overall: computePlayerOverall(input),
  };
}

export function formatMatchesSportAndFormat(
  sport: string | null | undefined,
  format: string | null | undefined,
): boolean {
  if (!sport || !format) return false;
  return formatAllowedForSport(sport as Sport, format as Format);
}

export function formatMatchesPosition(
  sport: string | null | undefined,
  position: string | null | undefined,
): boolean {
  if (!sport || !position) return false;
  return positionAllowedForSport(sport as Sport, position as Position);
}
