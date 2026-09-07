import sharp from "sharp";
import { ImageProcessor, ProcessorContext, ProcessorOutput, ProcessingError } from "./types";
import { requirePositiveInt } from "./sharp-utils";

const POSITIONS: Record<string, string> = {
  center: "centre",
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

/**
 * crop({width, height, x?, y?, position?}).
 * - Con x/y: recorte exacto (debe caber dentro de la imagen).
 * - Con position (center|top|bottom|left|right): recorte proporcional tipo "cover".
 */
export class CropProcessor implements ImageProcessor {
  readonly name = "crop";
  readonly tool = "sharp";

  async process(ctx: ProcessorContext): Promise<ProcessorOutput> {
    const o = ctx.options;
    const width = requirePositiveInt(o, "width");
    const height = requirePositiveInt(o, "height");

    if (o.x !== undefined || o.y !== undefined) {
      const left = requirePositiveInt(o, "x", 100000);
      const top = requirePositiveInt(o, "y", 100000);
      const inputW = ctx.input.width ?? (await sharp(ctx.inputPath).metadata()).width ?? 0;
      const inputH = ctx.input.height ?? (await sharp(ctx.inputPath).metadata()).height ?? 0;
      if (left + width > inputW || top + height > inputH) {
        throw new ProcessingError(
          "invalid_options",
          `El recorte (${left},${top} ${width}x${height}) excede las dimensiones de la imagen (${inputW}x${inputH}).`,
          "crop",
        );
      }
      const info = await sharp(ctx.inputPath).extract({ left, top, width, height }).toFile(ctx.outputPath);
      return { mimeType: `image/${info.format}`, extension: info.format === "jpeg" ? "jpg" : info.format ?? "png", width: info.width, height: info.height };
    }

    const positionKey = String(o.position ?? "center");
    if (!POSITIONS[positionKey]) {
      throw new ProcessingError("invalid_options", `position inválido: "${positionKey}". Usa center|top|bottom|left|right.`, "crop");
    }
    const info = await sharp(ctx.inputPath)
      .resize({ width, height, fit: "cover", position: POSITIONS[positionKey] })
      .toFile(ctx.outputPath);
    return {
      mimeType: info.format === "jpeg" ? "image/jpeg" : `image/${info.format}`,
      extension: info.format === "jpeg" ? "jpg" : info.format ?? "png",
      width: info.width,
      height: info.height,
    };
  }
}
