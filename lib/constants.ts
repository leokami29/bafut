export const CITY_COOKIE = "bafut_city";
/** Destino post-callback de Auth (confirmación / recuperación); evita ?next= en emailRedirectTo. */
export const AUTH_NEXT_COOKIE = "bafut_auth_next";
export const DEFAULT_CITY_SLUG = "barranquilla";

export {
  DURATIONS,
  FORMATS,
  POSITIONS,
  SPORTS,
  type DurationMin,
  type Format,
  type Position,
  type Sport,
} from "@/lib/sport-rules";

export const LEVELS = ["any", "low", "mid", "high"] as const;
export const GENDERS = ["mixed", "men", "women"] as const;

export type Level = (typeof LEVELS)[number];
export type GenderPolicy = (typeof GENDERS)[number];

export const MATCH_MODES = ["pickup", "challenge"] as const;
export type MatchMode = (typeof MATCH_MODES)[number];

export const SLOT_ROLES = ["starter", "bench"] as const;
export type SlotRole = (typeof SLOT_ROLES)[number];

export const ROTATION_RULES = [
  "Rotación activa continua",
  "Cambios cada 15 min",
  "Por cansancio / lesión",
  "Acordado en cancha",
] as const;
