import {
  ImageProvider,
  ImageSearchResult,
  ProviderError,
  SearchImagesOptions,
  assertValidQuery,
} from "./types";

/**
 * Proveedor Pexels (API oficial v1).
 * Docs: https://www.pexels.com/api/documentation/
 * La API key SIEMPRE por variable de entorno PEXELS_API_KEY.
 */

const API_BASE = "https://api.pexels.com/v1";
export const PEXELS_MAX_PER_PAGE = 80;
export const PEXELS_LICENSE = "Pexels License (uso gratuito, sin atribución obligatoria)";

type FetchLike = typeof fetch;

/** Subconjunto tipado de la respuesta de Pexels que usamos. */
interface PexelsPhotoSrc {
  original?: string;
  large2x?: string;
  large?: string;
  medium?: string;
  small?: string;
  tiny?: string;
}

interface PexelsPhoto {
  id?: number;
  width?: number;
  height?: number;
  url?: string;
  photographer?: string;
  photographer_url?: string;
  photographer_id?: number;
  avg_color?: string;
  liked?: boolean;
  alt?: string;
  src?: PexelsPhotoSrc;
}

interface PexelsSearchResponse {
  page?: number;
  per_page?: number;
  total_results?: number;
  next_page?: string;
  photos?: PexelsPhoto[];
}

export class PexelsProvider implements ImageProvider {
  readonly id = "pexels";
  private apiKey: string | undefined;
  private fetcher: FetchLike;
  private timeoutMs: number;

  constructor(opts: { apiKey?: string; fetcher?: FetchLike; timeoutMs?: number } = {}) {
    this.apiKey = opts.apiKey ?? process.env.PEXELS_API_KEY;
    this.fetcher = opts.fetcher ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
  }

  async search(options: SearchImagesOptions): Promise<ImageSearchResult[]> {
    assertValidQuery(options);
    if (!this.apiKey) {
      throw new ProviderError(
        "missing_api_key",
        this.id,
        "PEXELS_API_KEY is not configured. Añádela a .env.local (no se commitea) y vuelve a intentar.",
      );
    }

    const params = new URLSearchParams();
    params.set("query", options.query.trim());
    params.set("per_page", String(Math.min(options.limit ?? 10, PEXELS_MAX_PER_PAGE)));
    params.set("page", String(Math.max(options.page ?? 1, 1)));
    if (options.orientation) params.set("orientation", options.orientation);
    if (options.size) params.set("size", options.size);
    if (options.color) params.set("color", options.color);

    const url = `${API_BASE}/search?${params.toString()}`;
    const json = await this.request<PexelsSearchResponse>(url);

    if (!json || !Array.isArray(json.photos)) {
      throw new ProviderError(
        "invalid_response",
        this.id,
        "La respuesta de Pexels no contiene el campo 'photos'.",
      );
    }

    return json.photos.map((photo) => this.normalize(photo)).filter((r): r is ImageSearchResult => r !== null);
  }

  private normalize(photo: PexelsPhoto): ImageSearchResult | null {
    if (!photo.id || !photo.src) return null;
    const src = photo.src;
    const thumbnailUrl = src.tiny ?? src.small ?? src.medium ?? src.large ?? src.original ?? "";
    const previewUrl = src.large ?? src.large2x ?? src.medium ?? src.original ?? "";
    const originalUrl = src.original ?? "";
    if (!thumbnailUrl || !originalUrl) return null;

    const width = photo.width;
    const height = photo.height;
    const aspectRatio =
      typeof width === "number" && typeof height === "number" && height > 0
        ? Math.round((width / height) * 100) / 100
        : undefined;

    return {
      id: `pexels-${photo.id}`,
      provider: this.id,
      title: photo.alt || undefined,
      thumbnailUrl,
      previewUrl,
      originalUrl,
      width,
      height,
      aspectRatio,
      author: {
        name: photo.photographer,
        url: photo.photographer_url,
      },
      sourceUrl: photo.url,
      license: PEXELS_LICENSE,
      metadata: {
        pexels_id: photo.id,
        avg_color: photo.avg_color,
        alt: photo.alt,
        photographer_id: photo.photographer_id,
        liked: photo.liked,
        large2x_url: src.large2x,
        medium_url: src.medium,
        small_url: src.small,
      },
    };
  }

  private async request<T>(url: string): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        headers: { Authorization: this.apiKey as string },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new ProviderError("timeout", this.id, `La petición a Pexels excedió ${this.timeoutMs}ms.`);
      }
      const cause = err instanceof Error ? err.message : String(err);
      throw new ProviderError("network", this.id, `Fallo de red al contactar Pexels: ${cause}`);
    }

    if (response.status === 401) {
      throw new ProviderError("invalid_api_key", this.id, "PEXELS_API_KEY rechazada (401). Verifica la key.", 401);
    }
    if (response.status === 429) {
      throw new ProviderError("rate_limit", this.id, "Rate limit de Pexels alcanzado. Reintenta más tarde.", 429);
    }
    if (!response.ok) {
      throw new ProviderError(
        "provider_error",
        this.id,
        `Pexels respondió ${response.status} ${response.statusText}.`,
        response.status,
      );
    }

    try {
      return (await response.json()) as T;
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new ProviderError("invalid_response", this.id, `Respuesta no-JSON de Pexels: ${cause}`);
    }
  }
}
