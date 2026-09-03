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
  sport: string;
  format: string | null;
};

export type OccupancyConflict = OccupancyHit & { reason: OccupancyReason };

export type VenueDayOccupancy = {
  match_id: string;
  share_code: string;
  starts_at: string;
  duration_min: number;
  sport: string;
  format: string | null;
  open_slot_count: number;
  has_side_b: boolean;
};

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
