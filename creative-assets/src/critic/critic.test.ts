import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { critiqueStructure, scoreReport } from "./structural-critic";import { DefaultCritic, critiqueFingerprint } from "./critique";
import { loadBrand } from "../composition/brand";
import { CompositionPlan } from "../composition/types";

const FIXTURES = path.resolve(process.cwd(), "creative-assets", "fixtures", "critic");
async function fixture(name: string): Promise<CompositionPlan> {
  return JSON.parse(await readFile(path.join(FIXTURES, name), "utf8")) as CompositionPlan;
}
const brand = await loadBrand("bafut");

describe("StructuralCritic", () => {
  it("healthy: sin issues de severidad alta y con strengths", async () => {
    const plan = await fixture("healthy-composition.json");
    const { issues, strengths } = critiqueStructure(plan, brand, null);
    expect(issues.filter((i) => i.severity === "high" || i.severity === "critical")).toEqual([]);
    expect(strengths.join(" ")).toContain("safe area");
    expect(strengths.join(" ")).toContain("brand");
  });

  it("1. missing headline → critical", async () => {
    const plan = await fixture("missing-headline.json");
    const { issues } = critiqueStructure(plan, null, null);
    const issue = issues.find((i) => i.id === "missing-headline");
    expect(issue?.severity).toBe("critical");
    expect(issue?.affectedLayerIds).toEqual(["headline"]);
  });

  it("2-3. missing CTA (high) y logo (low) en plan sin ellos", async () => {
    const plan: CompositionPlan = {
      canvas: { width: 1080, height: 1350 },
      layers: [
        { type: "image", role: "background", asset: "a" },
        { type: "text", role: "headline", content: "X" },
      ],
      assets: [],
    };
    const { issues } = critiqueStructure(plan, null, null);
    expect(issues.find((i) => i.id === "missing-cta")?.severity).toBe("high");
    expect(issues.find((i) => i.id === "missing-logo")?.severity).toBe("low");
  });

  it("4-5. safe area inválida detectada y válida sin issues", async () => {
    const bad = await fixture("bad-safe-area.json");
    const { issues } = critiqueStructure(bad, null, null);
    const headline = issues.find((i) => i.id === "safe-area-headline");
    expect(headline?.severity).toBe("high");
    expect(headline?.affectedLayerIds).toEqual(["headline"]);
    const cta = issues.find((i) => i.id === "safe-area-cta");
    expect(cta?.severity).toBe("high");
    const healthy = await fixture("healthy-composition.json");
    expect(critiqueStructure(healthy, brand, null).issues.filter((i) => i.category === "safe_area")).toEqual([]);
  });

  it("6-7. jerarquía: headline pequeño vs CTA → high; subheadline cercana → medium", async () => {
    const plan = await fixture("hierarchy-problem.json");
    const { issues } = critiqueStructure(plan, null, null);
    expect(issues.find((i) => i.id === "hierarchy-headline-cta")?.severity).toBe("high");
    expect(issues.find((i) => i.id === "hierarchy-headline-sub")?.severity).toBe("medium");
  });

  it("8-10. overlaps: hero-cta severo → problem(high); moderados → warning", async () => {
    const plan = await fixture("overlap-problem.json");
    const { issues } = critiqueStructure(plan, null, null);
    const heroCta = issues.find((i) => i.id === "overlap-hero-cta");
    expect(heroCta?.severity).toBe("high");
    const headlineHero = issues.find((i) => i.id === "overlap-headline-hero");
    if (headlineHero) expect(["medium", "high"]).toContain(headlineHero.severity);
  });

  it("11. sin capas de imagen → missing-background high", () => {
    const plan: CompositionPlan = {
      canvas: { width: 1080, height: 1350 },
      layers: [{ type: "text", role: "headline", content: "X" }],
      assets: [],
    };
    const { issues } = critiqueStructure(plan, null, null);
    expect(issues.find((i) => i.id === "missing-background")?.severity).toBe("high");
  });

  it("12. demasiados elementos dominantes → medium", () => {
    const plan: CompositionPlan = {
      canvas: { width: 1080, height: 1350 },
      layers: [
        { type: "image", role: "background", asset: "a" },
        { type: "image", role: "hero", asset: "b" },
        { type: "image", role: "hero", asset: "c" },
      ],
      assets: [],
    };
    const { issues } = critiqueStructure(plan, null, null);
    expect(issues.find((i) => i.id === "composition-too-many-dominant")?.severity).toBe("medium");
  });

  it("orden inválido: background no primero → medium", async () => {
    const plan = await fixture("overlap-problem.json");
    const shuffled: CompositionPlan = { ...plan, layers: [plan.layers[1], plan.layers[0], ...plan.layers.slice(2)] };
    const { issues } = critiqueStructure(shuffled, null, null);
    expect(issues.find((i) => i.id === "order-background")).toBeTruthy();
  });

  it("17-19. brand: tokens y fuentes inválidas detectados; válidos → strength", async () => {
    const healthy = await fixture("healthy-composition.json");
    const { issues, strengths } = critiqueStructure(healthy, brand, null);
    expect(issues.filter((i) => i.category === "brand_consistency")).toEqual([]);
    expect(strengths.join(" ")).toContain("brand");

    const badPlan: CompositionPlan = {
      ...healthy,
      layers: [
        ...healthy.layers,
        { type: "text", role: "body", content: "x", colorFromBrand: "no-existe", fontFamily: "Comic Sans" },
      ],
    };
    const badIssues = critiqueStructure(badPlan, brand, null).issues;
    expect(badIssues.find((i) => i.id === "brand-token-body")?.severity).toBe("medium");
    expect(badIssues.find((i) => i.id === "brand-font-body")?.severity).toBe("low");
  });
});

describe("Reference consistency", () => {
  it("21-22. perfil ausente → sin issues de referencia; presente con mismatch → medium", async () => {
    const plan = await fixture("reference-mismatch.json");
    const absent = critiqueStructure(plan, brand, null);
    expect(absent.issues.filter((i) => i.category === "reference_consistency")).toEqual([]);

    const profile = { brandId: "bafut", source: "static" as const, preferredSubjectPlacement: "right" as const };
    const present = critiqueStructure(plan, brand, profile);
    const issue = present.issues.find((i) => i.id === "reference-hero-placement");
    expect(issue?.severity).toBe("medium");
    expect(issue?.affectedLayerIds).toEqual(["hero"]);
  });
  it("24. perfil sin datos → no inventa crítica", async () => {
    const plan = await fixture("healthy-composition.json");
    const profile = { brandId: "bafut", source: "static" as const };
    const { issues } = critiqueStructure(plan, brand, profile);
    expect(issues.filter((i) => i.category === "reference_consistency")).toEqual([]);
  });
});

describe("Scoring del reporte", () => {
  it("13-14. determinista y 0–100", async () => {
    const plan = await fixture("hierarchy-problem.json");
    const { issues } = critiqueStructure(plan, null, null);
    const a = scoreReport(plan, issues, []);
    const b = scoreReport(plan, issues, []);
    expect(a).toEqual(b);
    expect(a.overallScore).toBeGreaterThanOrEqual(0);
    expect(a.overallScore).toBeLessThanOrEqual(100);
  });
  it("15-16. unknown excluido (asset_quality/alignment max 0) y categorías explicables", async () => {
    const plan = await fixture("healthy-composition.json");
    const { issues } = critiqueStructure(plan, brand, null);
    const scored = scoreReport(plan, issues, [], { hasBrand: true });
    expect(scored.categories["asset_quality"]).toEqual({ score: 0, max: 0, source: "unknown" });
    expect(scored.categories["alignment"]).toEqual({ score: 0, max: 0, source: "unknown" });
    expect(scored.categories["safe_area"].source).toBe("structural");
    expect(scored.categories["brand_consistency"].source).toBe("brand");
  });
  it("healthy puntúa más alto que el problemático", async () => {
    const healthyStruct = critiqueStructure(await fixture("healthy-composition.json"), brand, null);
    const healthy = scoreReport(await fixture("healthy-composition.json"), healthyStruct.issues, healthyStruct.strengths, { hasBrand: true });
    const badStruct = critiqueStructure(await fixture("bad-safe-area.json"), null, null);
    const bad = scoreReport(await fixture("bad-safe-area.json"), badStruct.issues, badStruct.strengths, {});
    expect(healthy.overallScore).toBeGreaterThan(bad.overallScore);
  });
});


describe("DefaultCritic + fingerprint + iteraciones", () => {
  it("25-27. IDs deterministas y estructura del reporte", async () => {
    const plan = await fixture("bad-safe-area.json");
    const critic = new DefaultCritic();
    const report = await critic.critique({ plan, brand });
    const again = await critic.critique({ plan, brand });
    expect(report).toEqual(again); // mismo input → mismo reporte
    expect(report.issues.every((i) => /^[a-z0-9-]+$/.test(i.id))).toBe(true);
    expect(report.status).toBe("needs_revision");
    expect(report.nextActions.length).toBeGreaterThan(0);
    expect(report.applied).toContain("structural");
    expect(report.applied).toContain("brand");
  });
  it("36-37. fingerprint determinista y cambia con el plan", async () => {
    const plan = await fixture("healthy-composition.json");
    const f1 = critiqueFingerprint(plan, "bafut");
    const f2 = critiqueFingerprint(plan, "bafut");
    const f3 = critiqueFingerprint({ ...plan, backgroundColor: "#000000" }, "bafut");
    expect(f1).toBe(f2);
    expect(f1).not.toBe(f3);
    expect(f1).toMatch(/^[a-f0-9]{16}$/);
  });
  it("guarda y lista iteraciones (loop futuro)", async () => {
    const { saveCritiqueIteration, listCritiqueIterations } = await import("./critique");
    const { mkdtemp, rm } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const prevCwd = process.cwd();
    const root = await mkdtemp(path.join(tmpdir(), "bafut-crit-"));
    try {
      process.chdir(root);
      const report = await new DefaultCritic().critique({ plan: await fixture("healthy-composition.json"), brand });
      const file = await saveCritiqueIteration("test-camp", report, "abc123", 1, ["hierarchy-headline"], []);
      expect(file).toContain("iteration-1.json");
      const list = await listCritiqueIterations("test-camp");
      expect(list).toHaveLength(1);
      expect(list[0].acceptedIssues).toEqual(["hierarchy-headline"]);
    } finally {
      process.chdir(prevCwd);
      await rm(root, { recursive: true, force: true });
    }
  });
});
