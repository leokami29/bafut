import { z } from "zod";
import { activeEvents } from "./helpers";
import type { MatchEvent, MatchScore, SportCatalog } from "./types";

const EmptyPayload = z.record(z.string(), z.unknown()).optional().default({});

/**
 * Baloncesto — BM: puntos A–B.
 * Score: 2*fg2_made + 3*fg3_made + 1*ft_made.
 */
export const basquetCatalog: SportCatalog = {
  id: "basquet",
  teamSize: { min: 5, max: 12 },
  bracketScoreKind: "points",
  eventTypes: [
    { type: "fg2_made", layer: "scoring", schema: EmptyPayload },
    { type: "fg3_made", layer: "scoring", schema: EmptyPayload },
    { type: "ft_made", layer: "scoring", schema: EmptyPayload },
    { type: "fg2_miss", layer: "amateur", schema: EmptyPayload },
    { type: "fg3_miss", layer: "amateur", schema: EmptyPayload },
    { type: "ft_miss", layer: "amateur", schema: EmptyPayload },
    { type: "reb", layer: "amateur", schema: EmptyPayload },
    { type: "ast", layer: "amateur", schema: EmptyPayload },
    { type: "stl", layer: "amateur", schema: EmptyPayload },
    { type: "blk", layer: "amateur", schema: EmptyPayload },
    { type: "tov", layer: "amateur", schema: EmptyPayload },
    { type: "foul", layer: "amateur", schema: EmptyPayload },
  ],
  deriveMatchScore(events: MatchEvent[]): MatchScore {
    let a = 0;
    let b = 0;
    for (const e of activeEvents(events)) {
      let pts = 0;
      if (e.type === "fg2_made") pts = 2;
      else if (e.type === "fg3_made") pts = 3;
      else if (e.type === "ft_made") pts = 1;
      else continue;
      if (e.team_side === "a") a += pts;
      else b += pts;
    }
    return { a, b, complete: true };
  },
  leaderboardMetrics: [
    {
      key: "pts",
      label: "Puntos",
      fromTypes: ["fg2_made", "fg3_made", "ft_made"],
    },
    { key: "reb", label: "Rebotes", fromTypes: ["reb"] },
    { key: "ast", label: "Asistencias", fromTypes: ["ast"] },
    { key: "stl", label: "Robos", fromTypes: ["stl"] },
    { key: "blk", label: "Tapones", fromTypes: ["blk"] },
  ],
};
