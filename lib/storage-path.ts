/**
 * Validación defensiva de object keys de Supabase Storage.
 * No sustituye RLS ni checks del RPC: evita `..`, absolutos y basura.
 */

const DEFAULT_MAX_LEN = 400;

export function isSafeStorageObjectPath(
  path: string,
  maxLen = DEFAULT_MAX_LEN,
): boolean {
  if (!path || path.length < 8 || path.length > maxLen) return false;
  if (path.startsWith("/") || path.startsWith("\\")) return false;
  if (path.includes("..") || path.includes("\\") || path.includes("\0")) return false;
  if (path.includes("//")) return false;
  // Solo segmentos relativos tipados (uuid/archivo.ext, etc.)
  if (!/^[a-zA-Z0-9._/-]+$/.test(path)) return false;
  return true;
}

/** Quita slashes iniciales; devuelve null si el path no es seguro. */
export function cleanStorageObjectPath(
  path: string,
  maxLen = DEFAULT_MAX_LEN,
): string | null {
  const clean = path.replace(/^\/+/, "").trim();
  return isSafeStorageObjectPath(clean, maxLen) ? clean : null;
}
