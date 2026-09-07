import { ImageSearchResult } from "../providers/types";

/**
 * Contratos de assets: descarga → validación → storage → metadata.
 * SEARCH ≠ DOWNLOAD: AssetService consume ImageSearchResult ya normalizado.
 */

import { ProcessingOperationRecord } from "./processing/types";

/** Estados con utilidad real hoy. Fase 4 añade derivados; fase 5 selected/used/archived. */
export type AssetStatus = "downloaded" | "validated" | "ready" | "failed";

export interface AssetAuthor {
  name?: string;
  url?: string;
}

/** Metadata persistida por asset. Fuente de verdad lógica (independiente del storage). */
export interface AssetMetadata {
  id: string;
  provider: string;
  providerAssetId?: string;
  originalFilename?: string;
  storedFilename: string;
  /** Ruta relativa a creative-assets/ (portable entre máquinas/deploys). */
  path: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  sha256: string;
  sourceUrl?: string;
  originalUrl?: string;
  previewUrl?: string;
  author?: AssetAuthor;
  license?: string;
  tags?: string[];
  downloadedAt: string;
  status: AssetStatus;
  campaignId?: string;
  brandId?: string;
  /** Para assets derivados: id del asset original del que procede. */
  parentAssetId?: string;
  hasTransparency?: boolean;
  processing?: {
    /** Evolución compatible Fase 4: registros estructurados (antes: string[]). */
    operations: ProcessingOperationRecord[];
  };
}

export interface DownloadAssetResult {
  asset: AssetMetadata;
  downloaded: boolean;
  duplicate: boolean;
  path: string;
}

export interface DownloadOptions {
  campaignId?: string;
  brandId?: string;
  tags?: string[];
  /** Sobrescribe límites del downloader para esta descarga. */
  maxBytes?: number;
}

export type AssetErrorCode =
  | "empty_url"
  | "invalid_url"
  | "unsupported_scheme"
  | "invalid_content_type"
  | "empty_file"
  | "file_too_large"
  | "not_an_image"
  | "unsupported_format"
  | "http_error"
  | "timeout"
  | "network"
  | "storage_error"
  | "metadata_error"
  | "not_found";

/** Error claro y tipado para toda la capa de assets. */
export class AssetError extends Error {
  code: AssetErrorCode;
  httpStatus?: number;

  constructor(code: AssetErrorCode, message: string, httpStatus?: number) {
    super(`[asset] ${code}: ${message}`);
    this.name = "AssetError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

/** Convierte un ImageSearchResult normalizado en los datos mínimos de descarga. */
export function sourceInfoFromResult(result: ImageSearchResult) {
  return {
    provider: result.provider,
    providerAssetId: result.metadata && typeof result.metadata.pexels_id === "number"
      ? String(result.metadata.pexels_id)
      : undefined,
    originalUrl: result.originalUrl,
    sourceUrl: result.sourceUrl,
    previewUrl: result.previewUrl,
    author: result.author,
    license: result.license,
    title: result.title,
    width: result.width,
    height: result.height,
  };
}
