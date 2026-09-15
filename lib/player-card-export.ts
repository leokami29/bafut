import { toBlob } from "html-to-image";
import { PROFILE_AVATARS_BUCKET } from "@/lib/profile-photos";
import { cleanStorageObjectPath } from "@/lib/storage-path";

export const PLAYER_CARD_EXPORT_FILENAME = "carta-bafut.png";

export type PlayerCardExportResult = {
  blob: Blob;
  file: File;
};

export class PlayerCardExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlayerCardExportError";
  }
}

const MODERN_COLOR = /oklab|oklch|color-mix|\blab\(|\blch\(/i;
const COLOR_FN = /oklab\(|oklch\(|color-mix\(|\blab\(|\blch\(/i;
const CAPTURE_TIMEOUT_MS = 8000;
const AVATAR_PUBLIC_MARKER = `/storage/v1/object/public/${PROFILE_AVATARS_BUCKET}/`;

/** Convierte URL pública de Supabase Storage → proxy same-origin (CORS-safe). */
export function avatarPublicUrlToProxyUrl(src: string, origin = ""): string | null {
  try {
    const base = origin || (typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const url = new URL(src, base);
    const idx = url.pathname.indexOf(AVATAR_PUBLIC_MARKER);
    if (idx < 0) return null;
    const encodedPath = url.pathname.slice(idx + AVATAR_PUBLIC_MARKER.length);
    const path = cleanStorageObjectPath(decodeURIComponent(encodedPath));
    if (!path || !/\.(jpe?g|png|webp)$/i.test(path)) return null;
    return `/api/media/avatar?path=${encodeURIComponent(path)}`;
  } catch {
    return null;
  }
}

function extractColorFn(value: string, start: number): { fn: string; end: number } | null {
  const open = value.indexOf("(", start);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") {
      depth -= 1;
      if (depth === 0) return { fn: value.slice(start, i + 1), end: i + 1 };
    }
  }
  return null;
}

function toRgb(color: string): string {
  if (!color || color === "transparent" || color === "none") return color;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return color;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  try {
    ctx.fillStyle = color;
  } catch {
    return color;
  }
  ctx.fillRect(0, 0, 1, 1);
  const pixel = ctx.getImageData(0, 0, 1, 1).data;
  const alpha = pixel[3] / 255;
  if (alpha >= 0.995) return `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
  const a = Math.round(alpha * 1000) / 1000;
  return `rgba(${pixel[0]}, ${pixel[1]}, ${pixel[2]}, ${a})`;
}

function replaceModernColors(value: string): string {
  if (!COLOR_FN.test(value)) return value;
  let out = "";
  let cursor = 0;
  const lower = value.toLowerCase();
  while (cursor < value.length) {
    const from = lower.slice(cursor);
    const match = from.match(/oklab\(|oklch\(|color-mix\(|\blab\(|\blch\(/);
    if (!match || match.index == null) {
      out += value.slice(cursor);
      break;
    }
    const start = cursor + match.index;
    out += value.slice(cursor, start);
    const extracted = extractColorFn(value, start);
    if (!extracted) {
      out += value.slice(start);
      break;
    }
    out += toRgb(extracted.fn);
    cursor = extracted.end;
  }
  return out;
}

function flattenModernCss(root: HTMLElement): () => void {
  const backups: Array<{ el: HTMLElement; cssText: string }> = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  for (const el of nodes) {
    backups.push({ el, cssText: el.style.cssText });
    const cs = getComputedStyle(el);
    for (let i = 0; i < cs.length; i += 1) {
      const prop = cs.item(i);
      const val = cs.getPropertyValue(prop);
      if (!MODERN_COLOR.test(val)) continue;
      el.style.setProperty(prop, replaceModernColors(val), cs.getPropertyPriority(prop));
    }
  }
  return () => {
    for (const item of backups) item.el.style.cssText = item.cssText;
  };
}

function freezeCardForCapture(root: HTMLElement): () => void {
  const touched: Array<{ el: HTMLElement; transform: string; rotate: string }> = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>(".player-card-tilt, .player-card-motion-host"))];
  for (const el of nodes) {
    touched.push({ el, transform: el.style.transform, rotate: el.style.rotate });
    el.style.transform = "none";
    el.style.rotate = "none";
  }
  const hints: Array<{ el: HTMLElement; display: string }> = [];
  root.querySelectorAll<HTMLElement>(".player-card-crop-hint").forEach((el) => {
    hints.push({ el, display: el.style.display });
    el.style.display = "none";
  });
  return () => {
    for (const item of touched) {
      item.el.style.transform = item.transform;
      item.el.style.rotate = item.rotate;
    }
    for (const hint of hints) hint.el.style.display = hint.display;
  };
}

function waitForImgDecode(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    img.decode().then(done).catch(done);
  });
}

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => waitForImgDecode(img)));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

/** Lee un <img> ya cargado con CORS; null si el canvas queda tainted. */
function canvasDataUrlFromImg(img: HTMLImageElement): string | null {
  if (!img.complete || img.naturalWidth < 1) return null;
  try {
    const maxSide = 1200;
    let width = img.naturalWidth;
    let height = img.naturalHeight;
    const longest = Math.max(width, height);
    if (longest > maxSide) {
      const scale = maxSide / longest;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit", cache: "no-store" });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size < 32) return null;
    const dataUrl = await blobToDataUrl(blob);
    return dataUrl.startsWith("data:") ? dataUrl : null;
  } catch {
    return null;
  }
}

async function resolveImgDataUrl(img: HTMLImageElement): Promise<string | null> {
  const src = img.currentSrc || img.src;
  if (!src) return null;
  if (src.startsWith("data:")) return src;

  const fromCanvas = canvasDataUrlFromImg(img);
  if (fromCanvas) return fromCanvas;

  if (src.startsWith("blob:")) {
    return fetchAsDataUrl(src);
  }

  const fromFetch = await fetchAsDataUrl(src);
  if (fromFetch) return fromFetch;

  const proxy = avatarPublicUrlToProxyUrl(src);
  if (proxy) return fetchAsDataUrl(proxy);

  return null;
}

/**
 * Incrusta avatares como data URL antes de html-to-image.
 * Evita el re-fetch CORS de la lib (en móvil falla y cachea string vacío → foto en blanco).
 */
async function inlineImagesForCapture(root: HTMLElement): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  const backups: Array<{
    img: HTMLImageElement;
    src: string;
    srcset: string;
    crossOrigin: string | null;
  }> = [];

  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") || img.currentSrc || img.src;
      if (!src || src.startsWith("data:")) return;

      backups.push({
        img,
        src,
        srcset: img.getAttribute("srcset") || "",
        crossOrigin: img.getAttribute("crossorigin"),
      });

      const dataUrl = await resolveImgDataUrl(img);
      if (!dataUrl) return;

      img.removeAttribute("crossorigin");
      img.removeAttribute("srcset");
      img.src = dataUrl;
      await waitForImgDecode(img);
    }),
  );

  return () => {
    for (const item of backups) {
      const { img } = item;
      if (item.crossOrigin != null) img.setAttribute("crossorigin", item.crossOrigin);
      else img.removeAttribute("crossorigin");
      if (item.srcset) img.setAttribute("srcset", item.srcset);
      else img.removeAttribute("srcset");
      img.src = item.src;
    }
  };
}

function resultFromBlob(blob: Blob): PlayerCardExportResult {
  const file = new File([blob], PLAYER_CARD_EXPORT_FILENAME, { type: blob.type || "image/png" });
  return { blob, file };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new PlayerCardExportError(message));
    }, ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        globalThis.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function captureDom(element: HTMLElement): Promise<Blob> {
  const blob = await toBlob(element, {
    pixelRatio: 2,
    cacheBust: false,
    skipFonts: true,
    backgroundColor: "#03140f",
    preferredFontFormat: "woff2",
    fetchRequestInit: { mode: "cors", credentials: "omit" },
    style: {
      opacity: "1",
      transform: "none",
      rotate: "none",
    },
  });
  if (!blob || blob.size < 32) {
    throw new PlayerCardExportError("No pudimos generar la imagen de la carta.");
  }
  return blob;
}

async function captureVisibleCard(element: HTMLElement): Promise<Blob> {
  const restoreMotion = freezeCardForCapture(element);
  const restoreCss = flattenModernCss(element);
  let restoreImages = () => {};
  try {
    await waitForImages(element);
    restoreImages = await inlineImagesForCapture(element);
    await waitForImages(element);
    return await withTimeout(
      captureDom(element),
      CAPTURE_TIMEOUT_MS,
      "No pudimos generar la imagen de la carta.",
    );
  } finally {
    restoreImages();
    restoreCss();
    restoreMotion();
  }
}

async function captureFallbackUrl(url: string): Promise<Blob> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new PlayerCardExportError("No pudimos generar la imagen de la carta.");
  }
  const blob = await response.blob();
  if (blob.size < 32) {
    throw new PlayerCardExportError("No pudimos generar la imagen de la carta.");
  }
  return blob;
}

export function resolvePlayerCardElement(getter?: () => HTMLElement | null): HTMLElement | null {
  const fromRef = getter?.();
  if (fromRef && document.contains(fromRef)) return fromRef;
  return document.querySelector<HTMLElement>("[data-card-export]:not([data-card-export-clone])");
}

/** Exporta el nodo raíz de la carta (article) como PNG a pixelRatio 2. */
export async function exportPlayerCardElement(
  element: HTMLElement | null,
  fallbackUrl?: string,
): Promise<PlayerCardExportResult> {
  if (typeof document === "undefined") {
    throw new PlayerCardExportError("La exportación solo está disponible en el navegador.");
  }

  if (element) {
    try {
      return resultFromBlob(await captureVisibleCard(element));
    } catch (err) {
      if (!fallbackUrl) {
        if (err instanceof PlayerCardExportError) throw err;
        throw new PlayerCardExportError("No pudimos capturar la carta. Probá de nuevo o compartí el link.");
      }
    }
  }

  if (fallbackUrl) {
    try {
      return resultFromBlob(await captureFallbackUrl(fallbackUrl));
    } catch {
      throw new PlayerCardExportError("No pudimos capturar la carta. Probá de nuevo o compartí el link.");
    }
  }

  throw new PlayerCardExportError("No encontramos la carta para exportar.");
}

function attachDownloadAnchor(href: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.setAttribute("data-card-download", "true");
  anchor.style.position = "fixed";
  anchor.style.left = "0";
  anchor.style.top = "0";
  anchor.style.width = "1px";
  anchor.style.height = "1px";
  anchor.style.opacity = "0";
  document.body.appendChild(anchor);
  anchor.click();
  return anchor;
}

export function downloadPlayerCardBlob(blob: Blob, filename = PLAYER_CARD_EXPORT_FILENAME) {
  const url = URL.createObjectURL(blob);
  const anchor = attachDownloadAnchor(url, filename);
  globalThis.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 2500);
}

/** Descarga same-origin (p. ej. OG) sin pasar por canvas. */
export function downloadPlayerCardFromUrl(url: string, filename = PLAYER_CARD_EXPORT_FILENAME) {
  const anchor = attachDownloadAnchor(url, filename);
  globalThis.setTimeout(() => {
    anchor.remove();
  }, 2500);
}

export function canShareFiles(files: File[]): boolean {
  if (typeof navigator === "undefined" || typeof navigator.canShare !== "function") {
    return false;
  }
  try {
    return navigator.canShare({ files });
  } catch {
    return false;
  }
}
