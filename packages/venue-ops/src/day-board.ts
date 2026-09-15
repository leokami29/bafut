import type { AdminDayBlock, AdminOccupancyKind, BookingSource, VenueDayOccupancy } from "./types";
import { adminOccupancyKindLabel, toAdminOccupancyKind } from "./occupancy";

/** Cliente mínimo compatible con supabase.rpc. */
export type VenueOpsRpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type BookingEnrichment = {
  id: string;
  status: string;
  source: string | null;
  hold_expires_at: string | null;
  contact_whatsapp?: string | null;
  note?: string | null;
};

export type LoadVenueDayOccupancyResult = {
  blocks: AdminDayBlock[];
  raw: VenueDayOccupancy[];
};

/**
 * Carga ocupación del día (RPC) y enriquece bookings con status/source
 * cuando el caller pasa filas de venue_bookings del mismo rango.
 */
export function buildAdminDayBlocks(
  dayRows: VenueDayOccupancy[],
  bookingsById: Map<string, BookingEnrichment>,
  opts?: { turnosBasePath?: string },
): AdminDayBlock[] {
  const base = opts?.turnosBasePath;
  return dayRows.map((row) => {
    const enrichment =
      row.block_kind === "booking" && row.booking_id
        ? bookingsById.get(row.booking_id)
        : undefined;
    const kind: AdminOccupancyKind = toAdminOccupancyKind({
      blockKind: row.block_kind,
      bookingStatus: enrichment?.status,
      bookingSource: enrichment?.source,
    });
    const id =
      row.block_kind === "booking"
        ? (row.booking_id ?? "booking")
        : (row.match_id ?? "match");
    const label =
      kind === "match"
        ? `Hueco · ${row.sport}`
        : kind === "block"
          ? enrichment?.note?.trim() || "Bloqueo"
          : `${adminOccupancyKindLabel(kind)} · ${row.sport}`;
    const href =
      row.block_kind === "booking" && row.booking_id && base
        ? `${base}#booking-${row.booking_id}`
        : undefined;
    return {
      id,
      kind,
      startsAt: row.starts_at,
      durationMin: row.duration_min,
      sport: row.sport,
      label,
      href,
      holdExpiresAt: enrichment?.hold_expires_at ?? null,
      source: (enrichment?.source as BookingSource | undefined) ?? undefined,
    };
  });
}

export { mapDayOccupancyRpcRow } from "./occupancy";
