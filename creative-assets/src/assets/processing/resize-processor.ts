import sharp from "sharp";
import { ImageProcessor, ProcessorContext, ProcessorOutput, ProcessingError } from "./types";
import { requirePositiveInt } from "./sharp-utils";

/** resize({width?, height?, fit?, position?, background?}) — preserva aspect ratio con una sola dimensión. */
export class ResizeProcessor implements ImageProcessor {
  readonly name = "resize";
  readonly tool = "sharp";

  async process(ctx: ProcessorContext): Promise<ProcessorOutput> {
    const o = ctx.options;
    const width = o.width !== undefined ? requirePositiveInt(o, "width") : undefined;
    const height = o.height !== undefined ? requirePositiveInt(o, "height") : undefined;
    if (!width && !height) {
      throw new ProcessingError("invalid_options", "resize requiere width y/o height.", "resize");
    }
    const fit = String(o.fit ?? (width && height ? "cover" : "inside")) as "cover" | "contain" | "inside" | "outside";
    if (!["cover", "contain", "inside", "outside"].includes(fit)) {
      throw new ProcessingError("invalid_options", `fit inválido: "${o.fit}". Usa cover|contain|inside|outside.`, "resize");
    }
    const position = typeof o.position === "string" ? o.position : undefined;

    let pipe = sharp(ctx.inputPath).resize({ width, height, fit, position, background: o.background ?? { r: 255, g: 255, b: 255, alpha: 1 } });
    if (fit === "contain") {
      pipe = pipe.png(); // contain introduce bandas: preserva transparencia
    }
    const info = await pipe.toFile(ctx.outputPath);
    return {
      mimeType: info.format === "jpeg" ? "image/jpeg" : `image/${info.format}`,
      extension: info.format === "jpeg" ? "jpg" : info.format ?? "png",
      width: info.width,
      height: info.height,
      hasTransparency: info.hasAlpha ? undefined : false,
    };
  }
}
