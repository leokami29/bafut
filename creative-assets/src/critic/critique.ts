import { createHash } from "node:crypto";
import path from "node:path";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { CriticInput, CritiqueIteration, CritiqueReport } from "./types";
import { critiqueStructure, scoreReport } from "./structural-critic";
import { deriveBaseEvidence, deriveRenderedEvidence } from "./rendered-critic";
import { RenderedVisualAnalysis } from "../visual/analyzers/types";

/**
 * VisualCritic (fachada). Combina evidencia ESTRUCTURAL + VISUAL:
 * - StructuralCritic: CompositionPlan (fase 8, intacto).
 * - LocalRenderedVisualAnalyzer: PNG renderizado (fase 9), opcional.
 * Categorías sin evidencia → unknown (max 0), renormalización del overallScore.
 * El critic NUNCA modifica Penpot, archivos (salvo persistencia de iteraciones)
 * ni ejecuta código: solo analiza.
 */

export interface VisualCritic {
  critique(input: CriticInput): Promise<CritiqueReport>;
}

export class DefaultCritic implements VisualCritic {
  async critique(input: CriticInput): Promise<CritiqueReport> {
    const { issues: structuralIssues, strengths } = critiqueStructure(input.plan, input.brand ?? null, input.referenceProfile ?? null);
    const issues = [...structuralIssues];

    let renderedAnalysis: RenderedVisualAnalysis | undefined = input.renderedAnalysis;
    if (!renderedAnalysis && input.rendered && input.renderedAnalyzer) {
      if ("analyzeFull" in input.renderedAnalyzer && typeof input.renderedAnalyzer.analyzeFull === "function") {
        renderedAnalysis = await (input.renderedAnalyzer as { analyzeFull(d: Uint8Array, m: string): Promise<RenderedVisualAnalysis> }).analyzeFull(input.rendered.data, input.rendered.mimeType);
      }
    }

    const applied: CritiqueReport["applied"] = ["structural"];
    if (input.brand) applied.push("brand");
    if (input.referenceProfile) applied.push("reference");

    if (renderedAnalysis) {
      const evidence = deriveRenderedEvidence(input.plan, renderedAnalysis);
      issues.push(...evidence.issues);
      strengths.push(...evidence.strengths);
      applied.push("rendered");
    } else if (input.rendered && input.renderedAnalyzer) {
      const base = await input.renderedAnalyzer.analyze(input.rendered);
      issues.push(...deriveBaseEvidence(base).issues);
      applied.push("rendered");
    }

    const scored = scoreReport(input.plan, issues, strengths, {
      hasBrand: Boolean(input.brand),
      hasProfile: Boolean(input.referenceProfile),
    });

    // fusionar updates de categorías visuales: SUMAN a la evidencia estructural
    // (mismo criterio, dos fuentes), nunca la descartan.
    const mergeCategory = (key: string, update: { score: number; max: number; source: "pixel" | "unknown" }) => {
      if (update.max <= 0) return;
      const existing = scored.categories[key];
      scored.categories[key] = existing && existing.max > 0
        ? { score: existing.score + update.score, max: existing.max + update.max, source: "pixel" }
        : { ...update, source: "pixel" };
    };
    if (renderedAnalysis) {
      const evidence = deriveRenderedEvidence(input.plan, renderedAnalysis);
      for (const [key, update] of Object.entries(evidence.categoryUpdates)) mergeCategory(key, update);
      scored.overallScore = recomputeOverall(scored.categories);
    } else if (input.rendered && input.renderedAnalyzer) {
      const base = await input.renderedAnalyzer.analyze(input.rendered);
      const evidence = deriveBaseEvidence(base);
      for (const [key, update] of Object.entries(evidence.categoryUpdates)) mergeCategory(key, update);
      scored.overallScore = recomputeOverall(scored.categories);
    }

    return {
      overallScore: scored.overallScore,
      status: scored.status,
      issues,
      strengths,
      nextActions: scored.nextActions.length ? scored.nextActions : ["composition is structurally sound"],
      categories: scored.categories,
      applied,
    };
  }
}

/** Recalcula el overall (media de categorías con evidencia; unknown excluidas). */
function recomputeOverall(categories: CritiqueReport["categories"]): number {
  const evidenced = Object.values(categories).filter((c) => c.max > 0);
  if (evidenced.length === 0) return 0;
  return Math.round(evidenced.reduce((s, c) => s + (c.score / c.max) * 100, 0) / evidenced.length);
}

/** Fingerprint determinista: plan + marca + perfil + features visuales del render. */
export function critiqueFingerprint(plan: unknown, brandId?: string, profileId?: string, visualFeatures?: unknown): string {
  const basis = JSON.stringify({
    plan,
    brandId: brandId ?? null,
    profileId: profileId ?? null,
    visual: visualFeatures ? stableStringify(visualFeatures) : null,
  });
  return createHash("sha256").update(basis).digest("hex").slice(0, 16);
}

/** JSON con claves ordenadas (determinismo en objetos con orden variable). */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

const campaignsRoot = () => path.resolve(process.cwd(), "creative-assets", "campaigns");

/** Guarda una iteración con diff contra la previa + latest.json. */
export async function saveCritiqueIteration(
  campaignId: string,
  report: CritiqueReport,
  fingerprint: string,
  iteration: number,
  accepted: string[] = [],
  resolved: string[] = [],
  visualSummary?: CritiqueIteration["visualSummary"],
): Promise<string> {
  const dir = path.join(campaignsRoot(), campaignId, "critique");
  await mkdir(dir, { recursive: true });
  const previous = await loadIterationFile(dir, iteration - 1);
  const prevIds = new Set((previous?.report.issues ?? []).map((i) => i.id));
  const currentIds = new Set(report.issues.map((i) => i.id));
  // resumen visual derivado del reporte si el caller no lo aporta
  const summary: CritiqueIteration["visualSummary"] = visualSummary ?? (report.applied.includes("rendered")
    ? {
        source: "local-pixel-v1",
        contrastScore: catRatio(report, "readability"),
        visualDensity: catRatio(report, "composition") !== null
          ? { score: catRatio(report, "composition") as number, level: (catRatio(report, "composition") as number) > 0.66 ? "high" : (catRatio(report, "composition") as number) > 0.33 ? "medium" : "low" }
          : null,
        whitespaceRatio: null,
        balanceScore: catRatio(report, "alignment"),
      }
    : undefined);
  const entry: CritiqueIteration = {
    iteration,
    timestamp: new Date().toISOString(),
    fingerprint,
    previousFingerprint: previous?.fingerprint,
    report,
    acceptedIssues: accepted,
    resolvedIssues: resolved,
    newIssues: report.issues.map((i) => i.id).filter((id) => !prevIds.has(id)),
    resolvedIssuesPrevious: previous ? [...prevIds].filter((id) => !currentIds.has(id)) : undefined,
    visualSummary: summary,
  };
  const file = path.join(dir, `iteration-${iteration}.json`);
  await writeFile(file, JSON.stringify(entry, null, 2), "utf8");
  await writeFile(path.join(dir, "latest.json"), JSON.stringify(entry, null, 2), "utf8");
  return file;
}

function catRatio(report: CritiqueReport, key: string): number | null {
  const c = report.categories[key];
  return c && c.max > 0 ? c.score / c.max : null;
}

async function loadIterationFile(dir: string, n: number): Promise<CritiqueIteration | null> {
  if (n < 1) return null;
  try {
    return JSON.parse(await readFile(path.join(dir, `iteration-${n}.json`), "utf8")) as CritiqueIteration;
  } catch {
    return null;
  }
}

/** Lista las iteraciones guardadas de una campaña. */
export async function listCritiqueIterations(campaignId: string): Promise<CritiqueIteration[]> {
  const dir = path.join(campaignsRoot(), campaignId, "critique");
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const out: CritiqueIteration[] = [];
  for (const f of files.filter((f) => /^iteration-\d+\.json$/.test(f)).sort()) {
    try {
      out.push(JSON.parse(await readFile(path.join(dir, f), "utf8")) as CritiqueIteration);
    } catch {
      // ignorar corruptos
    }
  }
  return out;
}
