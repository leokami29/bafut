import { supabaseUrl } from "@/lib/env";
import { isUuid } from "@/lib/ids";
import { cleanStorageObjectPath } from "@/lib/storage-path";

export const PROFILE_AVATARS_BUCKET = "profile-avatars";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function profileAvatarObjectPath(userId: string, fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1] ?? "jpg";
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${userId}/${rand}.${ext === "jpeg" ? "jpg" : ext}`;
}

export function isProfileAvatarPathForUser(path: string, userId: string): boolean {
  if (!isUuid(userId)) return false;
  const clean = cleanStorageObjectPath(path);
  if (!clean) return false;
  const prefix = `${userId}/`;
  if (!clean.startsWith(prefix)) return false;
  const rest = clean.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && /\.(jpe?g|png|webp)$/i.test(rest);
}

export function profileAvatarPublicUrl(path: string): string {
  const clean = cleanStorageObjectPath(path);
  if (!clean) {
    return `${supabaseUrl().replace(/\/+$/, "")}/storage/v1/object/public/${PROFILE_AVATARS_BUCKET}/invalid`;
  }
  return `${supabaseUrl().replace(/\/+$/, "")}/storage/v1/object/public/${PROFILE_AVATARS_BUCKET}/${clean}`;
}

export function validateProfileAvatarFile(file: File): { error: string } | { ok: true } {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Solo imágenes JPG, PNG o WEBP." };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "La foto pesa más de 5 MB. Bajale la calidad y probá de nuevo." };
  }
  return { ok: true };
}
