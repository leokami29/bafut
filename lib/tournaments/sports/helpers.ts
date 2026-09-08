import type { MatchEvent, TeamSide } from "./types";

/** Eventos activos (no voided). */
export function activeEvents(events: MatchEvent[]): MatchEvent[] {
  return events.filter((e) => !e.voided_at);
}

export function countBySide(
  events: MatchEvent[],
  predicate: (e: MatchEvent) => boolean,
): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const e of activeEvents(events)) {
    if (!predicate(e)) continue;
    if (e.team_side === "a") a += 1;
    else if (e.team_side === "b") b += 1;
  }
  return { a, b };
}

export function oppositeSide(side: TeamSide): TeamSide {
  return side === "a" ? "b" : "a";
}

/** Sets necesarios para ganar un best-of-N. */
export function setsToWin(bestOf: 3 | 5): number {
  return Math.ceil(bestOf / 2);
}

export function setsComplete(a: number, b: number, bestOf: 3 | 5): boolean {
  const need = setsToWin(bestOf);
  return a >= need || b >= need;
}
