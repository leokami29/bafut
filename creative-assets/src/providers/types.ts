/**
 * Contratos del sistema de búsqueda de imágenes.
 * SEARCH ≠ DOWNLOAD: esta capa solo devuelve información estructurada.
 */

export type Orientation = "landscape" | "portrait" | "square";
export type ImageSize = "large" | "medium" | "small";

export interface SearchImagesOptions {
  query: string;
  page?: number;
  /** Número de resultados (el proveedor puede limitar el máximo). */
  limit?: number;
  orientation?: Orientation;
  size?: ImageSize;
  /** Nombre de color del proveedor o código hex (según soporte). */
  color?: string;
}

export interface ImageAuthor {
  name?: string;
  url?: string;
}

export interface ImageSearchResult {
  id: string;
  provider: string;
  title?: string;
  description?: string;
  thumbnailUrl: string;
  previewUrl: string;
  originalUrl: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  author?: ImageAuthor;
  /** Página humana del asset en el proveedor. */
  sourceUrl?: string;
  license?: string;
  tags?: string[];
  /** Datos crudos relevantes del proveedor, para depuración/decisiones. */
  metadata?: Record<string, unknown>;
}

/**
 * Envoltura para evaluación/selección por parte del agente (IA en fase 3).
 * La arquitectura ya soporta score/selección sin implementar el scoring.
 */
export interface ImageCandidate {
  result: ImageSearchResult;
  score?: number;
  selected?: boolean;
  rejectionReason?: string;
  status?: "pending" | "selected" | "rejected";
}

/** Interfaz que todo proveedor debe implementar. */
export interface ImageProvider {
  /** Identificador único y estable ("pexels", "unsplash", ...). */
  readonly id: string;
  /** Busca y devuelve resultados NORMALIZADOS. Nunca descarga archivos. */
  search(options: SearchImagesOptions): Promise<ImageSearchResult[]>;
}

/** Cache de resultados de búsqueda (fase 3: FileCache; hoy NoopCache). */
export interface SearchCache {
  get<T>(key: string): Promise<T | undefined> | T | undefined;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void> | void;
}

export type ProviderErrorCode =
  | "missing_api_key"
  | "invalid_api_key"
  | "rate_limit"
  | "timeout"
  | "network"
  | "empty_query"
  | "invalid_response"
  | "provider_error"
  | "not_implemented";

/** Error claro y tipado, apto para consumo por un agente. */
export class ProviderError extends Error {
  code: ProviderErrorCode;
  providerId: string;
  httpStatus?: number;

  constructor(code: ProviderErrorCode, providerId: string, message: string, httpStatus?: number) {
    super(`[${providerId}] ${code}: ${message}`);
    this.name = "ProviderError";
    this.code = code;
    this.providerId = providerId;
    this.httpStatus = httpStatus;
  }
}

export function assertValidQuery(options: SearchImagesOptions): void {
  if (!options || typeof options.query !== "string" || options.query.trim().length === 0) {
    throw new ProviderError("empty_query", "search", "La query de búsqueda está vacía. Envía texto no vacío.");
  }
}
