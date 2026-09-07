import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import path from "node:path";
import { ImageProcessor, ProcessorContext, ProcessorOutput, ProcessingError } from "./types";
import { sharpMetadata } from "./sharp-utils";

/**
 * RemoveBackgroundProcessor: invoca rembg LOCAL como proceso externo.
 *
 * - Comando configurable, SIEMPRE con argumentos separados (execFile, nunca
 *   concatenación de strings con datos variables).
 * - La ruta del comando se toma de config/processing.json o env
 *   (REMBG_COMMAND / REMBG_PYTHON); los paths de archivos los genera el sistema.
 * - Salida SIEMPRE PNG con transparencia; se re-verifica con Sharp.
 *
 * Requisitos (documentados en docs/image-processing.md):
 *   Python 3.10+ con `pip install rembg onnxruntime`
 *   (en este entorno: Python 3.13.3 y rembg 2.0.69 instalados; hace falta onnxruntime).
 */

export interface RembgRunner {
  (command: string[], timeoutMs: number): Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 120_000;

function resolveCommand(): string[] {
  const envCmd = process.env.REMBG_COMMAND;
  if (envCmd) return envCmd.split(" ").filter(Boolean);
  const python = process.env.REMBG_PYTHON ?? "python";
  return [python, "-m", "rembg", "i"];
}

const defaultRunner: RembgRunner = (command, timeoutMs) =>
  new Promise((resolve, reject) => {
    const [bin, ...args] = command;
    execFile(bin, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, _stdout, stderr) => {
      if (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === "ENOENT") {
          reject(new ProcessingError("tool_unavailable", `El comando "${bin}" no está disponible. Configura REMBG_COMMAND o instala rembg (pip install rembg onnxruntime).`, "remove-background"));
          return;
        }
        const detail = (stderr || err.message).slice(0, 800);
        reject(new ProcessingError("processor_failed", `rembg falló: ${detail}`, "remove-background"));
        return;
      }
      resolve();
    });
  });

export class RemoveBackgroundProcessor implements ImageProcessor {
  readonly name = "remove-background";
  readonly tool = "rembg";
  runner: RembgRunner;
  private commandProvider: () => string[];
  private timeoutMs: number;

  constructor(opts: { runner?: RembgRunner; command?: string[]; timeoutMs?: number } = {}) {
    this.runner = opts.runner ?? defaultRunner;
    this.commandProvider = opts.command ? () => opts.command! : resolveCommand;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async process(ctx: ProcessorContext): Promise<ProcessorOutput> {
    const command = [...this.commandProvider(), ctx.inputPath, ctx.outputPath];
    try {
      await this.runner(command, this.timeoutMs);
    } catch (err) {
      if (err instanceof ProcessingError) throw err;
      throw new ProcessingError("processor_failed", `rembg falló: ${err instanceof Error ? err.message : String(err)}`, "remove-background");
    }

    const exists = await stat(ctx.outputPath).catch(() => null);
    if (!exists || exists.size === 0) {
      throw new ProcessingError("output_invalid", "rembg no produjo archivo de salida.", "remove-background");
    }

    const meta = await sharpMetadata(ctx.outputPath);
    if (meta.format !== "png") {
      throw new ProcessingError("output_invalid", `rembg devolvió ${meta.format}; se esperaba PNG.`, "remove-background");
    }
    return {
      mimeType: "image/png",
      extension: "png",
      width: meta.width ?? ctx.input.width,
      height: meta.height ?? ctx.input.height,
      hasTransparency: meta.hasAlpha === true ? true : undefined,
    };
  }
}

/** Ruta del comando, expuesta para troubleshooting/docs. */
export function rembgCommand(): string[] {
  return resolveCommand();
}

export function ensureInsideTemp(outputPath: string, tempDir: string): void {
  if (!path.resolve(outputPath).startsWith(path.resolve(tempDir))) {
    throw new ProcessingError("output_invalid", "El output del processor escapó del directorio temporal.");
  }
}
