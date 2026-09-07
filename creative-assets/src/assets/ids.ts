import { createHash } from "node:crypto";

/**
 * Asset ID: identificador interno ESTABLE y determinista.
 *
 * id = "asset_" + primeros 16 hex de sha256(`provider:providerAssetId`)
 * (fallback: `provider:url` si el proveedor no expone un id numérico, p. ej. generación IA).
 *
 * Propiedades:
 * - La misma imagen del mismo proveedor SIEMPRE produce el mismo id → dedupe natural.
 * - No depende del filename ni del contenido (el contenido tiene su propio sha256).
 * - Relación trazable: ImageSearchResult → ImageCandidate → Asset → AssetMetadata
 *   comparten este id a través de `result.id` (p. ej. "pexels-123") y providerAssetId.
 */
export function computeAssetId(input: {
  provider: string;
  providerAssetId?: string;
  originalUrl?: string;
}): string {
  const basis = input.providerAssetId
    ? `${input.provider}:${input.providerAssetId}`
    : `${input.provider}:${input.originalUrl ?? ""}`;
  const hash = createHash("sha256").update(basis).digest("hex").slice(0, 16);
  return `asset_${hash}`;
}

/** Extrae el providerAssetId de un id de resultado de búsqueda ("pexels-123456"). */
export function splitResultId(resultId: string): { provider: string; providerAssetId: string } | null {
  const match = /^([a-z0-9]+)-(.+)$/i.exec(resultId.trim());
  if (!match) return null;
  return { provider: match[1].toLowerCase(), providerAssetId: match[2] };
}
