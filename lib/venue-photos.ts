import { supabaseUrl } from "@/lib/env";

export const VENUE_PHOTOS_BUCKET = "venue-photos";

/** Espejo del trigger `private.enforce_venue_photo_limits` (máx. fotos por cancha). */
export const MAX_VENUE_PHOTOS = 12;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Ruta de objeto esperada: <venue_id>/<uuid>.<ext> */
export function venuePhotoObjectPath(venueId: string, fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1] ?? "jpg";
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${venueId}/${rand}.${ext === "jpeg" ? "jpg" : ext}`;
}

/** URL pública del bucket público venue-photos (sin depender de crear links firmados). */
export function venuePhotoPublicUrl(path: string): string {
  const clean = path.replace(/^\/+/, "");
  return `${supabaseUrl().replace(/\/+$/, "")}/storage/v1/object/public/${VENUE_PHOTOS_BUCKET}/${clean}`;
}

export function validateVenuePhotoFile(file: File): { error: string } | { ok: true } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Solo imágenes JPG, PNG o WEBP." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "La foto pesa más de 5 MB. Bajale la calidad y probá de nuevo." };
  }
  return { ok: true };
}

/** Validación previa al upload: MIME/tamaño + cap por venue. */
export function validateVenuePhotoUpload(
  file: File,
  currentCount: number,
): { error: string } | { ok: true } {
  if (currentCount >= MAX_VENUE_PHOTOS) {
    return { error: `Esta cancha ya tiene el máximo de ${MAX_VENUE_PHOTOS} fotos.` };
  }
  return validateVenuePhotoFile(file);
}
