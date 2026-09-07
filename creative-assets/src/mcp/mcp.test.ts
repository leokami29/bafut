import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createContext, McpApplicationContext } from "./context";
import { handleSearchImages, SearchImagesInput } from "./tools/search-images";
import { handleDownloadAsset, DownloadAssetInput } from "./tools/download-asset";
import { handleProcessAsset, ProcessAssetInput } from "./tools/process-asset";
import { handleResolveAssetPlan, ResolveAssetPlanInput } from "./tools/resolve-asset-plan";
import { handleEmitPenpotScript, EmitPenpotScriptInput } from "./tools/emit-penpot-script";
import { handleCreateCampaign, CreateCampaignInput } from "./tools/create-campaign";
import { ImageProvider, ImageSearchResult, ProviderError } from "../providers/types";
import { createMcpServer } from "./server";
import { McpToolError } from "./types";
import { defaultRegistry } from "../assets/processing/registry";
import { JsonMetadataRepository } from "../assets/metadata-repository";

/** Proveedor fake (sin red). */
function fakeProvider(results: Partial<ImageSearchResult>[] = []): ImageProvider {
  return {
    id: "pexels",
    search: vi.fn().mockResolvedValue(
      results.map((r, i) => {
        const pid = r.metadata && typeof r.metadata.pexels_id === "number" ? r.metadata.pexels_id : i;
        return {
          id: `pexels-${pid}`,
          provider: "pexels",
          thumbnailUrl: "https://img/tiny.jpg",
          previewUrl: "https://img/large.jpg",
          originalUrl: r.originalUrl ?? `https://img/o-${pid}.jpg`,
          width: 1920,
          height: 1080,
          aspectRatio: 1.78,
          author: { name: "John Doe" },
          license: "Pexels License",
          metadata: { pexels_id: pid },
          ...r,
        } as ImageSearchResult;
      }),
    ),
  };
}

/** PNG real (sharp) para descargar. */
async function pngFile(dir: string, w = 400, h = 300): Promise<{ file: string; bytes: Buffer }> {
  const file = path.join(dir, `img-${Math.random().toString(36).slice(2)}.png`);
  const bytes = await sharp({ create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 0 }, noise: { type: "gaussian", mean: 80, sigma: 30 } } }).png().toBuffer();
  await import("node:fs/promises").then((fs) => fs.writeFile(file, bytes));
  return { file, bytes };
}

function makeContextOpts(root: string, results: Partial<ImageSearchResult>[]) {
  const metadataDir = path.join(root, "assets", "metadata");
  const repo = new JsonMetadataRepository(metadataDir);
  return {
    providers: [fakeProvider(results)],
    metadataRepo: repo,
  };
}

const brief = {
  campaignId: "torneo-test",
  brandId: "bafut",
  objective: "Promocionar torneo",
  format: { preset: "ig-portrait", width: 1080, height: 1350 },
  headline: "TORNEO 2026",
};

describe("Creative Assets MCP (Fase 6)", () => {
  let root: string;
  let ctx: McpApplicationContext;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "bafut-mcp-"));
    await mkdir(path.join(root, "assets"), { recursive: true });
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    if (cleanup) await cleanup();
  });

  async function init(results: Partial<ImageSearchResult>[] = [{ metadata: { pexels_id: 111 } }]) {
    const bytes = (await pngFile(root)).bytes;
    // stub de fetch: ninguna descarga toca Internet (cumple "sin red" en tests)
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array(bytes), { status: 200, headers: { "Content-Type": "image/png" } })),
    );
    const contextOpts = makeContextOpts(root, results);
    ctx = await createContext({
      ...contextOpts,
      registry: defaultRegistry(),
      assetsDir: path.join(root, "assets"),
      tempRoot: path.join(root, "temp"),
    });
    cleanup = async () => rm(root, { recursive: true, force: true });
    return bytes;
  }

  it("1-2. el servidor registra los 6 tools", async () => {
    await init();
    const server = createMcpServer(ctx);
    // el McpServer del SDK registra internamente; verificamos que no lanza y que
    // las funciones handler existen (smoke test)
    expect(server).toBeTruthy();
    expect(typeof handleSearchImages).toBe("function");
    expect(typeof handleDownloadAsset).toBe("function");
    expect(typeof handleProcessAsset).toBe("function");
    expect(typeof handleResolveAssetPlan).toBe("function");
    expect(typeof handleEmitPenpotScript).toBe("function");
    expect(typeof handleCreateCampaign).toBe("function");
  });

  it("3. search_images valida input (query vacia rechazada)", async () => {
    await init();
    expect(() => SearchImagesInput.parse({ query: "   " })).toThrow();
    expect(() => SearchImagesInput.parse({ query: "x", limit: 500 })).toThrow();
    expect(() => SearchImagesInput.parse({ query: "x", orientation: "diagonal" })).toThrow();
  });

  it("4. search_images usa el SearchEngine y normaliza resultados", async () => {
    await init([{ metadata: { pexels_id: 42 } }]);
    const out = await handleSearchImages(ctx, SearchImagesInput.parse({ query: "football player", limit: 5 }));
    expect(out.totalResults).toBeGreaterThan(0);
    const first = out.results[0];
    expect(first).toMatchObject({ provider: "pexels", candidateId: "pexels-42", author: "John Doe", license: "Pexels License" });
    // NO descarga: ningún archivo raw creado aún
    expect((await readdir(path.join(root, "assets"))).filter((f) => f === "raw")).toHaveLength(0);
  });

  it("search_images con provider deshabilitado â†’ INVALID_INPUT", async () => {
    await init();
    const err = await handleSearchImages(ctx, SearchImagesInput.parse({ query: "x", provider: "unsplash" })).catch((e) => e);
    expect(err).toBeInstanceOf(McpToolError);
    expect(err.code).toBe("INVALID_INPUT");
  });

  it("5-6. download_asset usa AssetService; segunda llamada â†’ deduplicated: true", async () => {
    await init([{ metadata: { pexels_id: 77 } }]);
    const input = DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "77", query: "football player" });
    const first = await handleDownloadAsset(ctx, input);
    expect(first.downloaded).toBe(true);
    expect(first.deduplicated).toBe(false);
    expect(first).toMatchObject({ status: "ready", width: 400, height: 300, hasTransparency: false });
    expect(first.assetId).toMatch(/^asset_[a-f0-9]{16}$/);
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);

    const second = await handleDownloadAsset(ctx, input);
    expect(second.deduplicated).toBe(true);
    expect(second.downloaded).toBe(false);
    expect(second.assetId).toBe(first.assetId);
  });

  it("download_asset sin query (primera vez) â†’ INVALID_INPUT accionable", async () => {
    await init();
    const err = await handleDownloadAsset(ctx, DownloadAssetInput.parse({ resultId: "pexels-9" })).catch((e) => e);
    expect(err).toBeInstanceOf(McpToolError);
    expect(err.code).toBe("INVALID_INPUT");
    expect(err.message).toContain("query");
  });

  it("7. process_asset usa AssetProcessor (resize encadenado, idempotencia)", async () => {
    await init([{ metadata: { pexels_id: 55 } }]);
    const dl = await handleDownloadAsset(ctx, DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "55", query: "x" }));
    const input = ProcessAssetInput.parse({ assetId: dl.assetId, steps: [{ operation: "resize", options: { width: 200 } }] });
    const out = await handleProcessAsset(ctx, input);
    expect(out.status).toBe("ready");
    expect(out.cached).toBe(false);
    expect(out.parentAssetId).toBe(dl.assetId);
    expect(out.width).toBe(200);
    expect(out.height).toBe(150);

    const again = await handleProcessAsset(ctx, input);
    expect(again.cached).toBe(true);
    expect(again.assetId).toBe(out.assetId);
  });

  it("8. operacion invalida = INVALID_OPERATION con lista de disponibles", async () => {
    await init([{ metadata: { pexels_id: 56 } }]);
    const dl = await handleDownloadAsset(ctx, DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "56", query: "x" }));
    const input = ProcessAssetInput.parse({ assetId: dl.assetId, steps: [{ operation: "makemagic" }] });
    const err = await handleProcessAsset(ctx, input).catch((e) => e);
    expect(err.code).toBe("INVALID_OPERATION");
    expect(err.message).toContain("makemagic");
    expect(err.message).toContain("remove-background");
  });

  it("9. resolve_asset_plan devuelve missing + pendingQueries", async () => {
    await init();
    const input = ResolveAssetPlanInput.parse({
      plan: {
        canvas: { width: 1080, height: 1350 },
        layers: [{ type: "image", role: "background", asset: "stadium" }],
        assets: [{ id: "stadium", role: "background", query: "stadium night" }],
      },
    });
    const out = await handleResolveAssetPlan(ctx, input);
    expect(out.assets[0]).toMatchObject({ planRef: "stadium", status: "missing", query: "stadium night" });
    expect(out.pendingQueries).toEqual(["stadium night"]);
    expect(out.nextActions[0]).toBe("search_images");
  });

  it("10-11. resolve_asset_plan ready / needs_processing con repo del contexto", async () => {
    await init([{ metadata: { pexels_id: 60 } }]);
    const dl = await handleDownloadAsset(ctx, DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "60", query: "x" }));
    const input = ResolveAssetPlanInput.parse({
      plan: {
        canvas: { width: 1080, height: 1350 },
        layers: [
          { type: "image", role: "texture", asset: "tex" },
          { type: "image", role: "hero", asset: "hero-player" },
        ],
        assets: [
          { id: "tex", role: "texture", sourceAssetId: dl.assetId },
          { id: "hero-player", role: "hero", sourceAssetId: dl.assetId, requiresBackgroundRemoval: true },
        ],
      },
    });
    // el contexto real usa el repo de creative-assets; para el test, inyectamos
    // el repo local recreando el contexto con el mismo root
    const ctxLocal = await createContext({
      providers: [fakeProvider()],
      metadataRepo: new JsonMetadataRepository(path.join(root, "assets", "metadata")),
      registry: defaultRegistry(),
      assetsDir: path.join(root, "assets"),
      tempRoot: path.join(root, "temp"),
    });
    const out = await handleResolveAssetPlan(ctxLocal, input);
    expect(out.assets.find((a) => a.planRef === "tex")?.status).toBe("ready");
    expect(out.assets.find((a) => a.planRef === "hero-player")?.status).toBe("needs_processing");
    expect(out.assets.find((a) => a.planRef === "hero-player")?.requiredProcessing[0].operation).toBe("remove-background");
  });

  it("resolve_asset_plan con marca inexistente â†’ BRAND_NOT_FOUND", async () => {
    await init();
    const input = ResolveAssetPlanInput.parse({
      plan: {
        canvas: { width: 1080, height: 1350 },
        brandId: "marca-inexistente",
        layers: [{ type: "text", role: "headline", content: "X" }],
        assets: [],
      },
    });
    const err = await handleResolveAssetPlan(ctx, input).catch((e) => e);
    expect(err.code).toBe("BRAND_NOT_FOUND");
  });

  it("12. emit_penpot_script usa ScriptedPenpotAdapter (script real, no ejecutado)", async () => {
    await init([{ metadata: { pexels_id: 70 } }]);
    const dl = await handleDownloadAsset(ctx, DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "70", query: "x" }));
    const plan = {
      canvas: { width: 1080, height: 1350 },
      brandId: "bafut",
      layers: [
        { type: "image", role: "background", asset: "bg-img" },
        { type: "image", role: "hero", asset: "hero-cut" },
        { type: "text", role: "headline", content: "H", colorFromBrand: "paper" },
      ],
      assets: [
        { id: "bg-img", role: "background", sourceAssetId: dl.assetId },
        { id: "hero-cut", role: "hero", sourceAssetId: dl.assetId },
      ],
    };
    const input = EmitPenpotScriptInput.parse({
      compositionPlan: plan,
      assets: [{ assetId: dl.assetId, planRef: "bg-img" }, { assetId: dl.assetId, planRef: "hero-cut" }],
    });
    const out = await handleEmitPenpotScript(ctx, input);
    expect(out.format).toBe("penpot-plugin-script");
    expect(out.layerCount).toBe(3);
    expect(out.assetsUsed).toHaveLength(2);
    expect(out.script).toContain("penpot.createBoard()");
    expect(out.script).toContain("penpot.uploadMediaData(");
    expect(out.script).toContain("Barlow Condensed");
    expect(out.execution.executedBy).toBe("ai-agent");
    expect(out.execution.note).toContain("NO ejecuta");
  });

  it("emit_penpot_script con asset faltante â†’ ASSET_NOT_FOUND", async () => {
    await init();
    const input = EmitPenpotScriptInput.parse({
      compositionPlan: {
        canvas: { width: 1080, height: 1350 },
        layers: [{ type: "image", role: "hero", asset: "hero" }],
        assets: [{ id: "hero", role: "hero" }],
      },
      assets: [{ assetId: "asset_0000000000000000" }],
    });
    const err = await handleEmitPenpotScript(ctx, input).catch((e) => e);
    expect(err.code).toBe("ASSET_NOT_FOUND");
  });

  it("emit_penpot_script sin assets para todas las capas â†’ INVALID_INPUT con lista", async () => {
    await init([{ metadata: { pexels_id: 71 } }]);
    const dl = await handleDownloadAsset(ctx, DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "71", query: "x" }));
    const plan = {
      canvas: { width: 1080, height: 1350 },
      layers: [
        { type: "image", role: "hero", asset: "hero" },
        { type: "image", role: "background", asset: "bg" },
      ],
      assets: [
        { id: "hero", role: "hero", sourceAssetId: dl.assetId },
        { id: "bg", role: "background", sourceAssetId: dl.assetId },
      ],
    };
    const input = EmitPenpotScriptInput.parse({ compositionPlan: plan, assets: [{ assetId: dl.assetId, planRef: "hero" }] });
    const err = await handleEmitPenpotScript(ctx, input).catch((e) => e);
    expect(err.code).toBe("INVALID_INPUT");
    expect(err.details?.missing).toEqual(["bg"]);
  });

  it("13. create_campaign guarda manifiesto y devuelve needs_assets + nextActions", async () => {
    await init();
    const input = CreateCampaignInput.parse({
      brief,
      plan: {
        canvas: { preset: "ig-portrait", width: 1080, height: 1350 },
        brandId: "bafut",
        layers: [{ type: "image", role: "background", asset: "stadium" }],
        assets: [{ id: "stadium", role: "background", query: "stadium night" }],
      },
    });
    const out = await handleCreateCampaign(ctx, input);
    expect(out.status).toBe("needs_assets");
    expect(out.assets[0].status).toBe("missing");
    expect(out.nextActions[0]).toBe("search_images");
    const manifest = JSON.parse(await readFile(out.manifestPath, "utf8"));
    expect(manifest.brief.campaignId).toBe("torneo-test");
    expect(manifest.composition.canvas.width).toBe(1080);
  });

  it("14. errores estructurados: codigo + mensaje, sin stack", async () => {
    await init();
    const err = await handleSearchImages(ctx, SearchImagesInput.parse({ query: "x", provider: "nope" })).catch((e) => e);
    const json = err.toJSON();
    expect(Object.keys(json)).toEqual(["code", "message", "details"]);
    expect(json.code).toBe("INVALID_INPUT");
    expect(json.message).not.toMatch(/at .+:\d+/);
  });

  it("15. seguridad: provider con caracteres raros rechazado por schema", () => {
    expect(() => SearchImagesInput.parse({ query: "x", provider: "pexels; rm -rf" })).toThrow();
    expect(() => DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "../../etc" })).toThrow();
    expect(() => ProcessAssetInput.parse({ assetId: "../../raw/x", steps: [{ operation: "resize" }] })).toThrow();
    expect(() => CreateCampaignInput.parse({ brief: { ...brief, ctaUrl: "javascript:alert(1)" }, plan: { canvas: { width: 1080, height: 1350 }, layers: [{ type: "text", role: "headline", content: "x" }], assets: [] } })).toThrow();
  });

  it("16. download_asset nunca acepta paths del agente: solo IDs controlados", async () => {
    await init();
    expect(() => DownloadAssetInput.parse({ provider: "pexels", providerAssetId: "a/b" })).toThrow();
    expect(() => ProcessAssetInput.parse({ assetId: "asset_ZZZZ", steps: [{ operation: "resize" }] })).toThrow();
  });

  it("17. errores mapeados a codigos MCP (sin protocolo en stdout)", async () => {
    // provider que falla â†’ PROVIDER_ERROR estructurado
    const broken = new (class implements ImageProvider {
      id = "pexels";
      search = vi.fn().mockRejectedValue(new ProviderError("network", "pexels", "boom"));
    })();
    const ctxBroken = await createContext({
      providers: [broken],
      metadataRepo: new JsonMetadataRepository(path.join(root, "assets", "metadata")),
      registry: defaultRegistry(),
      assetsDir: path.join(root, "assets"),
      tempRoot: path.join(root, "temp"),
    });
    const err = await handleSearchImages(ctxBroken, SearchImagesInput.parse({ query: "x" })).catch((e) => e);
    expect(err.code).toBe("PROVIDER_ERROR");
    // el server se crea sin escribir en stdout (stdio queda limpio)
    const server = createMcpServer(ctxBroken);
    expect(server).toBeTruthy();
  });
});
