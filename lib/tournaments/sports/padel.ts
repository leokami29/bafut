import { z } from "zod";
import { countBySide, setsComplete } from "./helpers";
import type { MatchEvent, MatchScore, SportCatalog } from "./types";

const EmptyPayload = z.record(z.string(), z.unknown()).optional().default({});

const TeamSideSchema = z.enum(["a", "b"]);

const PointWonPayload = z
  .object({
    point_won_by: TeamSideSchema.optional(),
  })
  .strict();

/**
 * Pádel — BM: sets A–B (best of 3).
 * MVP: acta resumida con `set_won` (y opcionalmente `game_won`).
 * `point_won` queda whitelistado para motor de score futuro; no deriva sets solo.
 * Participante = pareja (2 members).
 */
export const padelCatalog: SportCatalog = {
  id: "padel",
  teamSize: { min: 2, max: 2 },
  bracketScoreKind: "sets",
  bestOf: 3,
  eventTypes: [
    { type: "point_won", layer: "scoring", schema: PointWonPayload },
    { type: "game_won", layer: "scoring", schema: EmptyPayload },
    { type: "set_won", layer: "scoring", schema: EmptyPayload },
    { type: "ace", layer: "amateur", schema: EmptyPayload },
    { type: "double_fault", layer: "amateur", schema: EmptyPayload },
    { type: "winner", layer: "amateur", schema: EmptyPayload },
    { type: "forced_error", layer: "amateur", schema: EmptyPayload },
    { type: "unforced_error", layer: "amateur", schema: EmptyPayload },
  ],
  deriveMatchScore(events: MatchEvent[]): MatchScore {
    const bestOf = padelCatalog.bestOf ?? 3;
    const sets = countBySide(events, (e) => e.type === "set_won");
    return {
      a: sets.a,
      b: sets.b,
      complete: setsComplete(sets.a, sets.b, bestOf),
    };
  },
  leaderboardMetrics: [
    { key: "winners", label: "Winners", fromTypes: ["winner"] },
    {
      key: "unforced_errors",
      label: "Errores no forzados",
      fromTypes: ["unforced_error"],
    },
    { key: "aces", label: "Aces", fromTypes: ["ace"] },
    {
      key: "double_faults",
      label: "Dobles faltas",
      fromTypes: ["double_fault"],
    },
  ],
};
