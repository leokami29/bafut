import path from "node:path";
import { AssetValidator } from "../validator";
import { LocalAssetStorage } from "../storage";
import { JsonMetadataRepository } from "../metadata-repository";
import { defaultRegistry, ProcessorRegistry } from "./registry";
import { AssetProcessor } from "./asset-processor";

/**
 * Puntos de montaje del motor de procesamiento:
 *   creative-assets/assets/processed/  ← derivados, agrupados por asset padre
 *   creative-assets/temp/              ← workdirs temporales por pipeline
 */
const CREATIVE_ROOT = path.resolve(process.cwd(), "creative-assets");

export function buildAssetProcessor(opts: { registry?: ProcessorRegistry } = {}): {
  processor: AssetProcessor;
  registry: ProcessorRegistry;
  processedRoot: string;
  tempRoot: string;
} {
  const processedRoot = path.join(CREATIVE_ROOT, "assets", "processed");
  const tempRoot = path.join(CREATIVE_ROOT, "temp");
  const registry = opts.registry ?? defaultRegistry();
  const processor = new AssetProcessor({
    registry,
    storage: new LocalAssetStorage(path.join(CREATIVE_ROOT, "assets")),
    metadata: new JsonMetadataRepository(path.join(CREATIVE_ROOT, "assets", "metadata")),
    validator: new AssetValidator(),
    tempRoot,
  });
  return { processor, registry, processedRoot, tempRoot };
}
