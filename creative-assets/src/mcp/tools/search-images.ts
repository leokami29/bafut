import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";
import { ImageSearchResult } from "../../providers/types";

export const SearchImagesInput = z.object({
  query: z.string().trim().min(1).max(200),
  orientation: z.enum(["landscape", "portrait", "square"]).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  limit: z.number().int().min(1).max(80).optional(),
  page: z.number().int().min(1).max(50).optional(),
  color: z.string().trim().max(30).optional(),
  provider: z.string().regex(/^[a-z0-9]+$/i).optional(),
});

export type SearchImagesInputType = z.infer<typeof SearchImagesInput>;

function summarize(result: ImageSearchResult) {
  return {
    candidateId: result.id,
    provider: result.provider,
    providerAssetId: result.metadata?.pexels_id !== undefined ? String(result.metadata.pexels_id) : undefined,
    title: result.title,
    thumbnailUrl: result.thumbnailUrl,
    previewUrl: result.previewUrl,
    originalUrl: result.originalUrl,
    width: result.width,
    height: result.height,
    aspectRatio: result.aspectRatio,
    author: result.author?.name,
    sourceUrl: result.sourceUrl,
    license: result.license,
  };
}

export async function handleSearchImages(ctx: McpApplicationContext, input: SearchImagesInputType) {
  const outcome = await ctx.searchEngine.searchImages({
    query: input.query,
    limit: input.limit ?? 10,
    page: input.page ?? 1,
    orientation: input.orientation,
    size: input.size,
    color: input.color,
  });

  let byProvider = outcome.byProvider;
  if (input.provider) {
    byProvider = byProvider.filter((o) => o.providerId === input.provider);
    if (byProvider.length === 0) {
      throw new McpToolError("INVALID_INPUT", `Provider "${input.provider}" no está habilitado.`, { enabled: outcome.byProvider.map((o) => o.providerId) });
    }
  }

  const errors = byProvider.filter((o) => o.error);
  const results = byProvider.flatMap((o) => o.results.map((c) => ({ ...summarize(c.result), status: c.status })));
  if (results.length === 0 && errors.length > 0) {
    const err = errors[0].error!;
    const code = err.code === "rate_limit" ? "RATE_LIMIT" : err.code === "timeout" ? "TIMEOUT" : "PROVIDER_ERROR";
    throw new McpToolError(code as never, err.message, { provider: errors[0].providerId });
  }

  return {
    query: input.query,
    totalResults: results.length,
    results,
    hint: "Elige un candidato y llama a download_asset con provider + providerAssetId (y la query usada).",
  };
}
