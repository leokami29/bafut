import {
  ImageProvider,
  ImageSearchResult,
  ProviderError,
  SearchImagesOptions,
  assertValidQuery,
} from "./types";

/**
 * Stub de Unsplash. Demuestra que la arquitectura es multiproveedor.
 * Fase 3: implementar contra https://api.unsplash.com/search/photos
 * (Authorization: Client-ID UNSPLASH_ACCESS_KEY).
 */
export class UnsplashProvider implements ImageProvider {
  readonly id = "unsplash";

  async search(options: SearchImagesOptions): Promise<ImageSearchResult[]> {
    assertValidQuery(options);
    throw new ProviderError(
      "not_implemented",
      this.id,
      "Proveedor Unsplash declarado pero aún no implementado (fase 3). Usa 'pexels'.",
    );
  }
}
