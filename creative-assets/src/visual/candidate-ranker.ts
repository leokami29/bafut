import { ImageCandidate } from "../providers/types";
import { VisualAnalyzer, VisualScoringContext, RankedCandidate } from "./types";
import { HeuristicVisualAnalyzer } from "./heuristics";
import { VisualScoringEngine } from "./visual-scoring";

/**
 * CandidateRanker: ordena candidatos por score DESC con criterios de desempate
 * deterministas (score → resolución → providerAssetId → candidateId).
 * Deduplica por provider + providerAssetId (fallback candidateId).
 */

export interface CandidateRankerDeps {
  analyzer?: VisualAnalyzer;
  scoring?: VisualScoringEngine;
}

export class CandidateRanker {
  private analyzer: VisualAnalyzer;
  private scoring: VisualScoringEngine;

  constructor(deps: CandidateRankerDeps = {}) {
    this.analyzer = deps.analyzer ?? new HeuristicVisualAnalyzer();
    this.scoring = deps.scoring ?? new VisualScoringEngine();
  }

  async rank(candidates: ImageCandidate[], context: VisualScoringContext): Promise<RankedCandidate<ImageCandidate>[]> {
    const deduped = dedupe(candidates);
    const ranked: RankedCandidate<ImageCandidate>[] = [];
    for (const candidate of deduped) {
      const features = await this.analyzer.analyze({ width: candidate.result.width ?? 0, height: candidate.result.height ?? 0, aspectRatio: candidate.result.aspectRatio });
      const score = await this.scoring.score(features, context);
      ranked.push({ candidate, features, score });
    }
    return ranked.sort(compareRanked);
  }
}

export function dedupe(candidates: ImageCandidate[]): ImageCandidate[] {
  const seen = new Map<string, ImageCandidate>();
  for (const c of candidates) {
    const meta = c.result.metadata as Record<string, unknown> | undefined;
    const pid = typeof meta?.pexels_id === "number" || typeof meta?.pexels_id === "string" ? String(meta.pexels_id) : undefined;
    const key = pid ? `${c.result.provider}:${pid}` : c.result.id;
    if (!seen.has(key)) seen.set(key, c);
  }
  return [...seen.values()];
}

function compareRanked(a: RankedCandidate<ImageCandidate>, b: RankedCandidate<ImageCandidate>): number {
  if (b.score.total !== a.score.total) return b.score.total - a.score.total;
  const px = (r: RankedCandidate<ImageCandidate>) => (r.features.width ?? 0) * (r.features.height ?? 0);
  if (px(b) !== px(a)) return px(b) - px(a);
  const idA = a.candidate.result.id;
  const idB = b.candidate.result.id;
  return idA < idB ? -1 : idA > idB ? 1 : 0;
}
