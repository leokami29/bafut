import sharp from "sharp";
import type { Metadata } from "sharp";
import { VisionError, VISION_LIMITS, VisualQuadrant, VisualRegion } from "./types";

/**
 * EstadÃ­sticas de imagen 100% locales y deterministas (sharp + operaciones
 * lineales sobre pÃ­xeles). Misma imagen â†’ mismos nÃºmeros. Sin red, sin random,
 * sin timestamps.
 *
 * Downsample determinista: la muestra se reduce a analysisWidth (512) de ancho
 * manteniendo el aspect ratio â†’ coste ~O(512Â·H) por mÃ©trica (rÃ¡pido: <50ms para
 * 1080Ã—1350). Los valores se normalizan 0..1 salvo indicaciÃ³n.
 */

export interface LumaSample {
  width: number;
  height: number;
  realWidth: number;
  realHeight: number;
  /** Luminancia 0..1 por pÃ­xel (row-major). */
  luma: Float32Array;
  /** SaturaciÃ³n 0..1 por pÃ­xel. */
  sat: Float32Array;
  /** Magnitud de borde 0..1 por pÃ­xel (aprox Sobel |dx|+|dy|). */
  edges: Float32Array;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Carga la imagen con lÃ­mites y produce la muestra (luma/sat/edges). */
export async function loadSample(data: Uint8Array, mimeType: string): Promise<LumaSample> {
  if (data.byteLength > VISION_LIMITS.maxBytes) {
    throw new VisionError("IMAGE_TOO_LARGE", `La imagen excede ${Math.round(VISION_LIMITS.maxBytes / 1024 / 1024)} MB.`);
  }
  if (!mimeType.startsWith("image/")) {
    throw new VisionError("INVALID_IMAGE", `Content-Type no soportado: ${mimeType}`);
  }
  let meta: Metadata;
  try {
    meta = await sharp(data).metadata();
  } catch {
    throw new VisionError("INVALID_IMAGE", "El buffer no es una imagen vÃ¡lida.");
  }
  const realW = meta.width ?? 0;
  const realH = meta.height ?? 0;
  if (!realW || !realH || realW > VISION_LIMITS.maxDimensions || realH > VISION_LIMITS.maxDimensions) {
    throw new VisionError("IMAGE_TOO_BIG_DIMENSIONS", `Dimensiones invÃ¡lidas o excesivas: ${realW}x${realH}.`);
  }
  const w = Math.min(VISION_LIMITS.analysisWidth, realW);
  const h = Math.max(1, Math.round((realH / realW) * w));
  const { data: raw, info } = await sharp(data).resize(w, h).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = info.width * info.height;
  const luma = new Float32Array(px);
  const sat = new Float32Array(px);
  for (let i = 0; i < px; i++) {
    const r = raw[i * 4] / 255, g = raw[i * 4 + 1] / 255, b = raw[i * 4 + 2] / 255;
    // luminancia Rec.601 aprox, normalizada
    luma[i] = clamp01(0.299 * r + 0.587 * g + 0.114 * b);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // saturaciÃ³n HSL simplificada: (max-min)/max (0 si max=0)
    sat[i] = max > 0 ? (max - min) / max : 0;
  }
  const edges = computeEdges(luma, info.width, info.height);
  return { width: info.width, height: info.height, realWidth: realW, realHeight: realH, luma, sat, edges };
}

/** Magnitud de borde: (|dx|+|dy|)/2, normalizada (0..1). AproximaciÃ³n de complejidad visual. */
function computeEdges(luma: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const dx = x + 1 < w ? Math.abs(luma[i + 1] - luma[i]) : 0;
      const dy = y + 1 < h ? Math.abs(luma[i + w] - luma[i]) : 0;
      out[i] = clamp01((dx + dy) / 2 / 0.3); // 0.3 â‰ˆ borde fuerte (documentado)
    }
  }
  return out;
}

// ---------- mÃ©tricas ----------

export function brightnessStats(luma: Float32Array): { mean: number; variance: number; score: number } {
  const mean = meanOf(luma);
  const variance = varianceOf(luma, mean);
  // score: ni demasiado oscuro ni quemado ni plano; ideal mean 0.35â€“0.75 con algo de varianza
  const placement = mean < 0.35 ? (mean / 0.35) : mean > 0.75 ? clamp01((1 - mean) / 0.25) : 1;
  const liveliness = clamp01(Math.sqrt(variance) / 0.18);
  return { mean: round3(mean), variance: round3(variance), score: round3(clamp01(placement * 0.7 + liveliness * 0.3)) };
}

/** Contraste GLOBAL = desviaciÃ³n estÃ¡ndar de luminancia, normalizada (std 0.25 â‰ˆ 1.0). */
export function contrastStats(luma: Float32Array): { global: number; score: number } {
  const std = Math.sqrt(varianceOf(luma, meanOf(luma)));
  const score = clamp01(std / 0.25);
  return { global: round3(std), score: round3(score) };
}

export function saturationStats(sat: Float32Array): { mean: number; variance: number; score: number } {
  const mean = meanOf(sat);
  const variance = varianceOf(sat, mean);
  // estadÃ­stica pura: saturaciÃ³n media/varianza; score descriptivo
  return { mean: round3(mean), variance: round3(variance), score: round3(clamp01(mean / 0.6)) };
}

export function edgeDensityOf(edges: Float32Array): number {
  return round3(meanOf(edges));
}

export function visualDensity(luma: Float32Array, sat: Float32Array, edges: Float32Array): { score: number; level: "low" | "medium" | "high"; confidence: number } {
  const lumDev = Math.sqrt(varianceOf(luma, meanOf(luma)));
  const satVar = varianceOf(sat, meanOf(sat));
  const score = clamp01(meanOf(edges) * 0.4 + clamp01(lumDev / 0.25) * 0.3 + clamp01(satVar / 0.2) * 0.3);
  const level = score < 0.33 ? "low" : score < 0.66 ? "medium" : "high";
  // densidad con sample de 512px: confianza moderada-alta y determinista
  return { score: round3(score), level, confidence: 0.7 };
}

/** Tiles vacÃ­os: borde bajo y poca variaciÃ³n local â†’ estimaciÃ³n de whitespace. */
export function whitespace(sample: LumaSample, tilesPerSide = 12): { ratio: number; confidence: number; regions: VisualRegion[]; largestRegion?: VisualRegion } {
  const { width: w, height: h, luma, sat, edges } = sample;
  const tw = Math.max(1, Math.floor(w / tilesPerSide));
  const th = Math.max(1, Math.floor(h / tilesPerSide));
  const cols = Math.floor(w / tw);
  const rows = Math.floor(h / th);
  const empty: boolean[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let e = 0, s = 0, lm = 0, lm2 = 0, n = 0;
      for (let y = r * th; y < (r + 1) * th; y++) {
        for (let x = c * tw; x < (c + 1) * tw; x++) {
          const i = y * w + x;
          e += edges[i]; s += sat[i]; lm += luma[i]; lm2 += luma[i] * luma[i]; n++;
        }
      }
      const eMean = e / n;
      const lVar = lm2 / n - (lm / n) * (lm / n);
      // vacÃ­o: sin bordes, poco color, y plano (aunque sea oscuro â€” no asumimos blanco)
      empty.push(eMean < 0.04 && s / n < 0.12 && lVar < 0.002);
    }
  }
  const regions = mergeTiles(empty, cols, rows);
  const ratio = empty.filter(Boolean).length / Math.max(1, empty.length);
  return {
    ratio: round3(ratio),
    confidence: regions.length ? 0.65 : 0.4,
    regions,
    largestRegion: regions.slice().sort((a, b) => b.width * b.height - a.width * a.height)[0],
  };
}

/** Regiones dominantes: tiles de alta energÃ­a fusionados (top por energÃ­a). */
export function dominantRegions(sample: LumaSample, tilesPerSide = 12): VisualRegion[] {
  const tw = Math.max(1, Math.floor(sample.width / tilesPerSide));
  const th = Math.max(1, Math.floor(sample.height / tilesPerSide));
  const cols = Math.floor(sample.width / tw);
  const rows = Math.floor(sample.height / th);
  const energy: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      energy.push(tileEnergy(sample, c, r, tw, th));
    }
  }
  const sorted = [...energy].sort((a, b) => b - a);
  const threshold = Math.max(0.12, sorted[Math.floor(sorted.length * 0.2)] ?? 0);
  const flags = energy.map((e) => e >= threshold);
  const regions = mergeTiles(flags, cols, rows);
  return regions.filter((r) => r.width * r.height >= 0.005).slice(0, 5);
}

/** Regiones tipo texto: borde alto + predominio horizontal + contraste local. HEURÃSTICA (no OCR). */
export function textLikeRegions(sample: LumaSample, tilesPerSide = 16): VisualRegion[] {
  const { width: w, height: h, luma, edges } = sample;
  const tw = Math.max(1, Math.floor(w / tilesPerSide));
  const th = Math.max(1, Math.floor(h / tilesPerSide));
  const cols = Math.floor(w / tw);
  const rows = Math.floor(h / th);
  const flags: boolean[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let e = 0, dx = 0, lm2 = 0, lm = 0, n = 0;
      for (let y = r * th; y < (r + 1) * th; y++) {
        for (let x = c * tw; x < (c + 1) * tw; x++) {
          const i = y * w + x;
          e += edges[i];
          dx += x + 1 < w ? Math.abs(luma[i + 1] - luma[i]) : 0;
          lm += luma[i]; lm2 += luma[i] * luma[i]; n++;
        }
      }
      const dyish = e * n - dx; // resto â‰ˆ componente vertical
      const horizDominance = dx > 0 ? dx / Math.max(1, dx + Math.abs(dyish)) : 0;
      const lVar = lm2 / n - (lm / n) * (lm / n);
      // textura fina (bordes moderados), con predominio horizontal y varianza local
      flags.push(e / n > 0.1 && e / n < 0.55 && horizDominance > 0.55 && lVar > 0.004);
    }
  }
  const regions = mergeTiles(flags, cols, rows);
  return regions
    .map((r) => ({ ...r, score: r.score, confidence: 0.45 })) // heurÃ­stica: confianza limitada
    .filter((r) => r.width * r.height >= 0.01)
    .slice(0, 8);
}

function tileEnergy(sample: LumaSample, c: number, r: number, tw: number, th: number): number {
  const { width: w, luma, sat, edges } = sample;
  let e = 0, s = 0, lm = 0, lm2 = 0, n = 0;
  for (let y = r * th; y < (r + 1) * th; y++) {
    for (let x = c * tw; x < (c + 1) * tw; x++) {
      const i = y * w + x;
      e += edges[i]; s += sat[i]; lm += luma[i]; lm2 += luma[i] * luma[i]; n++;
    }
  }
  const lumDev = Math.sqrt(Math.max(0, lm2 / n - (lm / n) * (lm / n)));
  return clamp01((e / n) * 0.5 + clamp01(lumDev / 0.25) * 0.3 + (s / n) * 0.2);
}

/** Fusiona tiles marcados en rectÃ¡ngulos (normalizados 0..1) greedy por filas. */
function mergeTiles(flags: boolean[], cols: number, rows: number): VisualRegion[] {
  const used = new Array(flags.length).fill(false);
  const regions: VisualRegion[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (!flags[idx] || used[idx]) continue;
      // expandir ancho
      let c2 = c;
      while (c2 + 1 < cols && flags[r * cols + c2 + 1] && !used[r * cols + c2 + 1]) c2++;
      // expandir alto
      let r2 = r;
      grow: while (r2 + 1 < rows) {
        for (let cc = c; cc <= c2; cc++) {
          if (!flags[(r2 + 1) * cols + cc] || used[(r2 + 1) * cols + cc]) break grow;
        }
        r2++;
      }
      for (let rr = r; rr <= r2; rr++) for (let cc = c; cc <= c2; cc++) used[rr * cols + cc] = true;
      const tileW = 1 / cols;
      const tileH = 1 / rows;
      regions.push({
        x: round3(c * tileW), y: round3(r * tileH),
        width: round3((c2 - c + 1) * tileW), height: round3((r2 - r + 1) * tileH),
        score: 0, confidence: 0.6,
      });
    }
  }
  for (const region of regions) {
    // score proporcional al Ã¡rea (energÃ­a relativa se recalcula por el caller si necesita)
    region.score = round3(region.width * region.height);
  }
  return regions.sort((a, b) => b.score - a.score);
}

export function quadrantAnalysis(sample: LumaSample): Record<"topLeft" | "topRight" | "bottomLeft" | "bottomRight", VisualQuadrant> {
  const { width: w, height: h } = sample;
  const halfW = Math.floor(w / 2);
  const halfH = Math.floor(h / 2);
  const quad = (x0: number, y0: number, x1: number, y1: number): VisualQuadrant => {
    let lumaSum = 0, lum2 = 0, edge = 0, s = 0, n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * w + x;
        lumaSum += sample.luma[i]; lum2 += sample.luma[i] * sample.luma[i];
        edge += sample.edges[i]; s += sample.sat[i]; n++;
      }
    }
    const mean = lumaSum / n;
    const std = Math.sqrt(Math.max(0, lum2 / n - mean * mean));
    const ed = edge / n;
    return {
      brightness: round3(mean),
      contrast: round3(clamp01(std / 0.25)),
      edgeDensity: round3(ed),
      saturation: round3(s / n),
      visualEnergy: round3(clamp01(ed * 0.5 + clamp01(std / 0.25) * 0.3 + (s / n) * 0.2)),
    };
  };
  return {
    topLeft: quad(0, 0, halfW, halfH),
    topRight: quad(halfW, 0, w, halfH),
    bottomLeft: quad(0, halfH, halfW, h),
    bottomRight: quad(halfW, halfH, w, h),
  };
}

/** Centro de masa de energÃ­a visual + desviaciones (normalizado 0..1). */
export function visualBalance(sample: LumaSample): { centerOfMass: { x: number; y: number }; deviationX: number; deviationY: number; score: number; confidence: number } {
  const { width: w, height: h, edges, luma, sat } = sample;
  let sum = 0, sx = 0, sy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const lumDev = Math.abs(luma[i] - 0.5);
      const energy = edges[i] * 0.5 + lumDev * 0.3 + sat[i] * 0.2;
      if (energy <= 0.01) continue;
      sum += energy;
      sx += energy * (x / w);
      sy += energy * (y / h);
    }
  }
  if (sum <= 0) {
    return { centerOfMass: { x: 0.5, y: 0.5 }, deviationX: 0, deviationY: 0, score: 1, confidence: 0.2 };
  }
  const cx = sx / sum;
  const cy = sy / sum;
  const devX = Math.abs(cx - 0.5);
  const devY = Math.abs(cy - 0.5);
  return {
    centerOfMass: { x: round3(cx), y: round3(cy) },
    deviationX: round3(devX),
    deviationY: round3(devY),
    score: round3(clamp01(1 - (devX + devY) / 0.5)),
    confidence: 0.6,
  };
}

function meanOf(arr: Float32Array): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s / arr.length;
}

function varianceOf(arr: Float32Array, mean: number): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += (arr[i] - mean) * (arr[i] - mean);
  return s / arr.length;
}
