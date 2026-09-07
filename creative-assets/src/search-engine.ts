import { NoopCache } from "./cache";
import {
  ImageCandidate,
  ImageProvider,
  ProviderError,
  SearchCache,
  SearchImagesOptions,
} from "./providers/types";

/**
 * Motor de búsqueda: agrega proveedores, normaliza y envuelve en candidatos.
 * SEARCH ≠ DOWNLOAD: aquí solo se producen información y candidatos.
 */

export interface ProviderSearchOutcome {
  providerId: string;
  results: ImageCandidate[];
  error?: ProviderError;
}

export interface SearchOutcome {
  query: string;
  candidates: ImageCandidate[];
  byProvider: ProviderSearchOutcome[];
  totalResults: number;
}

export function makeCacheKey(providerId: string, options: SearchImagesOptions): string {
  return [
    "imagesearch",
    providerId,
    options.query.trim().toLowerCase(),
    options.page ?? 1,
    options.limit ?? 10,
    options.orientation ?? "any",
    options.size ?? "any",
    options.color ?? "any",
  ].join("|");
}

export class SearchEngine {
  private providers: ImageProvider[];
  private cache: SearchCache;

  constructor(providers: ImageProvider[], cache: SearchCache = NoopCache) {
    if (providers.length === 0) {
      throw new ProviderError(
        "provider_error",
        "search-engine",
        "No hay proveedores habilitados. Configura config/sources.json y la API key correspondiente (p. ej. PEXELS_API_KEY en .env.local).",
      );
    }
    this.providers = providers;
    this.cache = cache;
  }

  /**
   * Busca en todos los proveedores habilitados en paralelo.
   * Un fallo de un proveedor NO aborta la búsqueda: se reporta por proveedor.
   */
  async searchImages(options: SearchImagesOptions): Promise<SearchOutcome> {
    const outcomes = await Promise.all(
      this.providers.map(async (provider): Promise<ProviderSearchOutcome> => {
        const key = makeCacheKey(provider.id, options);
        try {
          const cached = await this.cache.get<ImageCandidate[]>(key);
          if (cached) {
            return { providerId: provider.id, results: cached };
          }
          const results = await provider.search(options);
          const candidates: ImageCandidate[] = results.map((result) => ({
            result,
            status: "pending" as const,
          }));
          await this.cache.set(key, candidates);
          return { providerId: provider.id, results: candidates };
        } catch (err) {
          const error =
            err instanceof ProviderError
              ? err
              : new ProviderError("provider_error", provider.id, err instanceof Error ? err.message : String(err));
          return { providerId: provider.id, results: [], error };
        }
      }),
    );

    const candidates = outcomes.flatMap((o) => o.results);
    return {
      query: options.query,
      candidates,
      byProvider: outcomes,
      totalResults: candidates.length,
    };
  }
}
