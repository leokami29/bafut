import sharp from "sharp";
import { ImageProcessor, ProcessorContext, ProcessorOutput, ProcessingError } from "./types";

/**
 * optimize({quality?}) — re-comprime el formato ACTUAL del asset:
 * - jpeg/webp: quality (default 80).
 * - png: compressionLevel (default 9) + palette opcional.
 * Sin cambio de dimensiones ni de formato.
 */
export class OptimizeProcessor implements ImageProcessor {
  readonly name = "optimize";
  readonly tool = "sharp";

  async process(ctx: ProcessorContext): Promise<ProcessorOutput> {
    const format = ctx.input.mimeType.replace("image/", "");
    const quality = typeof ctx.options.quality === "number" ? ctx.options.quality : 80;
    let pipe = sharp(ctx.inputPath);
    if (format === "jpeg" || format === "jpg") {
      pipe = pipe.jpeg({ quality, mozjpeg: true });
    } else if (format === "webp") {
      pipe = pipe.webp({ quality });
    } else if (format === "png") {
      pipe = pipe.png({ compressionLevel: 9, palette: ctx.options.palette !== false });
    } else {
      throw new ProcessingError(
        "invalid_options",
        `optimize no soporta el formato "${ctx.input.mimeType}". Convierte antes a jpeg/png/webp.`,
        "optimize",
      );
    }
    const info = await pipe.toFile(ctx.outputPath);
    return {
      mimeType: ctx.input.mimeType,
      extension: format === "jpg" ? "jpg" : format,
      width: info.width,
      height: info.height,
    };
  }
}
