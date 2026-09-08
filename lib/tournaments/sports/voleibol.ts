import { z } from "zod";
import { activeEvents, countBySide, setsComplete } from "./helpers";
import type { MatchEvent, MatchScore, SportCatalog, TeamSide } from "./types";

const EmptyPayload = z.record(z.string(), z.unknown()).optional().default({});

const TeamSideSchema = z.enum(["a", "b"]);

const SetPointPayload = z
  .object({
    point_won_by: TeamSideSchema,
  })
  .strict();

/**
 * Vóleibol — BM: sets ganados A–B (best of 5 por defecto).
 * El marcador interno del set vive en `set_point`; BM solo ve `set_won`.
 */
export const voleibolCatalog: SportCatalog = {
  id: "voleibol",
  teamSize: { min: 6, max: 12 },
  bracketScoreKind: "sets",
  bestOf: 5,
  eventTypes: [
    { type: "set_point", layer: "scoring", schema: SetPointPayload },
    { type: "set_won", layer: "scoring", schema: EmptyPayload },
    { type: "ace", layer: "amateur", schema: EmptyPayload },
    { type: "kill", layer: "amateur", schema: EmptyPayload },
    { type: "block_solo", layer: "amateur", schema: EmptyPayload },
    { type: "block_assist", layer: "amateur", schema: EmptyPayload },
    { type: "dig", layer: "amateur", schema: EmptyPayload },
    { type: "attack_error", layer: "amateur", schema: EmptyPayload },
    { type: "serve_error", layer: "amateur", schema: EmptyPayload },
  ],
  deriveMatchScore(events: MatchEvent[]): MatchScore {
    const bestOf = voleibolCatalog.bestOf ?? 5;
    // BM solo usa set_won; set_point es marcador interno del set.
    const fromWon = countBySide(events, (e) => e.type === "set_won");
    return {
      a: fromWon.a,
      b: fromWon.b,
      complete: setsComplete(fromWon.a, fromWon.b, bestOf),
    };
  },
  leaderboardMetrics: [
    { key: "aces", label: "Aces", fromTypes: ["ace"] },
    { key: "kills", label: "Kills", fromTypes: ["kill"] },
    {
      key: "blocks",
      label: "Bloqueos",
      fromTypes: ["block_solo", "block_assist"],
    },
    { key: "digs", label: "Defensas", fromTypes: ["dig"] },
  ],
};

/** Helper de scorer: side ganador del set desde payload de set_point (último punto). */
export function pointWonBy(payload: unknown): TeamSide | null {
  const parsed = SetPointPayload.safeParse(payload);
  return parsed.success ? parsed.data.point_won_by : null;
}

/** Re-export para tests de puntos de set (no afecta BM). */
export function countSetPoints(events: MatchEvent[]): { a: number; b: number } {
  let a = 0;
  let b = 0;
  for (const e of activeEvents(events)) {
    if (e.type !== "set_point") continue;
    const side = pointWonBy(e.payload) ?? e.team_side;
    if (side === "a") a += 1;
    else b += 1;
  }
  return { a, b };
}
