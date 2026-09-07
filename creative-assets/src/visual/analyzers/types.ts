/**
 * Analizadores de render (Fase 9) — contratos.
 *
 * ESTO NO ES UN MODELO DE VISIÓN SEMÁNTICA: es un analizador ESTADÍSTICO de
 * píxeles (bright/contraste/saturación/bordes/balance). Nada de reconocimiento
 * de objetos, texto real (OCR) ni personas. `textLikeRegions` son regiones con
 * textura tipo texto, con confidence limitada.
 *
 * Coordenadas: normalizadas 0..1 salvo indicación (px en VisualRegion si se
 * declara `pixels: true`; por defecto los rects son normalizados).
 */

export interface RenderedVisualInput {
  /** Buffer del PNG renderizado (el caller valida el path/containment). */
  data: Uint8Array;
  mimeType: string;
}

/** Región rectangular. Coordenadas NORMALIZADAS 0..1 salvo `pixels: true`. */
export interface VisualRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
  confidence: number;
  pixels?: boolean;
}

export interface VisualQuadrant {
  brightness: number;
  contrast: number;
  edgeDensity: number;
  saturation: number;
  visualEnergy: number;
}

export interface RenderedVisualAnalysis {
  width: number;
  height: number;
  /** Ancho/alto reales de la muestra analizada (downsample determinista). */
  analyzedWidth: number;
  analyzedHeight: number;
  brightness: { mean: number; variance: number; score: number };
  contrast: { global: number; score: number };
  saturation: { mean: number; variance: number; score: number };
  edgeDensity: number;
  visualDensity: { score: number; level: "low" | "medium" | "high"; confidence: number };
  whitespace: { ratio: number; confidence: number; regions: VisualRegion[]; largestRegion?: VisualRegion };
  balance: {
    centerOfMass: { x: number; y: number };
    deviationX: number;
    deviationY: number;
    score: number;
    confidence: number;
  };
  quadrantAnalysis: {
    topLeft: VisualQuadrant;
    topRight: VisualQuadrant;
    bottomLeft: VisualQuadrant;
    bottomRight: VisualQuadrant;
  };
  dominantRegions: VisualRegion[];
  textLikeRegions: VisualRegion[];
  confidence: Record<string, number>;
}

/** Interfaz del critic (fase 8) — se mantiene; el analyzer local la implementa. */
export interface RenderedVisualAnalyzer {
  readonly name: string;
  analyze(image: { data: Uint8Array; mimeType: string }): Promise<RenderedVisualFeaturesBase>;
}

/** Base compatible con src/critic/types.ts (RenderedVisualFeatures). */
export interface RenderedVisualFeaturesBase {
  dominantRegions?: VisualRegion[];
  visualDensity?: number | null;
  estimatedContrast?: number | null;
  whitespace?: number | null;
  balance?: number | null;
  source: "vision" | "pixel" | "unknown";
}

export class VisionError extends Error {
  code: "IMAGE_TOO_LARGE" | "INVALID_IMAGE" | "IMAGE_TOO_BIG_DIMENSIONS";
  constructor(code: "IMAGE_TOO_LARGE" | "INVALID_IMAGE" | "IMAGE_TOO_BIG_DIMENSIONS", message: string) {
    super(`[vision] ${code}: ${message}`);
    this.name = "VisionError";
    this.code = code;
  }
}

/** Límites anti memory-exhaustion / decompression bombs. */
export const VISION_LIMITS = {
  /** Tamaño máximo del buffer de entrada. */
  maxBytes: 20 * 1024 * 1024,
  /** Dimensiones máximas aceptadas antes del downsample. */
  maxDimensions: 8000,
  /** Ancho máximo de la muestra analizada (downsample determinista). */
  analysisWidth: 512,
} as const;
