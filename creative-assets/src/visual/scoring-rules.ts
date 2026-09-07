import { CropCompatibility, ScoreCriterion, ScoringWeights, SemanticSide, VisualFeatures, VisualScoringContext } from "./types";

/**
 * Reglas de scoring configurables. Pesos por rol (suma 100).
 * Criterio "unknown" ⇒ se EXCLUYE y los pesos se renormalizan sobre los
 * criterios conocidos (el total es honesto y explicable).
 */

export const ROLE_WEIGHTS: Record<string, ScoringWeights> = {
  hero: { resolution: 20, aspectFit: 15, orientation: 15, composition: 15, subjectPosition: 25, negativeSpace: 10 },
  background: { resolution: 30, aspectFit: 25, orientation: 20, composition: 25, subjectPosition: 0, negativeSpace: 0 },
  decorative: { resolution: 30, aspectFit: 25, orientation: 15, composition: 30, subjectPosition: 0, negativeSpace: 0 },
  texture: { resolution: 30, aspectFit: 25, orientation: 15, composition: 30, subjectPosition: 0, negativeSpace: 0 },
  foreground: { resolution: 25, aspectFit: 20, orientation: 15, composition: 25, subjectPosition: 15, negativeSpace: 0 },
  logo: { resolution: 40, aspectFit: 30, orientation: 30, composition: 0, subjectPosition: 0, negativeSpace: 0 },
};

export const DEFAULT_WEIGHTS: ScoringWeights = ROLE_WEIGHTS.hero;

export function weightsFor(role: string): ScoringWeights {
  return ROLE_WEIGHTS[role] ?? DEFAULT_WEIGHTS;
}

// ---------- criterios individuales (puros y deterministas) ----------

export function scoreResolution(features: VisualFeatures, ctx: VisualScoringContext): { score: number; reason?: string; warning?: string } {
  // escala necesaria para "cover" del target: <=1 significa que cubre
  const scale = Math.max(ctx.targetWidth / features.width, ctx.targetHeight / features.height);
  let score: number;
  let reason: string | undefined;
  let warning: string | undefined;
  if (scale <= 0.5) { score = 100; reason = "resolution comfortably exceeds target"; }
  else if (scale <= 0.75) { score = 95; reason = "resolution comfortably exceeds target"; }
  else if (scale <= 1) { score = 70; reason = "resolution covers target size"; }
  else if (scale <= 1.5) { score = 40; warning = "resolution may be insufficient (moderate upscale required)"; }
  else { score = 10; warning = "resolution insufficient for target size"; }
  return { score, reason, warning };
}

export function meetsMinimumResolution(features: VisualFeatures, ctx: VisualScoringContext): boolean {
  const min = ctx.minimumResolution;
  if (!min) return true;
  return features.width >= min.width && features.height >= min.height;
}

export function scoreAspectFit(crop: CropCompatibility): { score: number; reason?: string; warning?: string } {
  switch (crop.level) {
    case "excellent": return { score: 100, reason: "aspect ratio closely matches target" };
    case "good": return { score: 80, reason: "crop required is minimal" };
    case "acceptable": return { score: 55, reason: "moderate crop required" };
    case "poor": return { score: 20, warning: "aspect ratio requires aggressive crop" };
  }
}

export function scoreOrientation(features: VisualFeatures, ctx: VisualScoringContext): { score: number; reason?: string; warning?: string } {
  const targetOrientation = ctx.targetWidth === ctx.targetHeight ? "square" : ctx.targetWidth > ctx.targetHeight ? "landscape" : "portrait";
  const role = ctx.role;
  void role;
  // fondo/hero vertical en formatos sociales: portrait preferido
  if (features.orientation === targetOrientation) {
    return { score: 100, reason: `${features.orientation} orientation matches campaign format` };
  }
  // los roles full-bleed (background) toleran cualquier orientación con buen crop
  if (role === "background") {
    return { score: 70, reason: "orientation differs but full-bleed cover absorbs it" };
  }
  if (role === "texture" || role === "decorative") {
    return { score: 70, reason: "orientation differs but role tolerates crop" };
  }
  return { score: 35, warning: `unsupported orientation: ${features.orientation} for ${targetOrientation} target` };
}

export function scoreComposition(crop: CropCompatibility, features: VisualFeatures, ctx: VisualScoringContext): { score: number; reason?: string; warning?: string } {
  // composición genérica metadata-only: cuánto "respira" la imagen para el rol
  if (ctx.role === "background") {
    // full-bleed: preferir imágenes con margen para overlays y texto
    return crop.level === "excellent" || crop.level === "good"
      ? { score: 90, reason: "composition fits full-bleed usage" }
      : { score: 45, warning: "composition may fight with overlays/text after crop" };
  }
  if (ctx.role === "logo") {
    return { score: 80, reason: "logo assets are evaluated mainly by resolution and format" };
  }
  // hero/decorative: proporción entre resolución y crop como proxy de composición
  const score = Math.round(Math.min(90, 50 + (1 - crop.discardFraction) * 40));
  return crop.discardFraction <= 0.25
    ? { score, reason: "composition fits hero role" }
    : { score: Math.min(score, 45), warning: "composition compromised by required crop" };
}

export function scoreSubjectPosition(features: VisualFeatures, ctx: VisualScoringContext): { score: number | null; reason?: string; warning?: string } {
  if (features.subjectPosition === "unknown" || ctx.preferredPosition === undefined) {
    return { score: null, warning: "subject position unavailable without pixel analysis" };
  }
  const target = sideFromPosition(ctx.preferredPosition);
  if (target === null) return { score: null };
  if (features.subjectPosition === target) {
    return { score: 100, reason: `subject positioned on ${features.subjectPosition}` };
  }
  return { score: 25, warning: `subject on ${features.subjectPosition} but layout expects ${target}` };
}

export function scoreNegativeSpace(features: VisualFeatures, ctx: VisualScoringContext): { score: number | null; reason?: string; warning?: string } {
  if (features.negativeSpace === "unknown" || !ctx.negativeSpaceSide) {
    return { score: null, warning: "negative space unavailable without pixel analysis" };
  }
  if (features.negativeSpace === ctx.negativeSpaceSide) {
    return { score: 100, reason: `strong negative space on ${features.negativeSpace}` };
  }
  return { score: 25, warning: `negative space on ${features.negativeSpace}, layout expects ${ctx.negativeSpaceSide}` };
}

/** Convierte una posición semántica del plan en el lado relevante. */
export function sideFromPosition(position: string): SemanticSide | null {
  if (position.includes("right")) return "right";
  if (position.includes("left")) return "left";
  if (position === "top" || position.includes("top")) return "top";
  if (position === "bottom" || position.includes("bottom")) return "bottom";
  return null; // center/full/full-bleed no implican lado
}

/** Pesos renormalizados excluyendo criterios no determinables. */
export function effectiveWeights(
  weights: ScoringWeights,
  known: Record<ScoreCriterion, boolean>,
): Array<{ criterion: ScoreCriterion; weight: number }> {
  const entries = (Object.entries(weights) as Array<[ScoreCriterion, number]>)
    .filter(([criterion, weight]) => weight > 0 && known[criterion]);
  const total = entries.reduce((sum, [, w]) => sum + w, 0) || 1;
  return entries.map(([criterion, weight]) => ({ criterion, weight: (weight / total) * 100 }));
}
