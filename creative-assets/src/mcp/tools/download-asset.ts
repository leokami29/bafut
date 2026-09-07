import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";

export const DownloadAssetInput = z
  .object({
    resultId: z.string().regex(/^[a-z0-9]+-[a-z0-9_-]+$/i).optional(),
    provider: z.string().regex(/^[a-z0-9]+$/i).optional(),
    providerAssetId: z.string().regex(/^[a-zA-Z0-9_-]+$/).max(64).optional(),
    query: z.string().trim().max(200).optional(),
    campaignId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
    brandId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  })
  .refine((v) => Boolean(v.resultId) || (v.provider && v.providerAssetId), {
    message: "Proporciona resultId (p. ej. pexels-123456) o provider + providerAssetId.",
  });

export type DownloadAssetInputType = z.infer<typeof DownloadAssetInput>;

export async function handleDownloadAsset(ctx: McpApplicationContext, input: DownloadAssetInputType) {
  const provider = input.provider ?? input.resultId?.split("-")[0];
  const providerAssetId = input.providerAssetId ?? input.resultId?.split("-").slice(1).join("-");
  const resultId = input.resultId ?? `${provider}-${providerAssetId}`;

  // cached / dedupe: el AssetService ya lo maneja por identidad y sha256.
  // Si ya conocemos el asset (descarga previa), lo devolvemos sin re-descargar.
  // computeAssetId es determinista (provider:providerAssetId), pero requiere la
  // originalUrl como fallback; para no duplicar lógica, delegamos en el servicio:
  const { computeAssetId } = await import("../../assets/ids");
  const guessedId = computeAssetId({ provider: provider!, providerAssetId: providerAssetId! });
  const existing = await ctx.assetService.getAsset(guessedId);
  if (existing) {
    return summarizeAsset(existing, {
      downloaded: false,
      duplicate: true,
      path: existing.path,
    });
  }

  // Primera descarga: localizar el resultado vía búsqueda con la query.
  if (!input.query) {
    throw new McpToolError(
      "INVALID_INPUT",
      `Primera descarga de ${resultId} requiere "query" (la búsqueda que lo encontró) para localizar su URL original.`,
      { resultId },
    );
  }
  const result = await ctx.findResultById(provider!, providerAssetId!, input.query);
  const outcome = await ctx.assetService.downloadAsset(
    result,
    { campaignId: input.campaignId, brandId: input.brandId, tags: input.tags },
  );
  return summarizeAsset(outcome.asset, {
    downloaded: outcome.downloaded,
    duplicate: outcome.duplicate,
    path: outcome.path,
  });
}

function summarizeAsset(
  asset: import("../../assets/types").AssetMetadata,
  extra: { downloaded: boolean; duplicate: boolean; path: string },
) {
  return {
    assetId: asset.id,
    parentAssetId: asset.parentAssetId,
    status: asset.status,
    downloaded: extra.downloaded,
    deduplicated: extra.duplicate,
    path: extra.path,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    sha256: asset.sha256,
    hasTransparency: asset.hasTransparency ?? false,
    license: asset.license,
    hint: "Usa assetId en process_asset para generar cutouts/redimensionados.",
  };
}
