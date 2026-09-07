import path from "node:path";
import { SearchEngine } from "../search-engine";
import { ImageProvider, SearchCache } from "../providers/types";
import { AssetService } from "../assets/asset-service";
import { AssetProcessor } from "../assets/processing/asset-processor";
import { defaultRegistry, ProcessorRegistry } from "../assets/processing/registry";
import { AssetValidator } from "../assets/validator";
import { LocalAssetStorage } from "../assets/storage";
import { JsonMetadataRepository, MetadataRepository } from "../assets/metadata-repository";
import { loadEnabledProviders } from "../providers/registry";
import { NoopCache } from "../cache";
import { ScriptedPenpotAdapter, PenpotAdapter } from "../composition/penpot-adapter";
import { loadBrand as loadBrandImpl } from "../composition/brand";
import { BrandStyles } from "../composition/types";

/**
 * Contexto de aplicación del MCP: inicializa TODOS los servicios una sola vez.
 * Los tools reciben este contexto — nunca crean instancias por request.
 */

export interface McpApplicationContext {
  readonly searchEngine: SearchEngine;
  readonly assetService: AssetService;
  readonly assetProcessor: AssetProcessor;
  readonly registry: ProcessorRegistry;
  readonly penpot: PenpotAdapter;
  loadBrand(brandId: string): Promise<BrandStyles>;
  /** Reconcilia un plan contra el inventario (usa el repo del contexto). */
  resolveAssetPlan(plan: import("../composition/types").CompositionPlan): Promise<import("../composition/types").AssetResolution[]>;
  /** Localiza un resultado por provider+providerAssetId buscando con la query. */
  findResultById(provider: string, providerAssetId: string, query: string): Promise<import("../providers/types").ImageSearchResult>;
}

export interface ContextOptions {
  /** Inyectables para tests (mocks de proveedores/repositorio). */
  providers?: ImageProvider[];
  cache?: SearchCache;
  metadataRepo?: MetadataRepository;
  registry?: ProcessorRegistry;
  /** Raíz de assets (creative-assets/assets en producción; tmp en tests). */
  assetsDir?: string;
  /** Raíz de temporales. */
  tempRoot?: string;
  /** Adapter Penpot inyectable (tests). */
  penpotAdapter?: PenpotAdapter;
}

const CREATIVE_ROOT = path.resolve(process.cwd(), "creative-assets");

export async function createContext(opts: ContextOptions = {}): Promise<McpApplicationContext> {
  // Sin proveedores habilitados el SearchEngine no arranca: usamos un stub que
  // falla claro en el momento de buscar (el MCP sigue iniciando y sirviendo
  // los demás tools).
  const enabled = opts.providers ?? (await loadEnabledProviders());
  const providers: ImageProvider[] = enabled.length
    ? enabled
    : [{
        id: "unconfigured",
        search: async () => {
          throw Object.assign(new (await import("../providers/types")).ProviderError("provider_error", "none", "No hay proveedores habilitados. Configura la API key (p. ej. PEXELS_API_KEY en .env.local)."), { name: "ProviderError" });
        },
      }];
  const engine = new SearchEngine(providers, opts.cache ?? NoopCache);

  // Estructura real de Fase 1 (assets/raw + assets/metadata), inyectable para tests.
  const assetsDir = opts.assetsDir ?? path.join(CREATIVE_ROOT, "assets");
  const tempRoot = opts.tempRoot ?? path.join(CREATIVE_ROOT, "temp");
  const { AssetDownloader } = await import("../assets/downloader");
  const assetService = new AssetService({
    downloader: new AssetDownloader({ tempDir: tempRoot }),
    validator: new AssetValidator(),
    storage: new LocalAssetStorage(assetsDir),
    metadata: opts.metadataRepo ?? new JsonMetadataRepository(path.join(assetsDir, "metadata")),
    tempDir: tempRoot,
  });

  const registry = opts.registry ?? defaultRegistry();
  const repo = opts.metadataRepo ?? new JsonMetadataRepository(path.join(assetsDir, "metadata"));
  const processor = new AssetProcessor({
    registry,
    storage: new LocalAssetStorage(assetsDir),
    metadata: repo,
    validator: new AssetValidator(),
    tempRoot,
  });
  const { resolveAssetPlan: planResolver } = await import("../composition/campaign");

  return {
    searchEngine: engine,
    assetService,
    assetProcessor: processor,
    registry,
    penpot: opts.penpotAdapter ?? new ScriptedPenpotAdapter(),
    loadBrand: loadBrandImpl,
    resolveAssetPlan: (plan) => planResolver(plan, repo),
    findResultById: async (provider, providerAssetId, query) => {
      const resultId = `${provider}-${providerAssetId}`;
      const options: import("../providers/types").SearchImagesOptions = { query, limit: 80, page: 1 };
      for (let page = 1; page <= 3; page++) {
        options.page = page;
        const outcome = await engine.searchImages(options);
        const found = outcome.candidates.map((c) => c.result).find((r) => r.id === resultId);
        if (found) return found;
      }
      throw Object.assign(new Error(`No se encontró ${resultId} en las primeras páginas de la búsqueda "${query}".`), { code: "not_found" });
    },
  };
}
