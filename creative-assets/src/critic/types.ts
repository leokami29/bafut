/**
 * Visual Critic (Fase 8) — contratos.
 *
 * Dos tipos de crítica, claramente separados:
 *  A) STRUCTURAL: analiza el CompositionPlan (sin render).
 *  B) VISUAL: requeriría análisis del render (interfaz preparada, sin implementar).
 *
 * Principio: el critic nunca afirma una propiedad visual que no haya podido
 * observar o inferir de manera justificable. Las categorías sin evidencia se
 * reportan como source "unknown" y se excluyen del score.
 */

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type IssueCategory =
  | "hierarchy"
  | "composition"
  | "spacing"
  | "alignment"
  | "safe_area"
  | "typography"
  | "readability"
  | "brand_consistency"
  | "asset_quality"
  | "reference_consistency"
  | "missing_content"
  | "overlap";

export interface CriticAction {
  action: "move_layer" | "resize_layer" | "remove_layer" | "add_layer" | "review";
  targetLayerId?: string;
  suggestedPosition?: string;
  direction?: "increase" | "decrease";
  relativeAmount?: number;
}

export interface CriticIssue {
  /** ID determinista (p. ej. "safe-area-cta", "hierarchy-headline"). */
  id: string;
  severity: Severity;
  category: IssueCategory;
  message: string;
  suggestion?: string;
  affectedLayerIds: string[];
  action?: CriticAction;
}

export type CategorySource = "structural" | "heuristic" | "brand" | "reference" | "pixel" | "vision" | "unknown";

export interface CategoryScore {
  score: number;
  max: number;
  source: CategorySource;
}

export interface CritiqueReport {
  /** 0–100, explicable (media ponderada de categorías con evidencia). */
  overallScore: number;
  status: "ready" | "needs_revision" | "critical";
  issues: CriticIssue[];
  strengths: string[];
  nextActions: string[];
  categories: Record<string, CategoryScore>;
  /** Qué tipo de crítica se aplicó. */
  applied: Array<"structural" | "brand" | "reference" | "rendered">;
}

export interface CriticInput {
  plan: import("../composition/types").CompositionPlan;
  brand?: import("../composition/types").BrandStyles | null;
  referenceProfile?: import("../visual/types").ReferenceProfile | null;
  /** Analizador del render; si se aporta junto a `rendered`, añade evidencia visual. */
  renderedAnalyzer?: RenderedVisualAnalyzer;
  /** Imagen renderizada (el caller valida el path/containment). */
  rendered?: { data: Uint8Array; mimeType: string };
  /** Análisis completo precalculado (opcional; evita re-analizar). */
  renderedAnalysis?: import("../visual/analyzers/types").RenderedVisualAnalysis;
}

export interface RenderedVisualFeatures {
  dominantRegions?: Array<{ x: number; y: number; width: number; height: number; score?: number; confidence?: number }>;
  visualDensity?: number | null;
  estimatedContrast?: number | null;
  whitespace?: number | null;
  balance?: number | null;
  /** "pixel" = análisis estadístico local (fase 9); "vision" = modelo futuro. */
  source: "vision" | "pixel" | "unknown";
}

export interface RenderedVisualAnalyzer {
  readonly name: string;
  analyze(image: { data: Uint8Array; mimeType: string }): Promise<RenderedVisualFeatures>;
}

/** Iteración de crítica. Persistencia simple por campaña. */
export interface CritiqueIteration {
  iteration: number;
  timestamp: string;
  fingerprint: string;
  /** Fingerprint de la iteración previa (para diffs del loop). */
  previousFingerprint?: string;
  report: CritiqueReport;
  acceptedIssues: string[];
  resolvedIssues: string[];
  /** Issues nuevos/resueltos respecto a la iteración previa (loop). */
  newIssues?: string[];
  resolvedIssuesPrevious?: string[];
  /** Resumen visual del render (fase 9). */
  visualSummary?: {
    source: string;
    contrastScore?: number | null;
    visualDensity?: { score: number; level: string } | null;
    whitespaceRatio?: number | null;
    balanceScore?: number | null;
  };
}
