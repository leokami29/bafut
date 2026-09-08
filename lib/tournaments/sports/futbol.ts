import { z } from "zod";
import { activeEvents, oppositeSide } from "./helpers";
import type { MatchEvent, MatchScore, SportCatalog } from "./types";

const EmptyPayload = z.record(z.string(), z.unknown()).optional().default({});

const AssistPayload = z
  .object({
    /** Id del evento `goal` asistido (opcional). */
    goal_event_id: z.string().uuid().optional(),
    /** Jugador que recibió la asistencia / marcó (opcional). */
    to_player_id: z.string().uuid().optional(),
  })
  .strict();

/**
 * Fútbol 5/7/8 — BM: goles enteros A–B.
 * own_goal del lado X suma para el rival.
 */
export const futbolCatalog: SportCatalog = {
  id: "futbol",
  teamSize: { min: 5, max: 8 },
  bracketScoreKind: "goals",
  eventTypes: [
    { type: "goal", layer: "scoring", schema: EmptyPayload },
    { type: "own_goal", layer: "scoring", schema: EmptyPayload },
    { type: "yellow_card", layer: "amateur", schema: EmptyPayload },
    { type: "red_card", layer: "amateur", schema: EmptyPayload },
    { type: "assist", layer: "amateur", schema: AssistPayload },
  ],
  deriveMatchScore(events: MatchEvent[]): MatchScore {
    let a = 0;
    let b = 0;
    for (const e of activeEvents(events)) {
      if (e.type === "goal") {
        if (e.team_side === "a") a += 1;
        else b += 1;
      } else if (e.type === "own_goal") {
        const credited = oppositeSide(e.team_side);
        if (credited === "a") a += 1;
        else b += 1;
      }
    }
    return { a, b, complete: true };
  },
  leaderboardMetrics: [
    { key: "goals", label: "Goleadores", fromTypes: ["goal"] },
    { key: "assists", label: "Asistencias", fromTypes: ["assist"] },
    {
      key: "cards",
      label: "Amonestados",
      fromTypes: ["yellow_card", "red_card"],
    },
  ],
};
