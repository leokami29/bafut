import { supabaseUrl } from "@/lib/env";

export const SUBSCRIPTION_PROOFS_BUCKET = "venue-subscription-proofs";

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

/** Ruta: <venue_id>/<uuid>.<ext> */
export function subscriptionProofObjectPath(venueId: string, fileName: string): string {
  const ext =
    fileName.toLowerCase().match(/\.(jpe?g|png|webp|pdf)$/)?.[1] ?? "jpg";
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const normalized = ext === "jpeg" ? "jpg" : ext;
  return `${venueId}/${rand}.${normalized}`;
}

export function validateSubscriptionProofFile(
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

/** Path interno del API de Storage (no es URL pública; el bucket es privado). */
export function subscriptionProofStorageApiPath(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${supabaseUrl().replace(/\/+$/, "")}/storage/v1/object/${SUBSCRIPTION_PROOFS_BUCKET}/${clean}`;
}
