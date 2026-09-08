export type OccupancyReason = "join" | "open_b" | "blocked" | "own";

export type OccupancyBlockKind = "match" | "booking";

export type OccupancyHit = {
  match_id: string | null;
  share_code: string | null;
  host_id: string | null;
  starts_at: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  away_opened_by: string | null;
  open_slot_count: number;
  has_side_b: boolean;
  sport: string;
  format: string | null;
  block_kind: OccupancyBlockKind;
  booking_id: string | null;
};

/** RPC `lookup_venue_occupancy` / `list_venue_day_occupancy` usan `kind` y ponen el id de booking en `match_id`. */
export function occupancyBlockKindFromRpc(
  kind: string | null | undefined,
): OccupancyBlockKind {
  return kind === "booking" ? "booking" : "match";
}

export function mapLookupOccupancyRpcRow(row: {
  kind?: string | null;
  match_id: string | null;
  share_code: string | null;
  host_id: string | null;
  starts_at: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  away_opened_by: string | null;
  open_slot_count: number;
  has_side_b: boolean;
  sport?: string | null;
  format?: string | null;
}): OccupancyHit {
  const block_kind = occupancyBlockKindFromRpc(row.kind);
  const id = row.match_id ?? null;
  return {
    match_id: block_kind === "booking" ? null : id,
    share_code: row.share_code ?? null,
    host_id: row.host_id ?? null,
    starts_at: row.starts_at,
    duration_min: row.duration_min,
    venue_id: row.venue_id,
    venue_name: row.venue_name,
    away_opened_by: row.away_opened_by ?? null,
    open_slot_count: row.open_slot_count,
    has_side_b: row.has_side_b,
    sport: row.sport ?? "futbol",
    format: row.format ?? null,
    block_kind,
    booking_id: block_kind === "booking" ? id : null,
  };
}

export function mapDayOccupancyRpcRow(row: {
  kind?: string | null;
  match_id: string | null;
  share_code: string | null;
  starts_at: string;
  duration_min: number;
  sport?: string | null;
  format?: string | null;
  open_slot_count: number;
  has_side_b: boolean;
}): VenueDayOccupancy {
  const block_kind = occupancyBlockKindFromRpc(row.kind);
  const id = row.match_id ?? null;
  return {
    match_id: block_kind === "booking" ? null : id,
    share_code: row.share_code ?? null,
    starts_at: row.starts_at,
    duration_min: row.duration_min,
    sport: row.sport ?? "futbol",
    format: row.format ?? null,
    open_slot_count: row.open_slot_count,
    has_side_b: row.has_side_b,
    block_kind,
    booking_id: block_kind === "booking" ? id : null,
  };
}

export type OccupancyConflict = OccupancyHit & { reason: OccupancyReason };

export type VenueDayOccupancy = {
  match_id: string | null;
  share_code: string | null;
  starts_at: string;
  duration_min: number;
  sport: string;
  format: string | null;
  open_slot_count: number;
  has_side_b: boolean;
  block_kind: OccupancyBlockKind;
  booking_id: string | null;
};

export function occupancyReason(userId: string | null | undefined, hit: OccupancyHit): OccupancyReason {
  if (hit.block_kind === "booking") return "blocked";
  if (userId && hit.host_id === userId) return "own";
  if (hit.open_slot_count > 0) return "join";
  if (!hit.has_side_b) return "open_b";
  return "blocked";
}

export function occupancyUserMessage(conflict: OccupancyConflict) {
  const venue = conflict.venue_name || "esa cancha";
  if (conflict.block_kind === "booking") {
    return `Hay una reserva en ${venue} a esa hora. Elegí otra franja.`;
  }
  switch (conflict.reason) {
    case "own":
      return `Ya publicaste a esa hora en ${venue}. Editá o compartí el link; no lo publiques de nuevo.`;
    case "join":
      return `Ya hay pateada en ${venue}. Faltan ${conflict.open_slot_count}: ¿vas con ellos o en contra?`;
    case "open_b":
      return `Ya hay pateada en ${venue}. Ese equipo está armado: podés armar el rival en la misma cancha y hora.`;
    default:
      return `Ya hay pateada completa en ${venue} a esa hora. Elegí otra hora.`;
  }
}

/** Traduce errores de RPC / DB a una frase humana (sin jerga lado A/B). */
export function humanizeSideBError(raw: string | undefined | null) {
  const msg = (raw ?? "").trim();
  if (!msg) return "No se pudo armar el rival. Probá de nuevo.";
  const lower = msg.toLowerCase();

  if (lower.includes("admite 1 o 2") || lower.includes("1 o 2 cupos")) {
    return "Pedí 1 o 2 cupos para el otro equipo.";
  }
  if (lower.includes("equipo en contra") || lower.includes("faltan de tu grupo") || lower.includes("host")) {
    return "Vos armaste esta pateada. Si falta gente de tu grupo, pedí cupo arriba — no armes el rival.";
  }
  if (lower.includes("ya está abierto") || lower.includes("ya esta abierto")) {
    return "El otro equipo ya se armó. Pedí un cupo ahí.";
  }
  if (lower.includes("máximo") || lower.includes("maximo")) {
    return "El rival ya tiene los cupos que admite.";
  }
  if (lower.includes("no se puede abrir") || lower.includes("así") || lower.includes("asi")) {
    return "No se pudo armar el rival con esa acción.";
  }
  if (lower.includes("lado b") || lower.includes("otro lado")) {
    return "No se pudo armar el rival. Probá de nuevo o pedí cupo en el equipo que ya está.";
  }
  return msg;
}

export function parseOccupancyShareCode(message: string | undefined) {
  const match = /^OCCUPANCY:([a-f0-9]{8})$/i.exec(message?.trim() ?? "");
  return match?.[1]?.toLowerCase() ?? null;
}
