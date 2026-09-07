import path from "node:path";
import { AssetDownloader } from "./downloader";
import { AssetValidator } from "./validator";
import { LocalAssetStorage } from "./storage";
import { JsonMetadataRepository } from "./metadata-repository";
import { AssetService } from "./asset-service";

/**
 * Puntos de montaje por defecto del sistema de assets (estructura Fase 1):
 *   creative-assets/assets/raw/        ← binarios
 *   creative-assets/assets/metadata/   ← JSON por asset
 *   creative-assets/temp/              ← descargas temporales
 */
const CREATIVE_ROOT = path.resolve(process.cwd(), "creative-assets");

export function buildAssetService() {
  const rawDir = path.join(CREATIVE_ROOT, "assets", "raw");
  const metadataDir = path.join(CREATIVE_ROOT, "assets", "metadata");
  const tempDir = path.join(CREATIVE_ROOT, "temp");

  const service = new AssetService({
    downloader: new AssetDownloader({ tempDir }),
    validator: new AssetValidator(),
    storage: new LocalAssetStorage(path.join(CREATIVE_ROOT, "assets")),
    metadata: new JsonMetadataRepository(metadataDir),
    tempDir,
  });

  return { service, paths: { creativeRoot: CREATIVE_ROOT, rawDir, metadataDir, tempDir } };
}
