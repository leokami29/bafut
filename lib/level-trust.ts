import type { Level } from "@/lib/constants";

/** Declared / profile levels only (no `any`). */
export const DECLARED_LEVELS = ["low", "mid", "high"] as const;
export type DeclaredLevel = (typeof DECLARED_LEVELS)[number];

const LEVEL_ORDER: Record<DeclaredLevel, number> = {
  low: 0,
  mid: 1,
  high: 2,
};

export const LEVEL_SIGNAL_MIN = 3;

export function levelOrder(level: DeclaredLevel): number {
  return LEVEL_ORDER[level];
}

/** Profile level for claim default; falls back to mid when missing or `any`. */
export function defaultDeclaredLevel(
  profileLevel: string | null | undefined,
): DeclaredLevel {
  if (profileLevel === "low" || profileLevel === "mid" || profileLevel === "high") {
    return profileLevel;
  }
  return "mid";
}

export function isDeclaredLevel(value: string | null | undefined): value is DeclaredLevel {
  return value === "low" || value === "mid" || value === "high";
}

/** True when slot is not `any` and declared differs from slot. */
export function isMismatch(
  slotLevel: Level | string | null | undefined,
  declared: DeclaredLevel | string | null | undefined,
): boolean {
  if (!slotLevel || slotLevel === "any") return false;
  if (!declared) return false;
  return slotLevel !== declared;
}

export function matchEndsAt(startsAt: Date | string, durationMin: number): Date {
  const start = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  return new Date(start.getTime() + durationMin * 60_000);
}

/** Eligible from match end through +7 days (inclusive of end, exclusive past window). */
export function isFeedbackWindow(
  now: Date,
  startsAt: Date | string,
  durationMin: number,
): boolean {
  const ends = matchEndsAt(startsAt, durationMin);
  const closes = new Date(ends.getTime() + 7 * 24 * 60 * 60_000);
  return now >= ends && now <= closes;
}

/** Badge copy when signal threshold is met; null if total < LEVEL_SIGNAL_MIN. */
export function formatLevelOkBadge(
  ok: number,
  total: number,
): string | null {
  if (total < LEVEL_SIGNAL_MIN) return null;
  return `Nivel OK · ${ok}/${total}`;
}
