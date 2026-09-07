import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import {
  CampaignManifest,
  CompositionPlan,
  CreativeBrief,
  FORMAT_PRESETS,
  AssetResolution,
  ProcessingStepSpec,
  validateBrief,
  validatePlan,
} from "./types";
import { MetadataRepository } from "../assets/metadata-repository";
import { buildAssetService } from "../assets/defaults";

const CREATIVE_ROOT = () => path.resolve(process.cwd(), "creative-assets");

export function campaignsDir(): string {
  return path.join(CREATIVE_ROOT(), "campaigns");
}

export function campaignDir(campaignId: string): string {
  return path.join(campaignsDir(), campaignId);
}

/** Aplica presets de formato y defaults al brief+composition. */
export function normalizeCampaign(input: { brief: CreativeBrief; composition: CompositionPlan }): { brief: CreativeBrief; composition: CompositionPlan } {
  const brief = { ...input.brief };
  const composition = { ...input.composition, assets: input.composition.assets ?? [] };

  // preset de formato gana si el brief lo declara
  const presetName = brief.format?.preset;
  if (presetName && FORMAT_PRESETS[presetName]) {
    const p = FORMAT_PRESETS[presetName];
    brief.format = { ...p };
    composition.canvas = { ...p };
  } else if (brief.format && !composition.canvas) {
    composition.canvas = { ...brief.format };
  }
  if (!brief.format) brief.format = { ...composition.canvas };
  composition.brandId = composition.brandId ?? brief.brandId;
  return { brief, composition };
}

export interface LoadedCampaign {
  manifest: CampaignManifest;
  errors: string[];
}

/** Carga y valida un campaign JSON ({brief, composition}). */
export async function loadCampaignFile(filePath: string): Promise<LoadedCampaign> {
  const raw = JSON.parse(await readFile(filePath, "utf8")) as { brief: CreativeBrief; composition?: CompositionPlan };
  const { brief, composition } = normalizeCampaign({ brief: raw.brief, composition: raw.composition ?? { canvas: raw.brief.format, layers: [], assets: [] } });
  const errors = [...validateBrief(brief), ...validatePlan(composition)];
  const manifest: CampaignManifest = {
    brief,
    composition,
    status: errors.length ? "draft" : "draft",
    createdAt: new Date().toISOString(),
  };
  return { manifest, errors };
}

/** Guarda el manifiesto en campaigns/<campaignId>/campaign.json. */
export async function saveCampaign(manifest: CampaignManifest): Promise<string> {
  const dir = campaignDir(manifest.brief.campaignId);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, "campaign.json");
  await writeFile(file, JSON.stringify(manifest, null, 2), "utf8");
  return file;
}

/**
 * Reconcilia el AssetPlan con el estado real del sistema:
 * - sourceAssetId existente → ready (o needs_processing si faltan pasos)
 * - sin asset → missing (requiere search + download)
 * `repo` inyectable para tests.
 */
export async function resolveAssetPlan(plan: CompositionPlan, repo?: MetadataRepository): Promise<AssetResolution[]> {
  const defaultService = repo ? null : buildAssetService().service;
  const getMeta = (id: string) => (repo ? repo.get(id) : defaultService!.getAsset(id));
  const out: AssetResolution[] = [];
  for (const item of plan.assets) {
    const pending: ProcessingStepSpec[] = [];
    let metadata = undefined;

    if (item.sourceAssetId) {
      metadata = (await getMeta(item.sourceAssetId)) ?? undefined;
      if (metadata) {
        if (item.requiresBackgroundRemoval && !isPngWithAlpha(metadata)) pending.push({ type: "remove-background" });
        for (const step of item.processing ?? []) pending.push(step);
      }
    }
    const status: AssetResolution["status"] = !metadata ? "missing" : pending.length ? "needs_processing" : "ready";
    out.push({ planItem: item, status, metadata, pendingSteps: pending });
  }
  return out;
}

function isPngWithAlpha(meta: { mimeType: string; hasTransparency?: boolean }): boolean {
  return meta.mimeType === "image/png" && meta.hasTransparency === true;
}

/** Lista de queries de búsqueda pendientes (para el agente). */
export function pendingSearchQueries(resolutions: AssetResolution[]): Array<{ id: string; query: string; role: string }> {
  return resolutions
    .filter((r) => r.status === "missing" && r.planItem.query)
    .map((r) => ({ id: r.planItem.id, query: r.planItem.query as string, role: r.planItem.role }));
}

/**
 * Validación de path para imágenes renderizadas (fase 9): el archivo DEBE vivir
 * dentro de campaigns/<campaignId>/. Rechaza: rutas relativas escapadas,
 * absolutas fuera del root, file:// y symlinks que escapen (realpath).
 */
export async function resolveRenderedImagePath(campaignId: string, inputPath: string): Promise<string> {
  if (!campaignId || !/^[a-z0-9-]+$/i.test(campaignId)) {
    throw new Error("campaignId inválido para resolver la imagen renderizada.");
  }
  if (inputPath.startsWith("file://") || inputPath.startsWith("\\\\")) {
    throw new Error("Esquema de ruta no permitido para la imagen renderizada.");
  }
  const allowedRoot = path.resolve(campaignDir(campaignId));
  const candidate = path.isAbsolute(inputPath) ? path.resolve(inputPath) : path.resolve(process.cwd(), inputPath);
  if (candidate !== allowedRoot && !candidate.startsWith(allowedRoot + path.sep)) {
    throw new Error(`La imagen renderizada debe estar dentro de campaigns/${campaignId}/ (contención de filesystem).`);
  }
  // symlinks: comparar realpath del archivo (si existe) contra el root real
  try {
    const { realpath } = await import("node:fs/promises");
    const real = await realpath(candidate);
    const realRoot = await realpath(allowedRoot);
    if (!real.startsWith(realRoot + path.sep)) {
      throw new Error("La ruta resuelta (symlink) escapa del directorio de campaña permitido.");
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes("escape")) throw err;
    // archivo inexistente aún: la contención por ruta ya fue validada
  }
  return candidate;
}
