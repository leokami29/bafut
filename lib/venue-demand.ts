import { isSameCityDay } from "@/lib/datetime";
import { openSlotCount, type MatchDetail } from "@/lib/types";

export type VenueDemand = {
  matchCount: number;
  openSlots: number;
  todayCount: number;
};

/** Agrega partidos abiertos próximos por venue_id (filtro en app, sin RPC nueva). */
export function aggregateVenueDemand(
  matches: MatchDetail[],
  timezone: string,
): Record<string, VenueDemand> {
  const out: Record<string, VenueDemand> = {};
  for (const match of matches) {
    const current = out[match.venue_id] ?? { matchCount: 0, openSlots: 0, todayCount: 0 };
    current.matchCount += 1;
    current.openSlots += openSlotCount(match);
    if (isSameCityDay(match.starts_at, timezone)) {
      current.todayCount += 1;
    }
    out[match.venue_id] = current;
  }
  return out;
}

/**
 * Línea compacta para el directorio. Null si no hay actividad (sin “0” falso).
 * Hoy cuando toda o la mayoría es hoy; si no, próximos/huecos honestos.
 */
export function venueDemandLabel(demand: VenueDemand): string | null {
  const { matchCount, openSlots, todayCount } = demand;
  if (matchCount <= 0) return null;

  const mostlyToday = todayCount > 0 && todayCount * 2 > matchCount;
  const cupos =
    openSlots > 0 ? `${openSlots} ${openSlots === 1 ? "cupo" : "cupos"}` : null;

  if (mostlyToday) {
    const huecos =
      matchCount === 1 ? "1 hueco hoy" : `${matchCount} huecos hoy`;
    return cupos ? `${huecos} · ${cupos}` : huecos;
  }

  const proximos = matchCount === 1 ? "1 próximo" : `${matchCount} próximos`;
  return cupos ? `${proximos} · ${cupos}` : proximos;
}

export function venueDemandScore(demand: VenueDemand | undefined): number {
  if (!demand) return 0;
  return demand.todayCount * 2 + demand.matchCount;
}

export function venuesWithDemandCount(demandByVenueId: Record<string, VenueDemand>): number {
  return Object.values(demandByVenueId).filter((d) => d.matchCount > 0).length;
}
