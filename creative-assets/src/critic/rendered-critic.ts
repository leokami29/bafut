import { CriticIssue } from "./types";
import { RenderedVisualFeatures } from "./types";
import { RenderedVisualAnalysis } from "../visual/analyzers/types";

/**
 * Evidencia VISUAL derivada del render (fase 9).
 * Lenguaje probabilístico: las heurísticas nunca afirman lo que no ven.
 * Umbralés documentados en docs/visual-critic.md. Con confidence baja → no issue.
 */

const CONTRAST_LOW = 0.15;      // contraste global muy bajo (normalizado)
const DENSITY_HIGH = 0.8;       // densidad visual alta
const WHITESPACE_LOW = 0.08;    // casi sin zonas de respiro
const BALANCE_DEVIATION = 0.12; // desviación del centro de masa

export interface RenderedEvidence {
  issues: CriticIssue[];
  /** Actualizaciones de categorías (solo las con evidencia suficiente). */
  categoryUpdates: Record<string, { score: number; max: number; source: "pixel" | "unknown" }>;
  strengths: string[];
  summary: {
    source: string;
    contrastScore?: number | null;
    visualDensity?: { score: number; level: string } | null;
    whitespaceRatio?: number | null;
    balanceScore?: number | null;
  };
}

/** Deriva evidencia de la estructura rica (LocalRenderedVisualAnalyzer). */
export function deriveRenderedEvidence(plan: import("../composition/types").CompositionPlan, analysis: RenderedVisualAnalysis): RenderedEvidence {
  const issues: CriticIssue[] = [];
  const strengths: string[] = [];
  const categories: RenderedEvidence["categoryUpdates"] = {};

  // ---- contraste global (≠ legibilidad del texto: solo evidencia global) ----
  if (analysis.contrast.global < CONTRAST_LOW) {
    issues.push({
      id: "low-global-contrast",
      severity: "medium",
      category: "readability",
      message: `Possible low readability due to low global contrast (${analysis.contrast.global}).`,
      suggestion: "Increase separation between foreground and background elements.",
      affectedLayerIds: [],
    });
  }
  categories["readability"] = {
    score: Math.round(analysis.contrast.score * 100),
    max: 100,
    source: "pixel",
  };

  // ---- densidad visual ----
  if (analysis.visualDensity.score > DENSITY_HIGH) {
    issues.push({
      id: "high-visual-density",
      severity: "low",
      category: "composition",
      message: `The composition appears visually dense (${analysis.visualDensity.score}).`,
      suggestion: "Consider adding breathing room between elements.",
      affectedLayerIds: [],
    });
  }
  categories["composition"] = {
    score: Math.round(analysis.visualDensity.score * 100),
    max: 100,
    source: "pixel",
  };

  // ---- whitespace (estimación basada en píxeles) ----
  if (analysis.whitespace.confidence >= 0.5) {
    if (analysis.whitespace.ratio < WHITESPACE_LOW) {
      issues.push({
        id: "low-whitespace",
        severity: "low",
        category: "spacing",
        message: `The render appears to have very little visual breathing room (whitespace ratio ${analysis.whitespace.ratio}).`,
        suggestion: "Consider leaving more empty space around key elements.",
        affectedLayerIds: [],
      });
    } else {
      strengths.push(`visual breathing room present (whitespace ratio ${analysis.whitespace.ratio})`);
    }
    categories["spacing"] = {
      score: Math.round(Math.min(1, analysis.whitespace.ratio / 0.25) * 100),
      max: 100,
      source: "pixel",
    };
  }

  // ---- balance (evidencia; el plan/la marca deciden si asimetría es problema) ----
  if (analysis.balance.confidence >= 0.5) {
    if (analysis.balance.deviationX > BALANCE_DEVIATION || analysis.balance.deviationY > BALANCE_DEVIATION) {
      issues.push({
        id: "visual-imbalance",
        severity: "low",
        category: "alignment",
        message: `Visual energy is off-center (deviation X ${analysis.balance.deviationX}, Y ${analysis.balance.deviationY}).`,
        suggestion: "Review visual balance — asymmetry may be intentional; validate against the plan.",
        affectedLayerIds: [],
      });
    }
    categories["alignment"] = { score: Math.round(analysis.balance.score * 100), max: 100, source: "pixel" };
  }

  // ---- posible aglomeración de texto (heurística, NO OCR) ----
  if (analysis.textLikeRegions.length >= 6) {
    issues.push({
      id: "possible-text-crowding",
      severity: "low",
      category: "typography",
      message: "Several text-like regions appear visually crowded.",
      suggestion: "Review text spacing and grouping.",
      affectedLayerIds: [],
    });
  }

  // ---- legibilidad de texto: solo si hay regiones tipo texto Y contraste local bajo ----
  if (analysis.textLikeRegions.length > 0 && analysis.contrast.score < 0.3) {
    issues.push({
      id: "possible-low-readability",
      severity: "medium",
      category: "readability",
      message: "Text-like regions appear on a low-contrast area of the render.",
      suggestion: "Increase local contrast behind text regions.",
      affectedLayerIds: [],
    });
  }

  // strengths con evidencia
  if (analysis.contrast.score >= 0.5) strengths.push(`good global contrast (${analysis.contrast.score})`);
  if (analysis.visualDensity.level === "medium" || analysis.visualDensity.level === "low") strengths.push(`balanced visual density (${analysis.visualDensity.level})`);
  void plan;

  return {
    issues,
    categoryUpdates: categories,
    strengths,
    summary: {
      source: "local-pixel-v1",
      contrastScore: analysis.contrast.score,
      visualDensity: { score: analysis.visualDensity.score, level: analysis.visualDensity.level },
      whitespaceRatio: analysis.whitespace.ratio,
      balanceScore: analysis.balance.score,
    },
  };
}

/** Fallback: evidencia limitada desde la interfaz base (fase 8) sin análisis rico. */
export function deriveBaseEvidence(features: RenderedVisualFeatures): RenderedEvidence {
  const issues: CriticIssue[] = [];
  const categoryUpdates: RenderedEvidence["categoryUpdates"] = {};
  if (features.estimatedContrast !== null && features.estimatedContrast !== undefined && features.estimatedContrast < CONTRAST_LOW) {
    issues.push({
      id: "low-global-contrast",
      severity: "medium",
      category: "readability",
      message: `Possible low readability due to low global contrast (${features.estimatedContrast}).`,
      suggestion: "Increase separation between foreground and background elements.",
      affectedLayerIds: [],
    });
  }
  if (features.estimatedContrast !== null && features.estimatedContrast !== undefined) {
    categoryUpdates["readability"] = { score: Math.round(features.estimatedContrast * 100), max: 100, source: "pixel" };
  }
  if (features.balance !== null && features.balance !== undefined) {
    categoryUpdates["alignment"] = { score: Math.round(features.balance * 100), max: 100, source: "pixel" };
  }
  if (features.visualDensity !== null && features.visualDensity !== undefined) {
    categoryUpdates["composition"] = { score: Math.round(features.visualDensity * 100), max: 100, source: "pixel" };
  }
  return { issues, categoryUpdates, strengths: [], summary: { source: features.source } };
}
