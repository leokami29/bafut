import type { z } from "zod";
import type { TournamentSport } from "@/lib/tournaments/authz";

export type SportId = TournamentSport;

export type TeamSide = "a" | "b";

export type EventLayer = "scoring" | "amateur";

export type BracketScoreKind = "goals" | "points" | "sets";

/** Evento tipado de acta (capa de dominio; sin dependencia de DB). */
export type MatchEvent = {
  sport?: SportId;
  team_side: TeamSide;
  player_id?: string | null;
  type: string;
  period?: number | null;
  clock?: number | string | null;
  payload?: unknown;
  /** Eventos anulados no cuentan para score ni validación de acta activa. */
  voided_at?: string | null;
};

export type MatchScore = {
  a: number;
  b: number;
  /** true cuando el partido ya tiene ganador según reglas del catálogo (best-of, etc.). */
  complete: boolean;
};

export type SportEventTypeDef = {
  type: string;
  layer: EventLayer;
  schema: z.ZodType;
};

export type LeaderboardMetric = {
  key: string;
  label: string;
  fromTypes: string[];
};

export type SportCatalog = {
  id: SportId;
  teamSize: { min: number; max: number };
  bracketScoreKind: BracketScoreKind;
  /** Best-of para sets (vóley/pádel). Ignorado si bracketScoreKind !== "sets". */
  bestOf?: 3 | 5;
  eventTypes: SportEventTypeDef[];
  deriveMatchScore(events: MatchEvent[]): MatchScore;
  leaderboardMetrics: LeaderboardMetric[];
};

export type AssertEventAllowedResult =
  | { ok: true; payload: unknown }
  | { ok: false; error: string };
