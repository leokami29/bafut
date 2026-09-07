import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";
import { CompositionPlanSchema } from "./resolve-asset-plan";
import { CreativeBrief, validateBrief, validatePlan } from "../../composition/types";
import { normalizeCampaign, saveCampaign, pendingSearchQueries } from "../../composition/campaign";

export const CreateCampaignInput = z.object({
  brief: z.object({
    campaignId: z.string().regex(/^[a-z0-9-]+$/i).max(64),
    brandId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
    objective: z.string().trim().min(1).max(500),
    format: z.object({
      width: z.number().int().min(64).max(8000),
      height: z.number().int().min(64).max(8000),
      preset: z.string().max(40).optional(),
    }),
    headline: z.string().max(200).optional(),
    subheadline: z.string().max(200).optional(),
    body: z.string().max(500).optional(),
    callToAction: z.string().max(200).optional(),
    ctaUrl: z.string().regex(/^https?:\/\/\S+$/).max(300).optional(),
    visualStyle: z.string().max(200).optional(),
    targetAudience: z.string().max(200).optional(),
    requirements: z.array(z.string().max(200)).max(10).optional(),
  }),
  plan: CompositionPlanSchema,
});

export type CreateCampaignInputType = z.infer<typeof CreateCampaignInput>;

export async function handleCreateCampaign(ctx: McpApplicationContext, input: CreateCampaignInputType) {
  const brief = input.brief as unknown as CreativeBrief;
  const plan = input.plan as unknown as import("../../composition/types").CompositionPlan;

  const briefErrors = validateBrief(brief);
  const planErrors = validatePlan(plan);
  if (briefErrors.length || planErrors.length) {
    throw new McpToolError("VALIDATION_ERROR", "Brief o plan inválidos.", { briefErrors, planErrors });
  }
  if (plan.brandId) {
    try {
      await ctx.loadBrand(plan.brandId);
    } catch {
      throw new McpToolError("BRAND_NOT_FOUND", `Marca "${plan.brandId}" no encontrada (brands/<id>/brand.json).`);
    }
  }

  const normalized = normalizeCampaign({ brief, composition: plan });
  const resolutions = await ctx.resolveAssetPlan(normalized.composition);
  const queries = [...new Set(pendingSearchQueries(resolutions).map((q) => q.query))];

  const manifest = {
    brief: normalized.brief,
    composition: normalized.composition,
    status: queries.length ? "needs_assets" : "assets_ready",
    createdAt: new Date().toISOString(),
  } as const;
  const file = await saveCampaign(manifest);

  return {
    campaignId: normalized.brief.campaignId,
    status: manifest.status,
    manifestPath: file,
    assets: resolutions.map((r) => ({
      planRef: r.planItem.id,
      assetId: r.metadata?.id,
      role: r.planItem.role,
      status: r.status,
      query: r.planItem.query,
      requiredProcessing: r.pendingSteps.map((s) => ({ operation: s.type, options: s.options })),
    })),
    pendingQueries: queries,
    nextActions:
      queries.length > 0
        ? ["search_images", "download_asset", "process_asset", "resolve_asset_plan", "emit_penpot_script"]
        : ["resolve_asset_plan", "emit_penpot_script"],
  };
}
