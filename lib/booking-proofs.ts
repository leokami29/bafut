import { supabaseUrl } from "@/lib/env";
import { isUuid } from "@/lib/ids";
import { cleanStorageObjectPath, isSafeStorageObjectPath } from "@/lib/storage-path";

export const BOOKING_PROOFS_BUCKET = "venue-booking-proofs";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Ruta: <venue_id>/<user_id>/<uuid>.<ext> (RLS: folder[1]=venue_id, folder[2]=auth.uid). */
export function bookingProofObjectPath(
  venueId: string,
  userId: string,
  fileName: string,
): string {
  const ext =
    fileName.toLowerCase().match(/\.(jpe?g|png|webp|pdf)$/)?.[1] ?? "jpg";
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const normalized = ext === "jpeg" ? "jpg" : ext;
  return `${venueId}/${userId}/${rand}.${normalized}`;
}

/**
 * Espejo del check RPC: path bajo venueId/userId/, sin `..`.
 * Acepta paths ya subidos por el mismo jugador (reuso de comprobante).
 */
export function isBookingProofPathOwned(
  path: string,
  venueId: string,
  userId: string,
): boolean {
  if (!isUuid(venueId) || !isUuid(userId)) return false;
  const clean = cleanStorageObjectPath(path);
  if (!clean) return false;
  const prefix = `${venueId}/${userId}/`;
  if (!clean.startsWith(prefix)) return false;
  const rest = clean.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && /\.(jpe?g|png|webp|pdf)$/i.test(rest);
}

export function validateBookingProofFile(
  file: File,
): { error: string } | { ok: true } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Solo imágenes JPG/PNG/WEBP o PDF de hasta 5 MB." };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { error: "El comprobante pesa más de 5 MB. Comprimilo y probá de nuevo." };
  }
  return { ok: true };
}

/** Path interno del API de Storage (bucket privado). */
export function bookingProofStorageApiPath(path: string): string {
  const clean = cleanStorageObjectPath(path);
  if (!clean || !isSafeStorageObjectPath(clean)) {
    throw new Error("Ruta de comprobante no válida.");
  }
  return `${supabaseUrl().replace(/\/+$/, "")}/storage/v1/object/${BOOKING_PROOFS_BUCKET}/${clean}`;
}
