import { CropCompatibility, VisualFeatures, VisualScore, VisualScoringContext } from "./types";
import { cropCompatibility } from "./heuristics";
import {
  effectiveWeights,
  meetsMinimumResolution,
  scoreAspectFit,
  scoreComposition,
  scoreNegativeSpace,
  scoreOrientation,
  scoreResolution,
  scoreSubjectPosition,
  weightsFor,
} from "./scoring-rules";

/**
 * VisualScoringEngine: scoring EXPLICABLE y determinista.
 * Misma entrada → mismo resultado. Sin random, sin red, sin píxeles inventados.
 */
export class VisualScoringEngine {
  async score(features: VisualFeatures, ctx: VisualScoringContext): Promise<VisualScore> {
    const crop = cropCompatibility(features.width, features.height, ctx);
    const weights = weightsFor(ctx.role);

    const resolution = scoreResolution(features, ctx);
    const aspectFit = scoreAspectFit(crop);
    const orientation = scoreOrientation(features, ctx);
    const composition = scoreComposition(crop, features, ctx);
    const subjectPosition = scoreSubjectPosition(features, ctx);
    const negativeSpace = scoreNegativeSpace(features, ctx);

    const reasons: string[] = [];
    const warnings: string[] = [];
    for (const r of [resolution.reason, aspectFit.reason, orientation.reason, composition.reason, subjectPosition.reason, negativeSpace.reason]) {
      if (r) reasons.push(r);
    }
    for (const w of [resolution.warning, aspectFit.warning, orientation.warning, composition.warning, subjectPosition.warning, negativeSpace.warning]) {
      if (w) warnings.push(w);
    }

    // mínimo de resolución exigido por el contexto: cap duro + warning
    if (!meetsMinimumResolution(features, ctx)) {
      warnings.push("candidate does not meet the minimum resolution required by the context");
      resolution.score = Math.min(resolution.score, 15);
      resolution.warning = "below minimum resolution required";
    }
    if (ctx.requiresTransparency && features.source === "metadata") {
      warnings.push("transparency cannot be verified before download (requires pixel analysis)");
    }

    const known = {
      resolution: true,
      aspectFit: true,
      orientation: true,
      composition: true,
      subjectPosition: subjectPosition.score !== null,
      negativeSpace: negativeSpace.score !== null,
    };
    const effective = effectiveWeights(weights, known);

    const raw: Record<string, number | null> = {
      resolution: resolution.score,
      aspectFit: aspectFit.score,
      orientation: orientation.score,
      composition: composition.score,
      subjectPosition: subjectPosition.score,
      negativeSpace: negativeSpace.score,
    };

    const breakdown = {} as VisualScore["breakdown"];
    let total = 0;
    for (const { criterion, weight } of effective) {
      const rawScore = raw[criterion] as number;
      const points = Math.round(((rawScore / 100) * weight) * 10) / 10;
      breakdown[criterion as keyof VisualScore["breakdown"]] = { score: points, max: Math.round(weight * 10) / 10 };
      total += points;
    }
    for (const criterion of ["subjectPosition", "negativeSpace"] as const) {
      if (!known[criterion] && weights[criterion] > 0) {
        breakdown[criterion] = { score: 0, max: 0 };
      }
    }

    return {
      total: Math.round(total) ,
      breakdown,
      reasons,
      warnings,
      features,
      crop,
    };
  }
}

export type { VisualFeatures, VisualScoringContext, CropCompatibility };
