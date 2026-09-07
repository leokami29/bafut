import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";
import { pendingSearchQueries } from "../../composition/campaign";
import { CompositionPlan } from "../../composition/types";

export const CompositionPlanSchema = z.object({
  canvas: z.object({
    width: z.number().int().min(64).max(8000),
    height: z.number().int().min(64).max(8000),
    preset: z.string().max(40).optional(),
  }),
  brandId: z.string().regex(/^[a-z0-9-]+$/i).max(64).optional(),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  layers: z.array(z.unknown()).min(1).max(30),
  assets: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(64),
        role: z.enum(["background", "hero", "decorative", "texture", "foreground", "logo"]),
        query: z.string().trim().max(200).optional(),
        sourceAssetId: z.string().regex(/^asset_[a-f0-9]{16}$/).optional(),
        requiresBackgroundRemoval: z.boolean().optional(),
        tags: z.array(z.string().max(40)).max(10).optional(),
        processing: z
          .array(z.object({ type: z.string().max(40), options: z.record(z.string(), z.unknown()).optional() }))
          .max(10)
          .optional(),
        minResolution: z.object({ width: z.number().int().min(1), height: z.number().int().min(1) }).optional(),
      }),
    )
    .max(20),
  safeArea: z
    .object({
      top: z.number().int().min(0),
      right: z.number().int().min(0),
      bottom: z.number().int().min(0),
      left: z.number().int().min(0),
    })
    .optional(),
});

export type CompositionPlanInput = z.infer<typeof CompositionPlanSchema>;

export const ResolveAssetPlanInput = z.object({
  plan: CompositionPlanSchema,
});

export type ResolveAssetPlanInputType = z.infer<typeof ResolveAssetPlanInput>;

export async function handleResolveAssetPlan(ctx: McpApplicationContext, input: ResolveAssetPlanInputType) {
  const plan = input.plan as unknown as CompositionPlan;
  // Validación semántica completa de fase 5 (referencias capa↔asset, textos, etc.)
  const { validatePlan } = await import("../../composition/types");
  const errors = validatePlan(plan);
  if (errors.length) {
    throw new McpToolError("VALIDATION_ERROR", "CompositionPlan inválido.", { errors });
  }
  if (plan.brandId) {
    try {
      await ctx.loadBrand(plan.brandId);
    } catch {
      throw new McpToolError("BRAND_NOT_FOUND", `Marca "${plan.brandId}" no encontrada (brands/<id>/brand.json).`);
    }
  }

  // Planificación/reconciliación: NO busca ni descarga automáticamente.
  const resolutions = await ctx.resolveAssetPlan(plan);
  const queries = [...new Set(pendingSearchQueries(resolutions).map((q) => q.query))];
  return {
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
        : ["process_asset (si falta)", "resolve_asset_plan", "emit_penpot_script"],
  };
}
