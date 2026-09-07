import { z } from "zod";
import { McpApplicationContext } from "../context";
import { CandidateRanker } from "../../visual/candidate-ranker";
import { VisualScoringContext } from "../../visual/types";

export const RankImageCandidatesInput = z.object({
  candidates: z
    .array(
      z.object({
        candidateId: z.string().trim().min(1).max(80),
        provider: z.string().regex(/^[a-z0-9]+$/i).max(30),
        providerAssetId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(64).optional(),
        width: z.number().int().min(1).max(50000),
        height: z.number().int().min(1).max(50000),
        aspectRatio: z.number().min(0.01).max(100).optional(),
      }),
    )
    .min(1)
    .max(50),
  context: z.object({
    role: z.enum(["background", "hero", "decorative", "texture", "foreground", "logo"]),
    targetWidth: z.number().int().min(64).max(8000),
    targetHeight: z.number().int().min(64).max(8000),
    preferredPosition: z
      .enum(["full", "top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"])
      .optional(),
    negativeSpaceSide: z.enum(["left", "right", "top", "bottom"]).optional(),
    minimumResolution: z.object({ width: z.number().int().min(1), height: z.number().int().min(1) }).optional(),
    requiresTransparency: z.boolean().optional(),
  }),
});

export type RankImageCandidatesInputType = z.infer<typeof RankImageCandidatesInput>;

export async function handleRankImageCandidates(_ctx: McpApplicationContext, input: RankImageCandidatesInputType) {
  // candidatos como descriptors mínimos (sin descargas, sin red, sin filesystem)
  const candidates = input.candidates.map((c) => ({
    result: {
      id: c.candidateId,
      provider: c.provider,
      width: c.width,
      height: c.height,
      aspectRatio: c.aspectRatio,
      metadata: c.providerAssetId !== undefined ? { pexels_id: c.providerAssetId } : undefined,
    },
  }));
  const context: VisualScoringContext = {
    role: input.context.role,
    targetWidth: input.context.targetWidth,
    targetHeight: input.context.targetHeight,
    preferredPosition: input.context.preferredPosition,
    negativeSpaceSide: input.context.negativeSpaceSide,
    minimumResolution: input.context.minimumResolution,
    requiresTransparency: input.context.requiresTransparency,
  };

  const ranker = new CandidateRanker();
  const ranked = await ranker.rank(candidates as never, context);

  return {
    role: context.role,
    target: { width: context.targetWidth, height: context.targetHeight },
    ranked: ranked.map((r) => ({
      candidateId: r.candidate.result.id,
      score: r.score.total,
      breakdown: r.score.breakdown,
      reasons: r.score.reasons,
      warnings: r.score.warnings,
      features: {
        width: r.features.width,
        height: r.features.height,
        orientation: r.features.orientation,
        megapixels: r.features.megapixels,
        crop: r.score.crop,
        source: r.features.source,
        subjectPosition: r.features.subjectPosition,
        negativeSpace: r.features.negativeSpace,
      },
    })),
    note: "Scoring basado en metadata (dimensiones/ratio). La posición del sujeto y el espacio negativo requieren análisis de píxeles: se reportan como unknown y los pesos se renormalizan.",
  };
}
