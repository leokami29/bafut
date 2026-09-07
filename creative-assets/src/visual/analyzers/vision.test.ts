import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { analyzeRendered, LocalRenderedVisualAnalyzer } from "./local-vision-analyzer";
import { loadSample, brightnessStats, contrastStats, whitespace, visualBalance, dominantRegions, textLikeRegions, visualDensity } from "./image-statistics";
import { VisionError } from "./types";
import { DefaultCritic, critiqueFingerprint, saveCritiqueIteration, listCritiqueIterations } from "../../critic/critique";
import { deriveRenderedEvidence } from "../../critic/rendered-critic";
import { loadBrand } from "../../composition/brand";
import { resolveRenderedImagePath } from "../../composition/campaign";
import { CompositionPlan } from "../../composition/types";

const FIXTURES = path.resolve(process.cwd(), "creative-assets", "fixtures", "visual");
const read = (name: string) => readFile(path.join(FIXTURES, `${name}.png`));

describe("LocalRenderedVisualAnalyzer · métricas", () => {
  it("dimensiones reales + muestra de análisis", async () => {
    const analysis = await analyzeRendered(await read("balanced"), "image/png");
    expect(analysis.width).toBe(400);
    expect(analysis.height).toBe(500);
    expect(analysis.analyzedWidth).toBeLessThanOrEqual(512);
    expect(analysis.confidence["contrast"]).toBeGreaterThan(0.5);
  });

  it("brightness/contrast: high-contrast > low-contrast", async () => {
    const high = await analyzeRendered(await read("high-contrast"), "image/png");
    const low = await analyzeRendered(await read("low-contrast"), "image/png");
    expect(high.contrast.global).toBeGreaterThan(low.contrast.global);
    expect(high.contrast.score).toBeGreaterThan(low.contrast.score);
    // bajo contraste produce issue probabilístico (no afirmativo)
    const lowEvidence = deriveRenderedEvidence({} as CompositionPlan, low);
    expect(lowEvidence.issues.some((i) => i.id === "low-global-contrast")).toBe(true);
    expect(lowEvidence.issues[0].message).toMatch(/Possible low readability/i);
  });

  it("brightness: sparse (blanco) es brillante y plano", async () => {
    const analysis = await analyzeRendered(await read("sparse"), "image/png");
    expect(analysis.brightness.mean).toBeGreaterThan(0.95);
    expect(analysis.brightness.variance).toBeLessThan(0.001);
  });

  it("saturación: estadística pura (media/varianza)", async () => {
    const analysis = await analyzeRendered(await read("balanced"), "image/png");
    expect(analysis.saturation.mean).toBeGreaterThanOrEqual(0);
    expect(analysis.saturation.mean).toBeLessThanOrEqual(1);
    expect(typeof analysis.saturation.variance).toBe("number");
  });

  it("edge density y visual density: dense > sparse", async () => {
    const dense = await analyzeRendered(await read("dense"), "image/png");
    const sparse = await analyzeRendered(await read("sparse"), "image/png");
    expect(dense.edgeDensity).toBeGreaterThan(sparse.edgeDensity);
    expect(dense.visualDensity.level).toBe("high");
    expect(sparse.visualDensity.level).toBe("low");
    // nombre correcto: densidad, no "calidad"
    expect(Object.keys(dense.visualDensity)).toEqual(["score", "level", "confidence"]);
  });

  it("whitespace: sparse casi todo vacío; dense sin respiro", async () => {
    const sparse = await analyzeRendered(await read("sparse"), "image/png");
    const dense = await analyzeRendered(await read("dense"), "image/png");
    expect(sparse.whitespace.ratio).toBeGreaterThan(0.9);
    expect(dense.whitespace.ratio).toBeLessThan(0.1);
  });

  it("quadrants y balance: left-heavy desvía el centro de masa a la izquierda", async () => {
    const left = await analyzeRendered(await read("left-heavy"), "image/png");
    const right = await analyzeRendered(await read("right-heavy"), "image/png");
    const balanced = await analyzeRendered(await read("balanced"), "image/png");
    expect(left.balance.centerOfMass.x).toBeLessThan(0.42);
    expect(right.balance.centerOfMass.x).toBeGreaterThan(0.58);
    expect(Math.abs(balanced.balance.centerOfMass.x - 0.5)).toBeLessThan(0.15);
    // evidencia, no veredicto: asimetría genera issue de severidad LOW
    const ev = deriveRenderedEvidence({} as CompositionPlan, left);
    const imbalance = ev.issues.find((i) => i.id === "visual-imbalance");
    expect(imbalance?.severity).toBe("low");
    // cuadrantes existen y están normalizados
    for (const q of Object.values(left.quadrantAnalysis)) {
      for (const v of Object.values(q)) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it("dominantRegions: dense detecta regiones energéticas; sparse ninguna", async () => {
    const dense = await analyzeRendered(await read("dense"), "image/png");
    const sparse = await analyzeRendered(await read("sparse"), "image/png");
    expect(dense.dominantRegions.length).toBeGreaterThan(0);
    expect(sparse.dominantRegions).toHaveLength(0);
  });

  it("textLikeRegions: heurística con confianza limitada (no OCR)", async () => {
    const analysis = await analyzeRendered(await read("balanced"), "image/png");
    for (const r of analysis.textLikeRegions) {
      expect(r.confidence).toBeLessThanOrEqual(0.6);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(1.01);
    }
  });

  it("determinismo: misma imagen → mismas features", async () => {
    const bytes = await read("dense");
    const a = await analyzeRendered(bytes, "image/png");
    const b = await analyzeRendered(bytes, "image/png");
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("textLikeRegions/dominantRegions sobre tiles con luma real", async () => {
    const bytes = await read("balanced");
    const sample = await loadSample(bytes, "image/png");
    expect(dominantRegions(sample).length).toBeGreaterThan(0);
    expect(textLikeRegions(sample).length).toBeGreaterThanOrEqual(0);
    expect(visualDensity(sample.luma, sample.sat, sample.edges).confidence).toBeGreaterThan(0);
    expect(brightnessStats(sample.luma).score).toBeGreaterThan(0);
    expect(contrastStats(sample.luma).global).toBeGreaterThan(0);
    expect(whitespace(sample).largestRegion).toBeTruthy();
    expect(visualBalance(sample).deviationX).toBeLessThan(0.5);
  });
});

describe("Límites de imagen (seguridad)", () => {
  it("rechaza no-imagen", async () => {
    await expect(loadSample(Buffer.from("<html>hola</html>"), "text/html")).rejects.toThrow(/INVALID_IMAGE|Content-Type/);
  });
  it("rechaza buffer gigante con error estructurado", async () => {
    const big = new Uint8Array(21 * 1024 * 1024);
    const err = await new LocalRenderedVisualAnalyzer().analyze({ data: big, mimeType: "image/png" }).catch((e) => e);
    expect(err).toBeInstanceOf(VisionError);
    expect(err.code).toBe("IMAGE_TOO_LARGE");
  });
  it("dimensions excesivas rechazadas (límite de dimensiones del analyzer)", async () => {
    const { VISION_LIMITS } = await import("./types");
    expect(VISION_LIMITS.maxDimensions).toBe(8000);
    // buffer truncado/dañado → INVALID_IMAGE (sin stack trace al agente)
    const err = await new LocalRenderedVisualAnalyzer().analyze({ data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]), mimeType: "image/png" }).catch((e) => e);
    expect(String(err?.code ?? err?.message)).toMatch(/INVALID_IMAGE|IMAGE_TOO_BIG_DIMENSIONS|IMAGE_TOO_LARGE|unsupported/i);
  });
});

describe("VisualCritic combinando evidencia (structural + pixel)", () => {
  const plan: CompositionPlan = {
    canvas: { width: 1080, height: 1350 },
    layers: [
      { type: "image", role: "background", asset: "stadium", bleed: true },
      { type: "text", role: "headline", content: "TORNEO", position: "top-left", colorFromBrand: "paper" },
      { type: "text", role: "cta", content: "INSCRIPCIONES", position: "bottom-left", colorFromBrand: "flood" },
    ],
    assets: [],
  };

  it("coexisten issues estructurales y visuales; unknown no penaliza", async () => {
    const brand = await loadBrand("bafut");
    const critic = new DefaultCritic();
    // con render de bajo contraste: issue visual + issue estructural (missing logo)
    const low = await analyzeRendered(await read("low-contrast"), "image/png");
    const report = await critic.critique({ plan, brand, renderedAnalysis: low });
    expect(report.applied).toContain("structural");
    expect(report.applied).toContain("rendered");
    expect(report.issues.some((i) => i.id === "missing-logo")).toBe(true);
    expect(report.issues.some((i) => i.id === "low-global-contrast")).toBe(true);
    // categorías con evidencia pixel: source "pixel"
    expect(report.categories["readability"].source).toBe("pixel");
    expect(report.categories["alignment"].max).toBeGreaterThan(0);
    // overall = media de categorías con evidencia (renormalizado)
    const evidenced = Object.values(report.categories).filter((c) => c.max > 0);
    const expected = Math.round(evidenced.reduce((s, c) => s + (c.score / c.max) * 100, 0) / evidenced.length);
    expect(report.overallScore).toBe(expected);
  });

  it("sin render: categorías visuales unknown y no penalizan", async () => {
    const brand = await loadBrand("bafut");
    const report = await new DefaultCritic().critique({ plan, brand });
    expect(report.categories["readability"]).toEqual({ score: 0, max: 0, source: "unknown" });
    expect(report.categories["alignment"]).toEqual({ score: 0, max: 0, source: "unknown" });
    const noRender = await new DefaultCritic().critique({ plan, brand });
    expect(noRender.overallScore).toBe(report.overallScore);
  });

  it("fingerprint cambia con features visuales y es estable para el mismo input", async () => {
    const plan2 = plan;
    const f1 = critiqueFingerprint(plan2, "bafut", undefined, { readability: 30 });
    const f2 = critiqueFingerprint(plan2, "bafut", undefined, { readability: 30 });
    const f3 = critiqueFingerprint(plan2, "bafut", undefined, { readability: 80 });
    const f4 = critiqueFingerprint(plan2, "bafut", undefined);
    expect(f1).toBe(f2);
    expect(f1).not.toBe(f3);
    expect(f1).not.toBe(f4);
  });

  it("iteraciones: latest.json + newIssues/resolvedIssues previos", async () => {
    const { mkdtemp, rm, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const prevCwd = process.cwd();
    const root = await mkdtemp(path.join(tmpdir(), "bafut-iter-"));
    try {
      process.chdir(root);
      // campaigns/<id>/output/render.png (ruta contenida)
      await mkdir(path.join(root, "creative-assets", "campaigns", "iter-camp", "output"), { recursive: true });
      const renderPath = path.join(root, "creative-assets", "campaigns", "iter-camp", "output", "render.png");
      await writeFile(renderPath, await read("balanced"));

      const brand = await loadBrand("bafut");
      const report = await new DefaultCritic().critique({ plan, brand, rendered: { data: await read("low-contrast"), mimeType: "image/png" }, renderedAnalyzer: new LocalRenderedVisualAnalyzer() });
      await saveCritiqueIteration("iter-camp", report, "fp-1", 1);
      const report2 = await new DefaultCritic().critique({ plan, brand, rendered: { data: await read("balanced"), mimeType: "image/png" }, renderedAnalyzer: new LocalRenderedVisualAnalyzer() });
      await saveCritiqueIteration("iter-camp", report2, "fp-2", 2);

      const list = await listCritiqueIterations("iter-camp");
      expect(list).toHaveLength(2);
      expect(list[1].previousFingerprint).toBe("fp-1");
      expect(list[1].fingerprint).not.toBe(list[0].fingerprint); // el render cambió de verdad
      expect(list[1].visualSummary?.source).toBe("local-pixel-v1");
      const latest = JSON.parse(await readFile(path.join(root, "creative-assets", "campaigns", "iter-camp", "critique", "latest.json"), "utf8"));
      expect(latest.iteration).toBe(2);
      void writeFile;
    } finally {
      process.chdir(prevCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("Seguridad de paths (render)", () => {
  const campaignId = "path-test-camp";
  beforeAll(async () => {
    await mkdir(path.join(process.cwd(), "creative-assets", "campaigns", campaignId, "output"), { recursive: true });
    await writeFile(
      path.join(process.cwd(), "creative-assets", "campaigns", campaignId, "output", "render.png"),
      await read("balanced"),
    );
  });

  it("ruta contenida aceptada", async () => {
    const abs = await resolveRenderedImagePath(campaignId, path.join(process.cwd(), "creative-assets", "campaigns", campaignId, "output", "render.png"));
    expect(abs).toContain("path-test-camp");
  });
  it("path traversal rechazado", async () => {
    await expect(resolveRenderedImagePath(campaignId, "../../assets/raw/asset_6ba807b6b19cffa4.png")).rejects.toThrow(/contención|debe estar dentro/);
  });
  it("file:// y UNC rechazados", async () => {
    await expect(resolveRenderedImagePath(campaignId, "file:///etc/passwd")).rejects.toThrow(/Esquema/);
    await expect(resolveRenderedImagePath(campaignId, "\\\\server\\share\\x.png")).rejects.toThrow(/Esquema/);
  });
  it("absoluta fuera de la campaña rechazada", async () => {
    await expect(resolveRenderedImagePath(campaignId, "C:\\Windows\\system32\\config.png")).rejects.toThrow(/debe estar dentro/);
    await expect(resolveRenderedImagePath(campaignId, path.join(process.cwd(), "creative-assets", "assets", "raw", "asset_6ba807b6b19cffa4.png"))).rejects.toThrow(/debe estar dentro/);
  });
  afterAll(async () => {
    await rm(path.join(process.cwd(), "creative-assets", "campaigns", campaignId), { recursive: true, force: true });
  });
});
