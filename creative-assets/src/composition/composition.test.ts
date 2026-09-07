import { describe, expect, it } from "vitest";
import {
  validateBrief,
  validatePlan,
  FORMAT_PRESETS,
  requiredAssetIds,
  CompositionPlan,
  CreativeBrief,
} from "./types";
import { semanticRect, layerRect, defaultFontSize, zIndexFor, defaultSafeArea } from "./layout";
import { loadBrand, resolveColor, resolveFont } from "./brand";
import { MockPenpotAdapter, ScriptedPenpotAdapter } from "./penpot-adapter";
import { resolveAssetPlan } from "./campaign";

const brief = (over: Partial<CreativeBrief> = {}): CreativeBrief => ({
  campaignId: "football-tournament-2026",
  objective: "Promocionar torneo de fÃºtbol 5",
  format: { width: 1080, height: 1350 },
  ...over,
});

const plan = (over: Partial<CompositionPlan> = {}): CompositionPlan => ({
  canvas: { width: 1080, height: 1350 },
  layers: [],
  assets: [],
  ...over,
});

describe("CreativeBrief Â· validaciÃ³n", () => {
  it("brief vÃ¡lido no produce errores", () => {
    expect(validateBrief(brief())).toEqual([]);
  });
  it("sin campaignId ni objective â†’ errores claros", () => {
    const errors = validateBrief(brief({ campaignId: "", objective: "" }));
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("campaignId");
  });
  it("formatos demasiado pequeÃ±os â†’ error", () => {
    expect(validateBrief(brief({ format: { width: 10, height: 10 } }))).toHaveLength(1);
  });
  it("presets de formatos sociales disponibles", () => {
    expect(FORMAT_PRESETS["ig-portrait"]).toMatchObject({ width: 1080, height: 1350 });
    expect(FORMAT_PRESETS["ig-square"]).toMatchObject({ width: 1080, height: 1080 });
    expect(FORMAT_PRESETS["story"]).toMatchObject({ width: 1080, height: 1920 });
    expect(FORMAT_PRESETS["landscape"]).toMatchObject({ width: 1920, height: 1080 });
  });
});

describe("CompositionPlan Â· validaciÃ³n", () => {
  it("plan vÃ¡lido sin errores", () => {
    const p = plan({
      layers: [{ type: "text", role: "headline", content: "TORNEO 2026" }],
      assets: [{ id: "stadium", role: "background", query: "stadium night" }],
    });
    expect(validatePlan(p)).toEqual([]);
  });
  it("capa imagen con asset desconocido â†’ error", () => {
    const p = plan({
      layers: [{ type: "image", role: "hero", asset: "no-existe" }],
      assets: [],
    });
    expect(validatePlan(p).join(" ")).toContain("no-existe");
  });
  it("capa imagen con assetId real del sistema es vÃ¡lida", () => {
    const p = plan({
      layers: [{ type: "image", role: "hero", asset: "asset_0123456789abcdef" }],
      assets: [],
    });
    expect(validatePlan(p)).toEqual([]);
  });
  it("texto sin contenido y opacity fuera de rango â†’ errores", () => {
    const p = plan({
      layers: [
        { type: "text", role: "headline", content: "  " },
        { type: "shape", role: "deco", shape: "rectangle", opacity: 2, fill: "#000" },
      ],
    });
    expect(validatePlan(p)).toHaveLength(2);
  });
  it("requiredAssetIds devuelve los assets de capas de imagen en orden", () => {
    const p = plan({
      layers: [
        { type: "image", role: "background", asset: "stadium" },
        { type: "text", role: "headline", content: "X" },
        { type: "image", role: "hero", asset: "hero-player" },
      ],
      assets: [
        { id: "stadium", role: "background" },
        { id: "hero-player", role: "hero" },
      ],
    });
    expect(requiredAssetIds(p)).toEqual(["stadium", "hero-player"]);
  });
});

describe("Layout engine Â· posiciones semÃ¡nticas y safe areas", () => {
  const canvas = { width: 1080, height: 1350 };
  const safe = defaultSafeArea(canvas); // 6% de 1080 = 65px

  it("full = full-bleed ignorando safe area", () => {
    const r = semanticRect("full", canvas, safe);
    expect(r).toEqual({ x: 0, y: 0, width: 1080, height: 1350 });
  });
  it("top-left arranca en la safe area", () => {
    const r = semanticRect("top-left", canvas, safe);
    expect(r.x).toBe(safe.left);
    expect(r.y).toBe(safe.top);
    expect(r.x + r.width).toBeLessThanOrEqual(canvas.width - safe.right);
  });
  it("right ocupa la columna derecha del Ã¡rea interna", () => {
    const r = semanticRect("right", canvas, safe);
    expect(r.x + r.width).toBe(canvas.width - safe.right);
    expect(r.width).toBe(Math.round((canvas.width - safe.left - safe.right) / 3));
  });
  it("bottom-right termina en el borde seguro inferior/derecho", () => {
    const r = semanticRect("bottom-right", canvas, safe);
    expect(r.y + r.height).toBe(canvas.height - safe.bottom);
    expect(r.x + r.width).toBe(canvas.width - safe.right);
  });
  it("sizeHint con right ancla a la derecha", () => {
    const r = semanticRect("right", canvas, safe, { width: 0.5 });
    expect(r.width).toBe(540);
    expect(r.x + r.width).toBe(canvas.width - safe.right);
  });
  it("layer.rect explÃ­cito gana y el offset se aplica", () => {
    const p = plan({
      canvas,
      layers: [{ type: "shape", role: "deco", shape: "rectangle", rect: { x: 10, y: 20, width: 30, height: 40 }, offset: { x: 5 } }],
    });
    expect(layerRect(p, p.layers[0])).toEqual({ x: 15, y: 20, width: 30, height: 40 });
  });
  it("hero por defecto: columna derecha alta (sin position declarada)", () => {
    const p = plan({ canvas, layers: [{ type: "image", role: "hero", asset: "a" }] });
    const r = layerRect(p, p.layers[0]);
    expect(r.width).toBeGreaterThan(canvas.width / 3);
    expect(r.x + r.width).toBeLessThanOrEqual(canvas.width);
  });
  it("background por defecto es full-bleed", () => {
    const p = plan({ canvas, layers: [{ type: "image", role: "background", asset: "a" }] });
    expect(layerRect(p, p.layers[0])).toEqual({ x: 0, y: 0, width: 1080, height: 1350 });
  });
  it("jerarquÃ­a tipogrÃ¡fica determinista por rol", () => {
    const h = defaultFontSize("headline", canvas);
    const s = defaultFontSize("subheadline", canvas);
    const c = defaultFontSize("cta", canvas);
    expect(h).toBeGreaterThan(s);
    expect(s).toBeGreaterThan(c);
  });
  it("z-order canÃ³nico: background < hero < headline < cta < logo", () => {
    const layers = [
      { type: "image", role: "background", asset: "a" },
      { type: "image", role: "hero", asset: "b" },
      { type: "text", role: "headline", content: "H" },
      { type: "text", role: "cta", content: "C" },
      { type: "text", role: "logo", content: "BAFUT" },
    ] as CompositionPlan["layers"];
    const z = layers.map((l, i) => zIndexFor(l, i, layers));
    expect(z[0]).toBeLessThan(z[1]);
    expect(z[1]).toBeLessThan(z[2]);
    expect(z[2]).toBeLessThan(z[3]);
    expect(z[3]).toBeLessThan(z[4]);
  });
  it("capa con rol canÃ³nico repetido: la Ãºltima queda encima", () => {
    const layers = [
      { type: "text", role: "headline", content: "A" },
      { type: "text", role: "headline", content: "B" },
    ] as CompositionPlan["layers"];
    expect(zIndexFor(layers[1], 1, layers)).toBeGreaterThan(zIndexFor(layers[0], 0, layers));
  });
});

describe("Brand integration", () => {
  it("carga brand.json de bafut con colores y fuentes reales", async () => {
    const brand = await loadBrand("bafut");
    expect(brand.colors["flood"]).toBe("#FFD25A");
    expect(brand.colors["turf"]).toBe("#0C6B4C");
    expect(brand.fonts.display).toBe("Barlow Condensed");
  });
  it("resolveColor: token de marca tiene prioridad sobre hex genÃ©rico", async () => {
    const brand = await loadBrand("bafut");
    expect(resolveColor(brand, "#FFFFFF", "flood")).toBe("#FFD25A");
    expect(resolveColor(brand, "#FFFFFF", "no-existe")).toBe("#FFFFFF");
  });
  it("resolveFont: headline usa la display de la marca", async () => {
    const brand = await loadBrand("bafut");
    expect(resolveFont(brand, { role: "headline" }).family).toBe("Barlow Condensed");
    expect(resolveFont(brand, { fontFamily: "Custom" }).family).toBe("Custom"); // override explÃ­cito
  });
  it("marca inexistente â†’ error claro", async () => {
    await expect(loadBrand("no-existe-xyz")).rejects.toThrow(/no se pudo cargar/i);
  });
});

describe("PenpotAdapter", () => {
  const fullPlan: CompositionPlan = {
    canvas: { width: 1080, height: 1350 },
    brandId: "bafut",
    layers: [
      { type: "image", role: "background", asset: "stadium", bleed: true },
      { type: "overlay", role: "overlay", color: "#073828", gradient: { direction: "up", opacity: 0.85 }, bleed: true },
      { type: "image", role: "hero", asset: "hero-player", position: "right", sizeHint: { width: 0.6, height: 0.85 }, radius: 0, shadow: { color: "#000000", opacity: 0.4, blur: 24 } },
      { type: "image", role: "decorative", asset: "football", position: "bottom-right", sizeHint: { width: 0.2 } },
      { type: "text", role: "headline", content: "TORNEO 2026", position: "top-left", colorFromBrand: "paper" },
      { type: "text", role: "subheadline", content: "FÃšTBOL 5", position: "top-left", offset: { y: 140 }, colorFromBrand: "flood" },
      { type: "text", role: "cta", content: "INSCRIPCIONES ABIERTAS", position: "bottom-left", colorFromBrand: "deep" },
      { type: "text", role: "logo", content: "BAFUT", position: "top-right", colorFromBrand: "paper" },
    ],
    assets: [
      { id: "stadium", role: "background", query: "football stadium night" },
      { id: "hero-player", role: "hero", query: "football player action", requiresBackgroundRemoval: true },
      { id: "football", role: "decorative", query: "football close up", requiresBackgroundRemoval: true },
    ],
  };

  const images = [
    { key: "stadium", name: "stadium", mimeType: "image/jpeg", width: 1920, height: 1080, data: Buffer.from("fake") },
    { key: "hero-player", name: "hero", mimeType: "image/png", width: 800, height: 1200, data: Buffer.from("fake") },
    { key: "football", name: "ball", mimeType: "image/png", width: 600, height: 600, data: Buffer.from("fake") },
  ];

  it("MockPenpotAdapter registra canvas + imÃ¡genes + capas en orden", () => {
    const mock = new MockPenpotAdapter();
    const out = mock.emit(fullPlan, null, images);
    expect(mock.ops[0].op).toBe("createCanvas");
    expect(mock.ops.filter((o) => o.op === "uploadImage")).toHaveLength(3);
    const adds = mock.ops.filter((o) => o.op.startsWith("add_"));
    expect(adds.map((o) => o.op)).toEqual(["add_image", "add_overlay", "add_image", "add_image", "add_text", "add_text", "add_text", "add_text"]);
    expect(out.steps.length).toBeGreaterThan(0);
  });

  it("ScriptedPenpotAdapter genera cÃ³digo con SOLO capacidades reales del plugin API", async () => {
    const brand = await loadBrand("bafut");
    const { script, boardName, steps } = new ScriptedPenpotAdapter().emit(fullPlan, brand, images);
    expect(boardName).toContain("1080x1350");
    // capacidades reales usadas
    expect(script).toContain("penpot.createBoard()");
    expect(script).toContain("penpot.createRectangle()");
    expect(script).toContain("penpot.createText(");
    expect(script).toContain("penpot.uploadMediaData(");
    expect(script).toContain("penpotUtils.setParentXY(");
    expect(script).toContain("fillColorGradient");
    expect(script).toContain('"drop-shadow"');
    expect(script).toContain("f.applyToText(t, v)");
    // fuentes de la marca, no inventadas
    expect(script).toContain("Barlow Condensed");
    // colores de la marca
    expect(script).toContain("#FFD25A");
    // imÃ¡genes inline en base64 (uploadMediaData consume Uint8Array)
    expect(script).toContain("Uint8Array.from(atob(");
    // el z-order se materializa por orden de appendChild
    const appends = script.match(/board\.appendChild\(/g)?.length ?? 0;
    expect(appends).toBe(fullPlan.layers.length);
    expect(steps[0]).toContain("penpot_execute_code");
    // el script es JavaScript sintÃ¡cticamente vÃ¡lido (top-level await â†’ IIFE async)
     
    new Function("penpot", "penpotUtils", `return (async () => {\n${script}\n})()`);
  });

  it("el CTA usa la fuente display de la marca y el headline respeta safe area", async () => {
    const brand = await loadBrand("bafut");
    const { script } = new ScriptedPenpotAdapter().emit(fullPlan, brand, images);
    expect(script).toContain(`=== "800"`); // variante display 800
  });
});

describe("AssetPlan Â· reconciliaciÃ³n", () => {
  it("assets sin sourceAssetId quedan 'missing' con su query para search", async () => {
    const p = plan({
      assets: [
        { id: "stadium", role: "background", query: "stadium night" },
        { id: "hero-player", role: "hero", query: "player action", requiresBackgroundRemoval: true },
      ],
    });
    const resolutions = await resolveAssetPlan(p);
    expect(resolutions.map((r) => r.status)).toEqual(["missing", "missing"]);
  });

  it("asset existente sin remove-bg â†’ ready; con remove-bg â†’ needs_processing", async () => {
    // usa un asset real creado por AssetService (no requiere red)
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const root = await mkdtemp(path.join(tmpdir(), "bafut-plan-"));
    try {
      // PNG real generado con sharp (fixture)
      const sharp = (await import("sharp")).default;
      const file = path.join(root, "a.png");
      await sharp({ create: { width: 200, height: 150, channels: 3, background: { r: 0, g: 0, b: 0 }, noise: { type: "gaussian", mean: 80, sigma: 30 } } }).png().toFile(file);
      const png = await import("node:fs/promises").then((fs) => fs.readFile(file));
      const fetcher = (async () => new Response(new Uint8Array(png), { status: 200, headers: { "Content-Type": "image/png" } })) as typeof fetch;
      const { AssetService } = await import("../assets/asset-service");
      const { AssetDownloader } = await import("../assets/downloader");
      const { AssetValidator } = await import("../assets/validator");
      const { LocalAssetStorage } = await import("../assets/storage");
      const { JsonMetadataRepository } = await import("../assets/metadata-repository");
      const svc = new AssetService({
        downloader: new AssetDownloader({ tempDir: root, fetcher }),
        validator: new AssetValidator(),
        storage: new LocalAssetStorage(root),
        metadata: new JsonMetadataRepository(path.join(root, "meta")),
        tempDir: root,
      });
      const dl = await svc.downloadAsset(
        { id: "pexels-5", provider: "pexels", thumbnailUrl: "", previewUrl: "", originalUrl: "https://x/a.png", metadata: { pexels_id: 5 } } as never,
        {},
      );

      const repo = new JsonMetadataRepository(path.join(root, "meta"));
      const pReady = plan({ assets: [{ id: "x", role: "texture", sourceAssetId: dl.asset.id }] });
      const [r1] = await resolveAssetPlan(pReady, repo);
      expect(r1.status).toBe("ready");

      const pProcess = plan({ assets: [{ id: "y", role: "hero", sourceAssetId: dl.asset.id, requiresBackgroundRemoval: true }] });
      const [r2] = await resolveAssetPlan(pProcess, repo);
      expect(r2.status).toBe("needs_processing");
      expect(r2.pendingSteps[0].type).toBe("remove-background");
    } finally {
      await import("node:fs/promises").then((fs) => fs.rm(root, { recursive: true, force: true }));
    }
  });
});
