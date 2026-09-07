import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { AssetMetadata } from "../types";
import { AssetStorage } from "../storage";
import { MetadataRepository } from "../metadata-repository";
import { AssetValidator } from "../validator";
import { ProcessorRegistry, defaultRegistry } from "./registry";
import { ProcessingError, ProcessAssetResult, ProcessingStep, ProcessingOperationRecord } from "./types";
import { detectTransparency } from "./sharp-utils";

/**
 * AssetProcessor: ejecuta pipelines sobre assets existentes.
 *
 * RAW intacto · temp intermedio · validación de cada output · assets derivados
 * · ids deterministas · idempotencia.
 *
 * ID determinista del derivado:
 *   id = "asset_" + sha256(`${parentAssetId}:${op}:${canonical(options)}`).slice(0,16)
 * La misma operación con las mismas opciones sobre el mismo asset devuelve SIEMPRE
 * el mismo id → idempotencia (si la metadata + archivo existen, se reutiliza).
 * El hash de contenido (sha256) sigue detectando duplicados reales aunque el id
 * difiera (p. ej. rembg con un modelo distinto).
 */

export interface AssetProcessorDeps {
  storage: AssetStorage;
  metadata: MetadataRepository;
  validator: AssetValidator;
  registry?: ProcessorRegistry;
  /** Directorio para workdirs temporales (defaults: creative-assets/temp). */
  tempRoot: string;
  /** Directorio raíz de procesados (defaults: creative-assets/assets/processed). */
  processedRoot?: string;
}

export async function processAsset(
  assetId: string,
  steps: ProcessingStep[],
  deps: AssetProcessorDeps,
): Promise<ProcessAssetResult> {
  if (!steps || steps.length === 0) {
    throw new ProcessingError("empty_pipeline", "El pipeline está vacío. Indica al menos una operación.");
  }
  const registry = deps.registry ?? defaultRegistry();
  for (const step of steps) {
    if (!step || typeof step.type !== "string") {
      throw new ProcessingError("unknown_operation", `Paso inválido: ${JSON.stringify(step)}`);
    }
    registry.get(step.type); // valida existencia de la operación temprano
  }
  const chain: ProcessAssetResult["chain"] = [];
  let currentMeta: AssetMetadata | null = await deps.metadata.get(assetId);
  if (!currentMeta) {
    throw new ProcessingError("asset_not_found", `No existe el asset ${assetId}.`);
  }

  let processedAny = false;
  for (const step of steps) {
    const processor = registry.get(step.type);
    const derivedId = deriveAssetId(currentMeta.id, step.type, step.options ?? {});
    const cachedMeta = await deps.metadata.get(derivedId);
    if (cachedMeta) {
      chain.push({ assetId: cachedMeta.id, operation: step.type, cached: true });
      currentMeta = cachedMeta;
      continue;
    }

    const output = await runSingleOperation(currentMeta, step, processor, deps);
    const record: ProcessingOperationRecord = {
      operation: step.type,
      tool: processor.tool,
      toolVersion: processor.toolVersion,
      options: step.options ?? {},
      timestamp: new Date().toISOString(),
      inputAssetId: currentMeta.id,
      outputAssetId: output.id,
    };
    output.processing = {
      operations: [...(currentMeta.processing?.operations ?? []), record],
    };
    output.parentAssetId = currentMeta.id;
    await deps.metadata.create(output);
    chain.push({ assetId: output.id, operation: step.type, cached: false });
    currentMeta = output;
    processedAny = true;
  }

  return {
    asset: currentMeta as AssetMetadata,
    processed: processedAny,
    cached: !processedAny,
    path: currentMeta.path,
    chain,
  };
}

/** Id determinista del derivado (idempotente por asset+operación+opciones). */
export function deriveAssetId(parentAssetId: string, operation: string, options: Record<string, unknown>): string {
  const canonical = JSON.stringify(sortKeys(options));
  const hash = createHash("sha256").update(`${parentAssetId}:${operation}:${canonical}`).digest("hex").slice(0, 16);
  return `asset_${hash}`;
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeys(v)]),
    );
  }
  return value;
}

/** Ejecuta una operación: copia input a temp → processor → valida → storage → metadata. */
async function runSingleOperation(
  inputMeta: AssetMetadata,
  step: ProcessingStep,
  processor: import("./types").ImageProcessor,
  deps: AssetProcessorDeps,
): Promise<AssetMetadata> {
  const workDir = await mkdtemp(path.join(deps.tempRoot, "proc_"));
  const inputPath = path.join(workDir, `input.${inputMeta.extension}`);
  const outputPath = path.join(workDir, "output.bin");
  try {
    await deps.storage.resolve(inputMeta.path); // contención: el input debe estar dentro del storage
    await copyFile(deps.storage.resolve(inputMeta.path), inputPath);

    await processor.process({
      inputPath,
      outputPath,
      input: {
        mimeType: inputMeta.mimeType,
        width: inputMeta.width,
        height: inputMeta.height,
        hasTransparency: inputMeta.hasTransparency,
      },
      options: step.options ?? {},
    });

    // Validar output REAL (magic bytes, límites, hash) — nunca confiar en el processor.
    const validated = await deps.validator.validateFile(outputPath);

    const derivedId = deriveAssetId(inputMeta.id, step.type, step.options ?? {});
    const storedFilename = `${derivedId}.${validated.extension}`;
    const relativePath = await deps.storage.save(outputPath, storedFilename, `processed/${inputMeta.id}`);

    const buffer = await readFile(deps.storage.resolve(relativePath));
    const hasTransparency =
      validated.extension === "png" || validated.extension === "webp" || validated.extension === "gif"
        ? await detectTransparency(buffer)
        : false;

    return {
      id: derivedId,
      provider: inputMeta.provider,
      providerAssetId: inputMeta.providerAssetId,
      originalFilename: inputMeta.originalFilename,
      storedFilename,
      path: relativePath,
      mimeType: validated.mimeType,
      extension: validated.extension,
      sizeBytes: validated.sizeBytes,
      width: validated.width ?? inputMeta.width,
      height: validated.height ?? inputMeta.height,
      aspectRatio:
        validated.width && validated.height
          ? Math.round((validated.width / validated.height) * 100) / 100
          : undefined,
      sha256: validated.sha256,
      sourceUrl: inputMeta.sourceUrl,
      originalUrl: inputMeta.originalUrl,
      previewUrl: inputMeta.previewUrl,
      author: inputMeta.author,
      license: inputMeta.license,
      tags: inputMeta.tags,
      downloadedAt: new Date().toISOString(),
      status: "ready",
      campaignId: inputMeta.campaignId,
      brandId: inputMeta.brandId,
      hasTransparency,
    };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** hasTransparency helper público para futuras fases (lectura directa). */
export async function assetHasTransparency(absPath: string): Promise<boolean> {
  const buffer = await sharp(absPath).toBuffer();
  return detectTransparency(buffer);
}

/** Fachada orientada a objeto para el agente/MCP. */
export class AssetProcessor {
  constructor(private deps: AssetProcessorDeps) {}

  processAsset(assetId: string, steps: ProcessingStep[]): Promise<ProcessAssetResult> {
    return processAsset(assetId, steps, this.deps);
  }

  getAsset(assetId: string): Promise<AssetMetadata | null> {
    return this.deps.metadata.get(assetId);
  }
}
