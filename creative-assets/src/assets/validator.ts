import { stat, readFile } from "node:fs/promises";
import { AssetError } from "./types";
import { detectImageFormat } from "./image-format";

/**
 * AssetValidator: valida el archivo descargado (no confía en la extensión ni
 * en el Content-Type del servidor; verifica magic bytes reales).
 */

export interface ValidatedFile {
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  sha256: string;
}

export interface ValidatorLimits {
  minBytes: number;
  maxBytes: number;
}

export const DEFAULT_VALIDATOR_LIMITS: ValidatorLimits = {
  minBytes: 1024, // < 1KB nunca es una imagen útil
  maxBytes: 50 * 1024 * 1024,
};

export class AssetValidator {
  private limits: ValidatorLimits;

  constructor(limits?: Partial<ValidatorLimits>) {
    this.limits = { ...DEFAULT_VALIDATOR_LIMITS, ...limits };
  }

  /** Valida un archivo en disco y devuelve su info + sha256. */
  async validateFile(filePath: string): Promise<ValidatedFile> {
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      throw new AssetError("not_found", `El archivo no existe: ${filePath}`);
    }
    if (info.size < this.limits.minBytes) {
      throw new AssetError("empty_file", `El archivo es demasiado pequeño (${info.size} bytes < ${this.limits.minBytes}).`);
    }
    if (info.size > this.limits.maxBytes) {
      throw new AssetError(
        "file_too_large",
        `El archivo excede el límite (${info.size} > ${this.limits.maxBytes} bytes).`,
      );
    }

    const head = await readFile(filePath, { flag: "r" }).then(
      (buf) => buf.subarray(0, 512 * 1024),
      () => {
        throw new AssetError("storage_error", `No se pudo leer el archivo: ${filePath}`);
      },
    );

    const detected = detectImageFormat(head);
    if (!detected.ok) {
      if (detected.reason === "not_an_image") {
        throw new AssetError("not_an_image", "El contenido no es una imagen (¿HTML/texto disfrazado de .jpg?).");
      }
      throw new AssetError("unsupported_format", "Formato de imagen no soportado (solo JPEG, PNG, WEBP, GIF).");
    }

    const { createHash } = await import("node:crypto");
    const { createReadStream } = await import("node:fs");
    const sha256 = await hashFileStreaming(filePath, createHash, createReadStream);

    return {
      mimeType: detected.info.mimeType,
      extension: detected.info.extension,
      sizeBytes: info.size,
      width: detected.info.width,
      height: detected.info.height,
      sha256,
    };
  }
}

/** Hash en streaming (archivos grandes no se cargan en memoria). */
function hashFileStreaming(
  filePath: string,
  createHash: typeof import("node:crypto").createHash,
  createReadStream: typeof import("node:fs").createReadStream,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}
