import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";
import { CompositionPlanSchema } from "./resolve-asset-plan";
import { CompositionPlan, requiredAssetIds, validatePlan } from "../../composition/types";
import { readFileSync } from "node:fs";

export const EmitPenpotScriptInput = z.object({
  compositionPlan: CompositionPlanSchema,
  /** Assets (ya descargados/procesados) para las capas de imagen. */
  assets: z
    .array(
      z.object({
        assetId: z.string().regex(/^asset_[a-f0-9]{16}$/),
        /** Referencia usada por las capas del plan (id del AssetPlanItem). Si falta,
         * se intenta deducir buscando el item con sourceAssetId === assetId. */
        planRef: z.string().trim().min(1).max(64).optional(),
      }),
    )
    .min(1)
    .max(20),
});

export type EmitPenpotScriptInputType = z.infer<typeof EmitPenpotScriptInput>;

export async function handleEmitPenpotScript(ctx: McpApplicationContext, input: EmitPenpotScriptInputType) {
  const plan = input.compositionPlan as unknown as CompositionPlan;
  const errors = validatePlan(plan);
  if (errors.length) {
    throw new McpToolError("VALIDATION_ERROR", "CompositionPlan inválido.", { errors });
  }

  // Resolver metadata de cada asset solicitado y construir los image assets
  // con la key que las capas esperan (planRef).
  const needed = new Set(requiredAssetIds(plan));
  const images: Array<{ key: string; name: string; mimeType: string; width: number; height: number; data: Buffer }> = [];
  const used: string[] = [];
  for (const entry of input.assets) {
    const meta = await ctx.assetService.getAsset(entry.assetId);
    if (!meta) {
      throw new McpToolError("ASSET_NOT_FOUND", `Asset ${entry.assetId} no existe. Descárgalo o procésalo primero.`, { assetId: entry.assetId });
    }
    const planRef =
      entry.planRef ??
      plan.assets.find((a) => a.sourceAssetId === entry.assetId)?.id ??
      entry.assetId;
    if (!needed.has(planRef)) continue;
    const abs = ctx.assetService.resolveAssetPath(meta.path); // contención validada por el storage
    const data = readFileSync(abs);
    images.push({
      key: planRef,
      name: meta.id,
      mimeType: meta.mimeType,
      width: meta.width ?? 1,
      height: meta.height ?? 1,
      data,
    });
    used.push(entry.assetId);
  }

  const missingRefs = [...needed].filter((ref) => !images.some((i) => i.key === ref));
  if (missingRefs.length > 0) {
    throw new McpToolError("INVALID_INPUT", "Faltan assets para las capas de imagen del plan.", { missing: missingRefs });
  }

  const brand = plan.brandId ? await ctx.loadBrand(plan.brandId) : null;
  const script = ctx.penpot.emit(plan, brand, images);

  return {
    script: script.script,
    format: "penpot-plugin-script",
    boardName: script.boardName,
    layerCount: plan.layers.length,
    assetsUsed: used,
    execution: {
      executedBy: "ai-agent",
      steps: script.steps,
      note: "El MCP NO ejecuta el script. Ejecútalo con penpot_execute_code (Penpot MCP) y exporta con penpot_export_shape.",
    },
  };
}
