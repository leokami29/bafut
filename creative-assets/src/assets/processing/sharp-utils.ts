import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { ProcessingError, ProcessorOutput } from "./types";

/**
 * Utilidades compartidas por los processors basados en Sharp.
 * Sharp se elige porque: prebuilt para Node 18+/24, sin binarios externos,
 * cubre resize/crop/convert/optimize y expone detección de transparencia.
 */

export const SHARP_VERSION = `${sharp.versions.sharp ?? ""}` || undefined;

/** true si el buffer de imagen tiene transparencia real (canal alfa con valores < 255). */
export async function detectTransparency(buffer: Buffer): Promise<boolean> {
  const stats = await sharp(buffer).stats();
  return stats.isOpaque === false;
}

export async function sharpMetadata(file: string) {
  return sharp(file).metadata();
}

/** Lee dimensiones de un archivo con Sharp (fallback a la info conocida). */
export async function dimensionsOf(file: string): Promise<{ width?: number; height?: number }> {
  const meta = await sharpMetadata(file);
  return { width: meta.width, height: meta.height };
}

export async function outputInfo(outputPath: string): Promise<ProcessorOutput> {
  const buffer = await sharp(outputPath).toBuffer();
  const meta = await sharp(buffer).metadata();
  const hasAlpha = meta.hasAlpha === true;
  const format = meta.format;
  const extension = format === "jpeg" ? "jpg" : format ?? "bin";
  const mimeType = `image/${format === "jpeg" ? "jpeg" : format ?? "unknown"}`;
  return {
    mimeType: ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType) ? mimeType : "image/png",
    extension: ["jpeg", "jpg", "png", "webp", "gif"].includes(extension) ? extension : "png",
    width: meta.width,
    height: meta.height,
    hasTransparency: hasAlpha ? await detectTransparency(buffer) : false,
  };
}

export function requirePositiveInt(options: Record<string, unknown>, key: string, max = 20000): number {
  const value = options[key];
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > max) {
    throw new ProcessingError("invalid_options", `"${key}" debe ser un entero entre 1 y ${max}. Recibido: ${String(value)}`, "options");
  }
  return n;
}

export function readFormat(options: Record<string, unknown>): "jpeg" | "png" | "webp" {
  const format = String(options.format ?? "").toLowerCase();
  if (format !== "jpeg" && format !== "jpg" && format !== "png" && format !== "webp") {
    throw new ProcessingError("invalid_options", `Formato no soportado: "${String(options.format)}". Usa jpeg, png o webp.`, "convert");
  }
  return format === "jpg" ? "jpeg" : (format as "jpeg" | "png" | "webp");
}

/** Transparencia real de un archivo en disco (canal alfa presente y con valores < 255). */
export async function fileHasTransparency(filePath: string): Promise<boolean> {
  const buffer = await readFile(filePath);
  const stats = await sharp(buffer).stats();
  return stats.isOpaque === false;
}
