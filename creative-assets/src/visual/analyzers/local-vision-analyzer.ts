import { RenderedVisualAnalyzer } from "../../critic/types";
import { RenderedVisualAnalysis, RenderedVisualFeaturesBase } from "./types";
import {
  brightnessStats, contrastStats, dominantRegions, edgeDensityOf,
  loadSample, quadrantAnalysis, saturationStats, visualBalance, visualDensity, whitespace, textLikeRegions,
} from "./image-statistics";

/**
 * LocalRenderedVisualAnalyzer: análisis estadístico 100% local (sharp + píxeles).
 * Determinista, sin red, sin modelos externos. Implementa la interfaz
 * RenderedVisualAnalyzer del critic (fase 8) y devuelve la estructura completa.
 *
 * ESTO NO ES VISIÓN SEMÁNTICA: no detecta personas/objetos/texto real.
 */
export class LocalRenderedVisualAnalyzer implements RenderedVisualAnalyzer {
  readonly name = "local-pixel-v1";

  async analyze(image: { data: Uint8Array; mimeType: string }): Promise<RenderedVisualFeaturesBase> {
    const analysis = await this.analyzeFull(image.data, image.mimeType);
    return {
      ...analysis,
      dominantRegions: analysis.dominantRegions,
      visualDensity: analysis.visualDensity.score,
      estimatedContrast: analysis.contrast.score,
      whitespace: analysis.whitespace.ratio,
      balance: analysis.balance.score,
      source: "pixel",
    };
  }

  /** Análisis completo (el critic lo usa directamente si está disponible). */
  async analyzeFull(data: Uint8Array, mimeType: string): Promise<RenderedVisualAnalysis> {
    return analyzeRendered(data, mimeType);
  }
}

/** Análisis completo (el critic consume esta estructura rica). */
export async function analyzeRendered(data: Uint8Array, mimeType: string): Promise<import("./types").RenderedVisualAnalysis> {
  const sample = await loadSample(data, mimeType);
  const brightness = brightnessStats(sample.luma);
  const contrast = contrastStats(sample.luma);
  const saturation = saturationStats(sample.sat);
  const edgeDensity = edgeDensityOf(sample.edges);
  const density = visualDensity(sample.luma, sample.sat, sample.edges);
  const ws = whitespace(sample);
  const balance = visualBalance(sample);

  return {
    width: sample.realWidth,
    height: sample.realHeight,
    analyzedWidth: sample.width,
    analyzedHeight: sample.height,
    brightness,
    contrast,
    saturation,
    edgeDensity,
    visualDensity: density,
    whitespace: ws,
    balance,
    quadrantAnalysis: quadrantAnalysis(sample),
    dominantRegions: dominantRegions(sample),
    textLikeRegions: textLikeRegions(sample),
    confidence: {
      brightness: 0.9, contrast: 0.85, saturation: 0.85, edgeDensity: 0.75,
      visualDensity: density.confidence, whitespace: ws.confidence, balance: balance.confidence,
      textLikeRegions: 0.45,
    },
  };
}
