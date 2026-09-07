import { describe, expect, it } from "vitest";
import { HeuristicVisualAnalyzer, contextFromPlan, cropCompatibility, orientationOf } from "./heuristics";
import { ROLE_WEIGHTS, sideFromPosition, effectiveWeights, scoreResolution } from "./scoring-rules";
import { VisualScoringEngine } from "./visual-scoring";
import { CandidateRanker, dedupe } from "./candidate-ranker";
import { StaticReferenceProfileLoader } from "./reference-profile";
import { VisualScoringContext } from "./types";
import { handleRankImageCandidates, RankImageCandidatesInput } from "../mcp/tools/rank-image-candidates";
import { createContext } from "../mcp/context";
import { ImageCandidate } from "../providers/types";

const ctx = (over: Partial<VisualScoringContext> = {}): VisualScoringContext => ({
  role: "hero",
  targetWidth: 1080,
  targetHeight: 1350,
  ...over,
});

const candidate = (id: string, w: number, h: number, pid?: number): ImageCandidate =>
  ({
    result: {
      id,
      provider: "pexels",
      width: w,
      height: h,
      aspectRatio: Math.round((w / h) * 1000) / 1000,
      metadata: pid !== undefined ? { pexels_id: pid } : undefined,
    },
    status: "pending",
  }) as ImageCandidate;

describe("Visual features (metadata-only)", () => {
  it("1-2. aspect ratio y orientation correctos", async () => {
    const analyzer = new HeuristicVisualAnalyzer();
    const f = await analyzer.analyze({ width: 2000, height: 3000 });
    expect(f.aspectRatio).toBeCloseTo(0.667, 2);
    expect(f.orientation).toBe("portrait");
    expect(f.megapixels).toBe(6);
  });
  it("orientación square y landscape", async () => {
    const analyzer = new HeuristicVisualAnalyzer();
    expect((await analyzer.analyze({ width: 1000, height: 1000 })).orientation).toBe("square");
    expect((await analyzer.analyze({ width: 1920, height: 1080 })).orientation).toBe("landscape");
    expect(orientationOf(10, 10)).toBe("square");
  });
  it("3-5. fuente metadata marcada; unknown nunca se inventa", async () => {
    const f = await new HeuristicVisualAnalyzer().analyze({ width: 800, height: 600 });
    expect(f.source).toBe("metadata");
    expect(f.analyzer).toBe("heuristic-metadata");
    expect(f.subjectPosition).toBe("unknown");
    expect(f.negativeSpace).toBe("unknown");
    expect(f.visualDensity).toBeNull();
  });
  it("cropCompatibility clasifica excellent/good/acceptable/poor", () => {
    const t = { targetWidth: 1080, targetHeight: 1350 };
    expect(cropCompatibility(2000, 2500, t).level).toBe("excellent"); // ratio 0.8
    expect(cropCompatibility(1080, 1350, t).level).toBe("excellent");
    expect(cropCompatibility(2000, 3000, t).level).toBe("good"); // 0.667 → recorta 17%
    expect(cropCompatibility(1500, 1080, t).level).toBe("acceptable"); // 1.39
    expect(cropCompatibility(4000, 1000, t).level).toBe("poor");
  });
});

describe("Scoring", () => {
  it("6-7. score 0–100 y determinista", async () => {
    const engine = new VisualScoringEngine();
    const f = await new HeuristicVisualAnalyzer().analyze({ width: 2000, height: 3000 });
    const a = await engine.score(f, ctx());
    const b = await engine.score(f, ctx());
    expect(a.total).toBe(b.total);
    expect(a.total).toBeGreaterThanOrEqual(0);
    expect(a.total).toBeLessThanOrEqual(100);
  });
  it("8. resolución alta > insuficiente", async () => {
    const engine = new VisualScoringEngine();
    const big = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 3000, height: 4000 }), ctx());
    const small = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 640, height: 480 }), ctx());
    expect(big.total).toBeGreaterThan(small.total);
    expect(small.warnings.join(" ")).toContain("resolution");
  });
  it("9. aspect ratio compatible > incompatible (4000x1000 hero vertical)", async () => {
    const engine = new VisualScoringEngine();
    const fit = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 2000, height: 2500 }), ctx());
    const bad = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 4000, height: 1000 }), ctx());
    expect(fit.total).toBeGreaterThan(bad.total);
    expect(bad.warnings.join(" ")).toContain("aggressive crop");
  });
  it("10. orientación compatible > incompatible", async () => {
    const engine = new VisualScoringEngine();
    const portrait = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 1080, height: 1350 }), ctx());
    const landscape = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 1920, height: 1080 }), ctx());
    expect(portrait.total).toBeGreaterThan(landscape.total);
  });
  it("11. crop pequeño > crop agresivo (breakdown aspectFit)", async () => {
    const engine = new VisualScoringEngine();
    const good = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 2160, height: 2700 }), ctx());
    const poor = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 4000, height: 1000 }), ctx());
    expect(good.breakdown.aspectFit.score).toBeGreaterThan(poor.breakdown.aspectFit.score);
  });
  it("12. unknown no genera datos ficticios: renormaliza pesos y avisa", async () => {
    const engine = new VisualScoringEngine();
    const score = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 2000, height: 3000 }), ctx({ negativeSpaceSide: "left" }));
    expect(score.breakdown.subjectPosition).toEqual({ score: 0, max: 0 });
    expect(score.breakdown.negativeSpace.max).toBe(0);
    expect(score.warnings.join(" ")).toContain("pixel analysis");
    // los max de los criterios conocidos suman ~100
    const maxSum = Object.values(score.breakdown).reduce((s, c) => s + c.max, 0);
    expect(maxSum).toBeCloseTo(100, 0);
  });
  it("minimumResolution incumplida → warning + cap", async () => {
    const engine = new VisualScoringEngine();
    const score = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 400, height: 300 }), ctx({ minimumResolution: { width: 1000, height: 1000 } }));
    expect(score.warnings.join(" ")).toContain("minimum resolution");
    expect(score.breakdown.resolution.score).toBeLessThanOrEqual(15);
  });
  it("scoreResolution: escala > 1.5 penaliza fuerte", async () => {
    const f = await new HeuristicVisualAnalyzer().analyze({ width: 500, height: 400 });
    expect(scoreResolution(f, ctx()).score).toBeLessThanOrEqual(10);
  });
});

describe("Roles", () => {
  it("13-15. contexto hero: pesos, reasons y warnings correctos", async () => {
    const engine = new VisualScoringEngine();
    const score = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 2000, height: 3000 }), ctx({ preferredPosition: "right" }));
    expect(score.breakdown.subjectPosition.max).toBe(0); // unknown renormalizado
    expect(score.reasons.join(" ")).toContain("portrait orientation matches");
    expect(score.warnings.join(" ")).toContain("subject position unavailable");
  });
  it("14b. weights por rol: hero y background distintos y suma 100", () => {
    for (const [role, w] of Object.entries(ROLE_WEIGHTS)) {
      const sum = Object.values(w).reduce((s, n) => s + n, 0);
      expect(sum).toBe(100);
      void role;
    }
    expect(ROLE_WEIGHTS.hero.resolution).not.toBe(ROLE_WEIGHTS.background.resolution);
  });
  it("16. warning de transparencia en metadata-only si el rol la requiere", async () => {
    const engine = new VisualScoringEngine();
    const score = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 1000, height: 1000 }), ctx({ role: "hero", requiresTransparency: true }));
    expect(score.warnings.join(" ")).toContain("transparency cannot be verified");
  });
});

describe("Background / full-bleed", () => {
  it("17-18. background full-bleed tolera orientación distinta pero valora cobertura", async () => {
    const engine = new VisualScoringEngine();
    const ctxBg = ctx({ role: "background" });
    const wide = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 4000, height: 1500 }), ctxBg);
    const small = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 900, height: 700 }), ctxBg);
    expect(wide.reasons.join(" ")).toContain("full-bleed");
    expect(wide.total).toBeGreaterThan(small.total);
  });
  it("background: composition describe compatibilidad full-bleed", async () => {
    const engine = new VisualScoringEngine();
    const score = await engine.score(await new HeuristicVisualAnalyzer().analyze({ width: 2160, height: 2700 }), ctx({ role: "background" }));
    expect(score.reasons.join(" ")).toContain("full-bleed usage");
  });
});

describe("Ranking", () => {
  const ranker = new CandidateRanker();
  const ctxHero = ctx();

  it("19-21. orden DESC, lista vacía y un candidato", async () => {
    expect(await ranker.rank([], ctxHero)).toEqual([]);
    const single = await ranker.rank([candidate("pexels-1", 2000, 3000, 1)], ctxHero);
    expect(single).toHaveLength(1);
    const ranked = await ranker.rank(
      [
        candidate("pexels-B", 4000, 1000, 2),
        candidate("pexels-A", 2000, 3000, 1),
        candidate("pexels-C", 1080, 1350, 3),
      ],
      ctxHero,
    );
    expect(ranked[0].score.total).toBeGreaterThanOrEqual(ranked[1].score.total);
    expect(ranked[1].score.total).toBeGreaterThanOrEqual(ranked[2].score.total);
    // el ejemplo real del brief: A (2000x3000) > C (1080x1350) > B (4000x1000)
    expect(ranked.map((r) => r.candidate.result.id)).toEqual(["pexels-A", "pexels-C", "pexels-B"]);
  });
  it("20b. empate determinista (misma imagen por providerAssetId → dedupe; ids distintos → orden estable)", async () => {
    const tied = [
      candidate("pexels-x", 2000, 3000, 9),
      candidate("pexels-y", 2000, 3000, 9), // mismo asset → dedupe
    ];
    expect(dedupe(tied)).toHaveLength(1);
    const distinct = await ranker.rank(
      [candidate("pexels-b", 2000, 3000, 21), candidate("pexels-a", 2000, 3000, 22)],
      ctxHero,
    );
    // empate total → desempate determinista por candidateId
    expect(distinct.map((r) => r.candidate.result.id)).toEqual(["pexels-a", "pexels-b"]);
  });
  it("22. ranked incluye reasons/warnings derivados", async () => {
    const [r] = await ranker.rank([candidate("pexels-1", 4000, 1000, 1)], ctxHero);
    expect(r.score.reasons.length + r.score.warnings.length).toBeGreaterThan(0);
    expect(r.features.subjectPosition).toBe("unknown");
  });
  it("sideFromPosition mapea posiciones del plan", () => {
    expect(sideFromPosition("right")).toBe("right");
    expect(sideFromPosition("bottom-left")).toBe("left");
    expect(sideFromPosition("top-right")).toBe("right");
    expect(sideFromPosition("center")).toBeNull();
  });
  it("effectiveWeights renormaliza a 100", () => {
    const eff = effectiveWeights(ROLE_WEIGHTS.hero, {
      resolution: true, aspectFit: true, orientation: true, composition: true, subjectPosition: false, negativeSpace: false,
    });
    const sum = eff.reduce((s, e) => s + e.weight, 0);
    expect(sum).toBeCloseTo(100, 0);
  });
});

describe("ReferenceProfile", () => {
  it("23. perfil inexistente → null (no inventa)", async () => {
    expect(await new StaticReferenceProfileLoader().load("bafut")).toBeNull();
  });
  it("24. perfil existente → carga estática", async () => {
    const { mkdtemp, mkdir, writeFile, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const root = await mkdtemp(path.join(tmpdir(), "bafut-ref-"));
    try {
      const dir = path.join(root, "bafut", "references");
      await mkdir(dir, { recursive: true });
      await writeFile(
        path.join(dir, "profile.json"),
        JSON.stringify({ preferredSubjectPlacement: "right", overlayUsage: { gradient: true, typicalOpacity: 0.8 }, notes: "El Reflector en la Cancha" }),
      );
      const profile = await new StaticReferenceProfileLoader(root).load("bafut");
      expect(profile?.source).toBe("static");
      expect(profile?.preferredSubjectPlacement).toBe("right");
      expect(profile?.overlayUsage?.typicalOpacity).toBe(0.8);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it("25. el perfil no toca brand.json (loadBrand sigue intacto)", async () => {
    const { loadBrand } = await import("../composition/brand");
    const brand = await loadBrand("bafut");
    expect(brand.colors["flood"]).toBe("#FFD25A"); // la marca manda
  });
  it("contextFromPlan deriva contexto del plan sin duplicar info", () => {
    const c = contextFromPlan({ canvas: { width: 1080, height: 1350 } }, { role: "hero", position: "right" });
    expect(c).toMatchObject({ role: "hero", targetWidth: 1080, targetHeight: 1350, preferredPosition: "right" });
  });
});

describe("MCP · rank_image_candidates", () => {
  it("26-28. ranking válido vía handler (sin red, sin fs)", async () => {
    const ctx = await createContext({ providers: [] });
    const input = RankImageCandidatesInput.parse({
      candidates: [
        { candidateId: "pexels-A", provider: "pexels", providerAssetId: "1", width: 2000, height: 3000 },
        { candidateId: "pexels-B", provider: "pexels", providerAssetId: "2", width: 4000, height: 1000 },
      ],
      context: { role: "hero", targetWidth: 1080, targetHeight: 1350, preferredPosition: "right" },
    });
    const out = await handleRankImageCandidates(ctx, input);
    expect(out.ranked).toHaveLength(2);
    expect(out.ranked[0].candidateId).toBe("pexels-A");
    expect(out.ranked[0].score).toBeGreaterThan(out.ranked[1].score);
    expect(out.ranked[1].warnings.join(" ")).toContain("aggressive crop");
    expect(out.note).toContain("unknown");
  });
  it("29. input inválido rechazado por schema", () => {
    expect(() => RankImageCandidatesInput.parse({ candidates: [], context: { role: "hero", targetWidth: 1080, targetHeight: 1350 } })).toThrow();
    expect(() => RankImageCandidatesInput.parse({ candidates: [{ candidateId: "a", provider: "pexels", width: -5, height: 10 }], context: { role: "hero", targetWidth: 1080, targetHeight: 1350 } })).toThrow();
    expect(() => RankImageCandidatesInput.parse({ candidates: [{ candidateId: "a", provider: "pexels", width: 10, height: 10 }], context: { role: "makemagic", targetWidth: 1080, targetHeight: 1350 } })).toThrow();
  });
  it("30-32. sin red/fs/shell: el handler no usa ctx (solo funciones puras)", async () => {
    const ctx = await createContext({ providers: [] });
    const spyCtx = new Proxy(ctx, {
      get(target, prop) {
        if (prop === "assetService" || prop === "searchEngine" || prop === "assetProcessor") {
          throw new Error("rank_image_candidates no debe tocar servicios de red/filesystem");
        }
        return Reflect.get(target, prop);
      },
    });
    const input = RankImageCandidatesInput.parse({
      candidates: [{ candidateId: "a", provider: "pexels", providerAssetId: "1", width: 1000, height: 1000 }],
      context: { role: "hero", targetWidth: 1080, targetHeight: 1350 },
    });
    const out = await handleRankImageCandidates(spyCtx as never, input);
    expect(out.ranked).toHaveLength(1);
  });
});
