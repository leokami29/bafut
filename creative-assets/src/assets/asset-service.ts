import { unlink } from "node:fs/promises";
import { ImageSearchResult } from "../providers/types";
import { AssetDownloader } from "./downloader";
import { AssetValidator, DEFAULT_VALIDATOR_LIMITS, ValidatorLimits } from "./validator";
import { AssetStorage } from "./storage";
import { MetadataRepository } from "./metadata-repository";
import { fileHasTransparency } from "./processing/sharp-utils";
import {
  AssetError,
  AssetMetadata,
  DownloadAssetResult,
  DownloadOptions,
  sourceInfoFromResult,
} from "./types";
import { computeAssetId } from "./ids";

/**
 * AssetService: orquesta download → validate → store → metadata.
 * SEARCH = encontrar · Downloader = descargar · Validator = validar
 * Storage = guardar · MetadataRepository = persistir.
 */

export interface AssetServiceDeps {
  downloader: AssetDownloader;
  validator: AssetValidator;
  storage: AssetStorage;
  metadata: MetadataRepository;
  /** Directorio temporal para descargas (creative-assets/temp). */
  tempDir: string;
  validatorLimits?: Partial<ValidatorLimits>;
}

export class AssetService {
  private deps: AssetServiceDeps;
  private limits: Partial<ValidatorLimits>;

  constructor(deps: AssetServiceDeps) {
    this.deps = deps;
    this.limits = deps.validatorLimits ?? DEFAULT_VALIDATOR_LIMITS;
  }

  /**
   * Descarga un resultado de búsqueda y lo convierte en asset listo.
   * Dedupe: por identidad (provider+providerAssetId) y por contenido (sha256).
   */
  async downloadAsset(result: ImageSearchResult, options: DownloadOptions = {}): Promise<DownloadAssetResult> {
    const info = sourceInfoFromResult(result);
    if (!info.provider) throw new AssetError("invalid_url", "El resultado no tiene proveedor.");
    if (!info.originalUrl) throw new AssetError("empty_url", "El resultado no tiene originalUrl para descargar.");

    const id = computeAssetId({
      provider: info.provider,
      providerAssetId: info.providerAssetId,
      originalUrl: info.originalUrl,
    });

    // 1. Ya descargado antes (misma identidad)?
    const existingByIdentity = await this.deps.metadata.findByIdentity(info.provider, info.providerAssetId ?? "");
    if (existingByIdentity) {
      return {
        asset: existingByIdentity,
        downloaded: false,
        duplicate: true,
        path: existingByIdentity.path,
      };
    }

    // 2. Descargar a temp (streaming, límites).
    const downloaded = await this.deps.downloader.downloadFromResult(result);

    // 3. Validar contenido real (magic bytes + límites + hash).
    const validator = options.maxBytes
      ? new AssetValidator({ ...this.limits, maxBytes: options.maxBytes })
      : new AssetValidator(this.limits);
    let validated;
    try {
      validated = await validator.validateFile(downloaded.tempPath);
    } catch (err) {
      await unlink(downloaded.tempPath).catch(() => undefined);
      throw err;
    }

    // 4. Dedupe por contenido: ¿ya existe un asset con este sha256?
    const existingByHash = await this.deps.metadata.findByHash(validated.sha256);
    if (existingByHash) {
      await unlink(downloaded.tempPath).catch(() => undefined);
      return {
        asset: existingByHash,
        downloaded: false,
        duplicate: true,
        path: existingByHash.path,
      };
    }

    // 5. Almacenar con nombre determinista {assetId}.{ext}.
    const storedFilename = `${id}.${validated.extension}`;
    const relativePath = await this.deps.storage.save(downloaded.tempPath, storedFilename, "raw");
    await unlink(downloaded.tempPath).catch(() => undefined);

    // Transparencia real (canal alfa con valores < 255), para png/webp/gif.
    const hasTransparency = ["png", "webp", "gif"].includes(validated.extension)
      ? await fileHasTransparency(this.deps.storage.resolve(relativePath))
      : false;

    // 6. Persistir metadata.
    const metadata: AssetMetadata = {
      id,
      provider: info.provider,
      providerAssetId: info.providerAssetId,
      originalFilename: storedFilename,
      storedFilename,
      path: relativePath,
      mimeType: validated.mimeType,
      extension: validated.extension,
      sizeBytes: validated.sizeBytes,
      width: validated.width ?? info.width,
      height: validated.height ?? info.height,
      aspectRatio:
        validated.width && validated.height
          ? Math.round((validated.width / validated.height) * 100) / 100
          : undefined,
      sha256: validated.sha256,
      sourceUrl: info.sourceUrl,
      originalUrl: info.originalUrl,
      previewUrl: info.previewUrl,
      author: info.author,
      license: info.license,
      tags: options.tags,
      downloadedAt: new Date().toISOString(),
      status: "ready",
      hasTransparency,
      campaignId: options.campaignId,
      brandId: options.brandId,
      processing: { operations: [] },
    };
    await this.deps.metadata.create(metadata);

    return { asset: metadata, downloaded: true, duplicate: false, path: relativePath };
  }

  async getAsset(id: string): Promise<AssetMetadata | null> {
    return this.deps.metadata.get(id);
  }

  /** Ruta absoluta de un asset (para PenpotAdapter y herramientas externas). */
  resolveAssetPath(relativePath: string): string {
    return this.deps.storage.resolve(relativePath);
  }

  async listAssets(): Promise<AssetMetadata[]> {
    return this.deps.metadata.list();
  }
}
