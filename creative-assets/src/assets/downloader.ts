import { createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { AssetError, sourceInfoFromResult } from "./types";
import { ImageSearchResult } from "../providers/types";

/**
 * AssetDownloader: descarga genérica (Pexels, Unsplash, IA, futuros).
 * No conoce proveedores: solo consume URLs ya normalizadas.
 *
 * Seguridad:
 * - Solo http/https.
 * - Verifica Content-Type image/*.
 * - Límite de tamaño aplicado MIENTRAS descarga (no confía en Content-Length).
 * - Escribe a streaming en un archivo temporal (no carga en memoria).
 * - El filename SIEMPRE lo genera el sistema; nunca la URL ni el usuario.
 */

export interface DownloaderLimits {
  maxBytes: number;
  timeoutMs: number;
  /** Bytes iniciales que se conservan para detectar formato por magic bytes. */
  sniffBytes: number;
}

export const DEFAULT_LIMITS: DownloaderLimits = {
  maxBytes: 50 * 1024 * 1024, // MAX_DOWNLOAD_SIZE = 50 MB
  timeoutMs: 60_000,
  sniffBytes: 512 * 1024,
};

export interface DownloadToFileResult {
  /** Ruta del archivo temporal descargado (temp/). */
  tempPath: string;
  sizeBytes: number;
  contentType: string;
  /** Primeros bytes para validación por magic bytes. */
  head: Buffer;
}

type FetchLike = typeof fetch;

export class AssetDownloader {
  private limits: DownloaderLimits;
  private tempDir: string;
  private fetcher: FetchLike;

  constructor(opts: { tempDir: string; limits?: Partial<DownloaderLimits>; fetcher?: FetchLike } = { tempDir: "" }) {
    this.limits = { ...DEFAULT_LIMITS, ...opts.limits };
    this.tempDir = opts.tempDir;
    this.fetcher = opts.fetcher ?? fetch;
  }

  /** Descarga el original de un ImageSearchResult a temp/. */
  async downloadFromResult(result: ImageSearchResult): Promise<DownloadToFileResult> {
    const url = result.originalUrl;
    if (!url || url.trim().length === 0) {
      throw new AssetError("empty_url", "El resultado no tiene originalUrl para descargar.");
    }
    const parsed = safeParseUrl(url);
    if (!parsed) {
      throw new AssetError("invalid_url", `URL inválida: ${truncate(url, 120)}`);
    }
    return this.download(url);
  }

  async download(url: string): Promise<DownloadToFileResult> {
    const parsed = safeParseUrl(url);
    if (!parsed) throw new AssetError("invalid_url", `URL inválida: ${truncate(url, 120)}`);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new AssetError("unsupported_scheme", `Esquema no permitido: ${parsed.protocol}`);
    }

    let response: Response;
    try {
      response = await this.fetcher(parsed.href, { redirect: "follow", signal: AbortSignal.timeout(this.limits.timeoutMs) });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AssetError("timeout", `La descarga excedió ${this.limits.timeoutMs}ms.`);
      }
      throw new AssetError("network", `Fallo de red descargando: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!response.ok) {
      throw new AssetError("http_error", `El servidor respondió ${response.status} ${response.statusText}.`, response.status);
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType && !contentType.startsWith("image/")) {
      throw new AssetError(
        "invalid_content_type",
        `Content-Type inesperado "${contentType}". Se esperaba image/* (¿es una página HTML?).`,
      );
    }

    await mkdir(this.tempDir, { recursive: true });
    const tempPath = path.join(this.tempDir, `dl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    if (!path.resolve(tempPath).startsWith(path.resolve(this.tempDir))) {
      throw new AssetError("storage_error", "Ruta de escritura fuera del directorio temporal.");
    }

    if (!response.body) {
      throw new AssetError("empty_file", "La respuesta no contiene cuerpo.");
    }

    // Streaming con límite de tamaño en vivo.
    let total = 0;
    const headChunks: Buffer[] = [];
    const dest = createWriteStream(tempPath);
    // Absorbe errores tardíos del stream (los reales se propagan por el flujo principal).
    dest.on("error", () => undefined);
    try {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        if (!chunk || chunk.length === 0) continue;
        total += chunk.length;
        if (total > this.limits.maxBytes) {
          throw new AssetError(
            "file_too_large",
            `El archivo excede el límite de ${Math.round(this.limits.maxBytes / 1024 / 1024)} MB.`,
          );
        }
        if (headChunks.length < this.limits.sniffBytes) {
          headChunks.push(Buffer.from(chunk));
        }
        if (!dest.write(chunk)) {
          await new Promise<void>((resolve) => dest.once("drain", resolve));
        }
      }
      await new Promise<void>((resolve) => dest.end(resolve));
      await new Promise<void>((resolve) => (dest.writableFinished ? resolve() : dest.once("close", resolve)));
    } catch (err) {
      // Libera el stream y cierra el archivo antes de limpiar (Windows retiene archivos abiertos).
      dest.destroy();
      await new Promise<void>((resolve) => dest.once("close", resolve));
      await unlinkQuiet(tempPath);
      throw err;
    }

    const info = await stat(tempPath).catch(() => null);
    if (!info || info.size === 0) {
      await unlinkQuiet(tempPath);
      throw new AssetError("empty_file", "La descarga produjo un archivo vacío.");
    }

    const head = Buffer.concat(headChunks).subarray(0, this.limits.sniffBytes);
    return { tempPath, sizeBytes: info.size, contentType, head };
  }

  sourceInfo(result: ImageSearchResult) {
    return sourceInfoFromResult(result);
  }
}

export function safeParseUrl(url: string): URL | null {
  try {
    const u = new URL(url);
    return u;
  } catch {
    return null;
  }
}

async function unlinkQuiet(p: string): Promise<void> {
  const { unlink } = await import("node:fs/promises");
  await unlink(p).catch(() => undefined);
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
