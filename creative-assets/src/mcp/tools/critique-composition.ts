import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";
import { CompositionPlanSchema } from "./resolve-asset-plan";
import { DefaultCritic, critiqueFingerprint, saveCritiqueIteration } from "../../critic/critique";
import { StaticReferenceProfileLoader } from "../../visual/reference-profile";
import { LocalRenderedVisualAnalyzer } from "../../visual/analyzers/local-vision-analyzer";
import { resolveRenderedImagePath } from "../../composition/campaign";
import { readFile } from "node:fs/promises";

export const CritiqueCompositionInput = z.object({
  compositionPlan: CompositionPlanSchema,
  brandId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
  /** Perfil de referencia estático (brands/<id>/references/profile.json). */
  referenceProfileBrandId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
  /** Iteración para el loop (persistencia en campaigns/<id>/critique/). */
  campaignId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
  iteration: z.number().int().min(1).max(100).optional(),
  /** PNG renderizado: DEBE estar dentro de campaigns/<campaignId>/ (contención validada). */
  renderedImagePath: z.string().trim().min(1).max(500).optional(),
  includeVisualAnalysis: z.boolean().optional(),
});

export type CritiqueCompositionInputType = z.infer<typeof CritiqueCompositionInput>;

export async function handleCritiqueComposition(ctx: McpApplicationContext, input: CritiqueCompositionInputType) {
  const plan = input.compositionPlan as unknown as import("../../composition/types").CompositionPlan;

  let brand = null;
  if (input.brandId) {
    try {
      brand = await ctx.loadBrand(input.brandId);
    } catch {
      throw new McpToolError("BRAND_NOT_FOUND", `Marca "${input.brandId}" no encontrada (brands/<id>/brand.json).`);
    }
  }

  let profile = null;
  if (input.referenceProfileBrandId) {
    profile = await new StaticReferenceProfileLoader().load(input.referenceProfileBrandId);
  }

  // ---- análisis visual local (solo con ruta contenida en la campaña) ----
  let rendered: { data: Uint8Array; mimeType: string } | undefined;
  if (input.renderedImagePath) {
    if (!input.campaignId) {
      throw new McpToolError("INVALID_INPUT", "renderedImagePath requiere campaignId (la imagen debe vivir en campaigns/<id>/).");
    }
    if (input.includeVisualAnalysis === false) {
      throw new McpToolError("INVALID_INPUT", "renderedImagePath requiere includeVisualAnalysis=true o ausente (default true).");
    }
    const abs = await resolveRenderedImagePath(input.campaignId, input.renderedImagePath).catch((err: Error) => {
      throw new McpToolError("INVALID_INPUT", err.message);
    });
    let data: Buffer;
    try {
      data = await readFile(abs);
    } catch {
      throw new McpToolError("INVALID_INPUT", `No se pudo leer la imagen renderizada en campaigns/${input.campaignId}/.`);
    }
    rendered = { data, mimeType: "image/png" };
  }

  const report = await new DefaultCritic().critique({
    plan,
    brand,
    referenceProfile: profile,
    rendered,
    renderedAnalyzer: rendered ? new LocalRenderedVisualAnalyzer() : undefined,
  });

  const fingerprint = critiqueFingerprint(
    plan,
    input.brandId,
    input.referenceProfileBrandId,
    report.applied.includes("rendered") ? visualHash(report) : undefined,
  );

  let savedIteration: string | undefined;
  if (input.campaignId && input.iteration) {
    savedIteration = await saveCritiqueIteration(input.campaignId, report, fingerprint, input.iteration, [], [], report.applied.includes("rendered") ? visualSummaryFrom(report) : undefined);
  }

  return {
    fingerprint,
    report,
    savedIteration,
    note: "El critic NO modifica Penpot ni archivos: solo analiza y propone. El agente decide aceptar/ignorar/modificar.",
  };
}

/** Hash determinista de las features visuales (para el fingerprint). */
function visualHash(report: import("../../critic/types").CritiqueReport): unknown {
  const c = report.categories;
  return {
    readability: c["readability"]?.score ?? null,
    composition: c["composition"]?.score ?? null,
    spacing: c["spacing"]?.score ?? null,
    alignment: c["alignment"]?.score ?? null,
  };
}

function visualSummaryFrom(report: import("../../critic/types").CritiqueReport) {
  return {
    source: "local-pixel-v1",
    contrastScore: report.categories["readability"]?.score !== undefined ? report.categories["readability"].score / 100 : null,
    visualDensity: report.categories["composition"] ? { score: report.categories["composition"].score / 100, level: (report.categories["composition"].score > 66 ? "high" : report.categories["composition"].score > 33 ? "medium" : "low") } : null,
    whitespaceRatio: null,
    balanceScore: report.categories["alignment"] ? report.categories["alignment"].score / 100 : null,
  };
}
