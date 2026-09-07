/**
 * Detección de formato de imagen por magic bytes (nunca por extensión)
 * y lectura de dimensiones sin dependencias externas.
 *
 * Formatos soportados (decisión documentada):
 * - JPEG (image/jpeg): universal, el más común en bancos de imágenes.
 * - PNG  (image/png): transparencia, ilustraciones, cutouts futuros.
 * - WEBP (image/webp): optimización web.
 * - GIF  (image/gif): se acepta como imagen válida (uso puntual/animación).
 *
 * SVG se rechaza deliberadamente en raw: es texto (riesgo XSS) y se tratará
 * como "elemento gráfico" en otra capa si hace falta.
 */

export interface ImageFormatInfo {
  mimeType: string;
  extension: string;
  width?: number;
  height?: number;
}

export type DetectResult =
  | { ok: true; info: ImageFormatInfo }
  | { ok: false; reason: "not_an_image" | "unsupported_format" | "insufficient_data" };

export function detectImageFormat(head: Buffer): DetectResult {
  if (head.length < 12) return { ok: false, reason: "insufficient_data" };

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    const dims = jpegDimensions(head);
    return { ok: true, info: { mimeType: "image/jpeg", extension: "jpg", ...dims } };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47 &&
    head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a
  ) {
    if (head.length >= 24) {
      const width = head.readUInt32BE(16);
      const height = head.readUInt32BE(20);
      return { ok: true, info: { mimeType: "image/png", extension: "png", width, height } };
    }
    return { ok: true, info: { mimeType: "image/png", extension: "png" } };
  }

  // WEBP: "RIFF"...."WEBP"
  if (head.subarray(0, 4).toString("ascii") === "RIFF" && head.subarray(8, 12).toString("ascii") === "WEBP") {
    const dims = webpDimensions(head);
    return { ok: true, info: { mimeType: "image/webp", extension: "webp", ...dims } };
  }

  // GIF: "GIF87a" | "GIF89a"
  const gifSig = head.subarray(0, 6).toString("ascii");
  if (gifSig === "GIF87a" || gifSig === "GIF89a") {
    const width = head.readUInt16LE(6);
    const height = head.readUInt16LE(8);
    return { ok: true, info: { mimeType: "image/gif", extension: "gif", width, height } };
  }

  // HTML/JSON/texto disfrazado → definitivamente no es imagen
  const asText = head.subarray(0, 32).toString("ascii").toLowerCase();
  if (asText.includes("<!doctype") || asText.includes("<html") || asText.trimStart().startsWith("{")) {
    return { ok: false, reason: "not_an_image" };
  }
  return { ok: false, reason: "unsupported_format" };
}

/** Escanea marcadores SOFn de JPEG (necesita el buffer inicial, ~256KB suelen bastar). */
function jpegDimensions(head: Buffer): { width?: number; height?: number } {
  let offset = 2;
  while (offset + 9 < head.length) {
    if (head[offset] !== 0xff) { offset++; continue; }
    const marker = head[offset + 1];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2; continue;
    }
    const length = head.readUInt16BE(offset + 2);
    const isSOF = (marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf);
    if (isSOF && offset + 9 <= head.length) {
      const height = head.readUInt16BE(offset + 5);
      const width = head.readUInt16BE(offset + 7);
      return { width, height };
    }
    if (length <= 0) break;
    offset += 2 + length;
  }
  return {};
}

/** WEBP VP8X / VP8 (lossy) / VP8L (lossless). */
function webpDimensions(head: Buffer): { width?: number; height?: number } {
  if (head.length < 30) return {};
  const chunk = head.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    const width = 1 + (head[24] | (head[25] << 8) | (head[26] << 16));
    const height = 1 + (head[27] | (head[28] << 8) | (head[29] << 16));
    return { width, height };
  }
  if (chunk === "VP8 ") {
    const width = head.readUInt16LE(26) & 0x3fff;
    const height = head.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }
  if (chunk === "VP8L") {
    const bits = head.readUInt32LE(21);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  return {};
}
