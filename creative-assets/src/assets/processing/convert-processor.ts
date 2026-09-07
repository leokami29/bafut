import sharp from "sharp";
import { ImageProcessor, ProcessorContext, ProcessorOutput } from "./types";
import { readFormat } from "./sharp-utils";

/**
 * convert({format: "jpeg"|"png"|"webp", quality?, background?}).
 *
 * Transparencia:
 * - PNG/WEBP conservan alfa.
 * - JPEG no soporta alfa: la transparencia se aplana sobre el fondo
 *   `background` (por defecto BLANCO #FFFFFF). Documentado: si el origen es
 *   un cutout con transparencia, convertir a JPEG añade el fondo.
 */
export class ConvertProcessor implements ImageProcessor {
  readonly name = "convert";
  readonly tool = "sharp";

  async process(ctx: ProcessorContext): Promise<ProcessorOutput> {
    const format = readFormat(ctx.options);
    const quality = typeof ctx.options.quality === "number" ? ctx.options.quality : undefined;
    let pipe = sharp(ctx.inputPath);
    if (format === "jpeg") {
      pipe = pipe.flatten({ background: ctx.options.background ?? "#FFFFFF" }).jpeg({ quality: quality ?? 85 });
    } else if (format === "png") {
      pipe = pipe.png({ compressionLevel: 6 });
    } else {
      pipe = pipe.webp({ quality: quality ?? 80 });
    }
    const info = await pipe.toFile(ctx.outputPath);
    return {
      mimeType: `image/${format}`,
      extension: format === "jpeg" ? "jpg" : format,
      width: info.width,
      height: info.height,
      hasTransparency: format === "jpeg" ? false : undefined,
    };
  }
}
