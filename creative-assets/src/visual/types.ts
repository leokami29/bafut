/**
 * Visual Intelligence (Fase 7) — contratos.
 *
 * PRINCIPIO: el sistema no puede inferir características de píxeles que no analiza.
 * Toda feature declara su `source` (metadata | heuristic | vision) y lo no
 * determinable se representa como "unknown" / null, jamás inventado.
 */

export type FeatureSource = "metadata" | "heuristic" | "vision";
export type Orientation = "portrait" | "landscape" | "square";

/** Lado semántico; "unknown" = no determinado (no se inventa). */
export type SemanticSide = "left" | "right" | "top" | "bottom" | "none" | "unknown";

/** Características visuales de un candidato. */
export interface VisualFeatures {
  width: number;
  height: number;
  aspectRatio: number;
  orientation: Orientation;
  megapixels: number;
  /** Solo con pixel analysis; metadata-only = "unknown". */
  subjectPosition: SemanticSide;
  /** Solo con pixel analysis; "unknown" = no determinado. */
  negativeSpace: SemanticSide;
  /** 0–1; null = desconocido (requiere pixel analysis). */
  visualDensity: number | null;
  source: FeatureSource;
  /** Nombre del analizador que produjo las features. */
  analyzer: string;
}

/** Contrato para analizadores (futuros: LocalVision, CloudVision, ...). */
export interface VisualAnalyzer {
  readonly name: string;
  analyze(input: { width: number; height: number; aspectRatio?: number }): Promise<VisualFeatures>;
}

/** Cuánto recorte requiere encajar en el target (sin modificar la imagen). */
export interface CropCompatibility {
  /** Fracción de píxeles descartados al hacer cover al target (0–1). */
  discardFraction: number;
  level: "excellent" | "good" | "acceptable" | "poor";
}

export interface VisualScoringContext {
  role: string;
  targetWidth: number;
  targetHeight: number;
  /** Posición semántica del layer (mismos valores que CompositionPlan). */
  preferredPosition?: string;
  /** Lado donde la composición necesita espacio libre (p. ej. texto). */
  negativeSpaceSide?: Exclude<SemanticSide, "unknown">;
  minimumResolution?: { width: number; height: number };
  requiresTransparency?: boolean;
}

export type ScoreCriterion = "resolution" | "aspectFit" | "orientation" | "composition" | "subjectPosition" | "negativeSpace";

export interface CriterionScore {
  score: number;
  max: number;
}

export interface VisualScore {
  /** 0–100. */
  total: number;
  breakdown: Record<ScoreCriterion, CriterionScore>;
  reasons: string[];
  warnings: string[];
  features: VisualFeatures;
  crop: CropCompatibility;
}

export interface ScoringWeights {
  resolution: number;
  aspectFit: number;
  orientation: number;
  composition: number;
  subjectPosition: number;
  negativeSpace: number;
}

/** Candidato enriquecido tras el ranking. */
export interface RankedCandidate<T = unknown> {
  candidate: T;
  features: VisualFeatures;
  score: VisualScore;
}

/** Perfil visual de referencia (fases futuras lo rellenarán con análisis real). */
export interface ReferenceProfile {
  brandId: string;
  source: "static" | "analyzed" | "default";
  preferredFormats?: Array<{ width: number; height: number }>;
  preferredSubjectPlacement?: SemanticSide;
  overlayUsage?: { gradient: boolean; typicalOpacity?: number };
  dominantColors?: string[];
  notes?: string;
}
