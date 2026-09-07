import { CropCompatibility, Orientation, VisualFeatures, VisualScoringContext } from "./types";

/**
 * Heurísticas deterministas sobre METADATA (ancho/alto/ratio).
 * Nada de píxeles: subjectPosition y negativeSpace permanecen "unknown".
 */

export function orientationOf(width: number, height: number): Orientation {
  if (width === height) return "square";
  return width > height ? "landscape" : "portrait";
}

export function cropCompatibility(width: number, height: number, ctx: Pick<VisualScoringContext, "targetWidth" | "targetHeight">): CropCompatibility {
  const targetRatio = ctx.targetWidth / ctx.targetHeight;
  const candidateRatio = width / height;
  // fracción de píxeles descartados al hacer "cover" del target
  const discardFraction = candidateRatio >= targetRatio
    ? 1 - targetRatio / candidateRatio
    : 1 - candidateRatio / targetRatio;
  const level = discardFraction <= 0.1 ? "excellent" : discardFraction <= 0.25 ? "good" : discardFraction <= 0.45 ? "acceptable" : "poor";
  return { discardFraction: Math.round(discardFraction * 100) / 100, level };
}

/** Analizador heurístico: SOLO metadata. Prepara la interfaz para analyzers de visión. */
export class HeuristicVisualAnalyzer {
  readonly name = "heuristic-metadata";

  async analyze(input: { width: number; height: number; aspectRatio?: number }): Promise<VisualFeatures> {
    const aspectRatio = input.aspectRatio ?? input.width / input.height;
    return {
      width: input.width,
      height: input.height,
      aspectRatio: Math.round(aspectRatio * 1000) / 1000,
      orientation: orientationOf(input.width, input.height),
      megapixels: Math.round(((input.width * input.height) / 1_000_000) * 100) / 100,
      subjectPosition: "unknown",
      negativeSpace: "unknown",
      visualDensity: null,
      source: "metadata",
      analyzer: this.name,
    };
  }
}

/** Contexto derivado de un CompositionPlan (no duplica información del plan). */
export function contextFromPlan(
  plan: { canvas: { width: number; height: number } },
  layer: { role: string; position?: string },
  extra: Partial<VisualScoringContext> = {},
): VisualScoringContext {
  return {
    role: layer.role,
    targetWidth: plan.canvas.width,
    targetHeight: plan.canvas.height,
    preferredPosition: layer.position,
    ...extra,
  };
}
