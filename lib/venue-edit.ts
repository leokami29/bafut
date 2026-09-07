import { SPORTS, type Sport } from "@/lib/sport-rules";

export const SURFACE_OPTIONS = [
  { value: "sintetica", label: "Sintética" },
  { value: "grama", label: "Grama" },
  { value: "dura", label: "Piso duro" },
  { value: "cemento", label: "Cemento" },
] as const;

export const KIND_OPTIONS = [
  { value: "alquiler", label: "Alquiler" },
  { value: "publica", label: "Pública" },
  { value: "club", label: "Club" },
] as const;

export type SurfaceValue = (typeof SURFACE_OPTIONS)[number]["value"];
export type KindValue = (typeof KIND_OPTIONS)[number]["value"];

const PHONE_RE = /^\+?[0-9 ()-]{7,20}$/;
const WEBSITE_RE = /^https?:\/\/.+\..+/i;
const NOTE_MAX = 500;
const NAME_MIN = 2;
const NAME_MAX = 120;

export type VenueEditableFields = {
  name: string;
  neighborhood: string;
  address: string;
  phone: string;
  website: string;
  notes: string;
  lat: number | null;
  lng: number | null;
};

/** Espejo client de las validaciones de update_venue/create_venue (la DB manda igual). */
export function validateVenueFields(
  fields: Partial<VenueEditableFields> & { sports?: string[] },
): { error: string } | { ok: true } {
  if (fields.name !== undefined) {
    const name = fields.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return { error: `El nombre debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.` };
    }
  }

  if (fields.phone?.trim() && !PHONE_RE.test(fields.phone.trim())) {
    return { error: "Ese teléfono no parece válido (números, espacios o +)." };
  }

  if (fields.website?.trim() && !WEBSITE_RE.test(fields.website.trim())) {
    return { error: "El sitio web debe empezar con http:// o https://." };
  }

  if (fields.notes && fields.notes.trim().length > NOTE_MAX) {
    return { error: `La nota es demasiado larga (máx. ${NOTE_MAX} caracteres).` };
  }

  if (fields.sports !== undefined) {
    if (fields.sports.length === 0) {
      return { error: "Marcá al menos un deporte." };
    }
    if (fields.sports.some((s) => !SPORTS.includes(s as Sport))) {
      return { error: "Uno o más deportes no son válidos." };
    }
  }

  const lat = fields.lat;
  const lng = fields.lng;
  if (lat != null && (Number.isNaN(lat) || lat < -90 || lat > 90)) {
    return { error: "Latitud fuera de rango (-90 a 90)." };
  }
  if (lng != null && (Number.isNaN(lng) || lng < -180 || lng > 180)) {
    return { error: "Longitud fuera de rango (-180 a 180)." };
  }

  return { ok: true };
}

/**
 * Diff contra los valores originales: solo se mandan campos cambiados.
 * '' significa "limpiar" (el RPC lo trata así); sin cambio → undefined (no tocar).
 */
export function diffVenueFields(
  original: VenueEditableFields,
  next: VenueEditableFields,
): Partial<VenueEditableFields> {
  const out: Partial<VenueEditableFields> = {};
  for (const key of Object.keys(original) as (keyof VenueEditableFields)[]) {
    const a = original[key];
    const b = next[key];
    if (typeof a === "string" && typeof b === "string") {
      if (a.trim() !== b.trim()) out[key] = b.trim() as never;
    } else if (a !== b) {
      (out as Record<string, unknown>)[key] = b;
    }
  }
  return out;
}

export function parseCoordinate(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Acepta el par que Google Maps copia al portapapeles:
 * "10.96854, -74.78132" o "10.96854 -74.78132". Devuelve null si no son
 * dos números en rango.
 */
export function parsePastedCoords(
  raw: string,
): { lat: number; lng: number } | null {
  const parts = raw.trim().split(/[,;\s]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const lat = parseCoordinate(parts[0]);
  const lng = parseCoordinate(parts[1]);
  if (lat == null || lng == null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}
