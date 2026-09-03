export type OccupancyReason = "join" | "open_b" | "blocked" | "own";

export type OccupancyHit = {
  match_id: string;
  share_code: string;
  host_id: string;
  starts_at: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  away_opened_by: string | null;
  open_slot_count: number;
  has_side_b: boolean;
};

export type OccupancyConflict = OccupancyHit & { reason: OccupancyReason };

export function occupancyReason(userId: string | null | undefined, hit: OccupancyHit): OccupancyReason {
  if (userId && hit.host_id === userId) return "own";
  if (hit.open_slot_count > 0) return "join";
  if (!hit.has_side_b) return "open_b";
  return "blocked";
}

export function occupancyUserMessage(conflict: OccupancyConflict) {
  const venue = conflict.venue_name || "esa cancha";
  switch (conflict.reason) {
    case "own":
      return `Ya publicaste una pateada a esa hora en ${venue}. Editá o compartí el link, no publiques de nuevo.`;
    case "join":
      return `Ya hay pateada en ${venue}. Faltan ${conflict.open_slot_count}. Uníte a los cupos libres.`;
    case "open_b":
      return `Ya hay pateada en ${venue}. El otro lado (equipo en contra) todavía se puede abrir.`;
    default:
      return `Ya hay pateada completa en ${venue} a esa hora. No se puede publicar encima.`;
  }
}

export function parseOccupancyShareCode(message: string | undefined) {
  const match = /^OCCUPANCY:([a-f0-9]{8})$/i.exec(message?.trim() ?? "");
  return match?.[1]?.toLowerCase() ?? null;
}
