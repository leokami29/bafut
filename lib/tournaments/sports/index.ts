import type { TournamentSport } from "@/lib/tournaments/authz";
import { basquetCatalog } from "./basquet";
import { futbolCatalog } from "./futbol";
import { padelCatalog } from "./padel";
import { voleibolCatalog } from "./voleibol";
import type {
  AssertEventAllowedResult,
  MatchEvent,
  MatchScore,
  SportCatalog,
  SportId,
} from "./types";

export type {
  AssertEventAllowedResult,
  BracketScoreKind,
  EventLayer,
  LeaderboardMetric,
  MatchEvent,
  MatchScore,
  SportCatalog,
  SportEventTypeDef,
  SportId,
  TeamSide,
} from "./types";

export { futbolCatalog } from "./futbol";
export { voleibolCatalog } from "./voleibol";
export { basquetCatalog } from "./basquet";
export { padelCatalog } from "./padel";

export const SPORT_CATALOGS: Record<SportId, SportCatalog> = {
  futbol: futbolCatalog,
  voleibol: voleibolCatalog,
  basquet: basquetCatalog,
  padel: padelCatalog,
};

export function isSportId(value: string): value is SportId {
  return value in SPORT_CATALOGS;
}

export function getSportCatalog(sport: SportId | TournamentSport): SportCatalog {
  const catalog = SPORT_CATALOGS[sport];
  if (!catalog) {
    throw new Error(`Catálogo de deporte desconocido: ${sport}`);
  }
  return catalog;
}

/**
 * Valida que `type` esté en la whitelist del deporte (scoring|amateur)
 * y que `payload` cumpla el schema Zod del tipo.
 */
export function assertEventAllowed(
  sport: SportId,
  type: string,
  payload: unknown = {},
): AssertEventAllowedResult {
  const catalog = getSportCatalog(sport);
  const def = catalog.eventTypes.find((e) => e.type === type);
  if (!def) {
    return {
      ok: false,
      error: `Evento "${type}" no permitido para ${sport}`,
    };
  }
  const parsed = def.schema.safeParse(payload ?? {});
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      error: `Payload inválido para ${sport}/${type}: ${detail}`,
    };
  }
  return { ok: true, payload: parsed.data };
}

/** Atajo: derive score usando el catálogo del deporte. */
export function deriveMatchScore(sport: SportId, events: MatchEvent[]): MatchScore {
  return getSportCatalog(sport).deriveMatchScore(events);
}

/** Tipos de evento de una capa (o todas si no se pasa layer). */
export function eventTypesFor(
  sport: SportId,
  layer?: "scoring" | "amateur",
): string[] {
  const catalog = getSportCatalog(sport);
  return catalog.eventTypes
    .filter((e) => (layer ? e.layer === layer : true))
    .map((e) => e.type);
}
