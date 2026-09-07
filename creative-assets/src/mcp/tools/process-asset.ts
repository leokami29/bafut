import { z } from "zod";
import { McpToolError } from "../types";
import { McpApplicationContext } from "../context";

export const ProcessAssetInput = z.object({
  assetId: z.string().regex(/^asset_[a-f0-9]{16}$/),
  steps: z
    .array(
      z.object({
        operation: z.string().regex(/^[a-z-]+$/).max(40),
        options: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1)
    .max(10),
});

export type ProcessAssetInputType = z.infer<typeof ProcessAssetInput>;

export async function handleProcessAsset(ctx: McpApplicationContext, input: ProcessAssetInputType) {
  // Solo operaciones registradas por el ProcessorRegistry (seguridad).
  for (const step of input.steps) {
    try {
      ctx.registry.get(step.operation);
    } catch {
      throw new McpToolError(
        "INVALID_OPERATION",
        `Operación no registrada: "${step.operation}". Disponibles: ${ctx.registry.names().join(", ")}.`,
        { operation: step.operation },
      );
    }
  }

  // Contratos reales de fase 4 (ProcessingStep: {type, options}).
  const steps = input.steps.map((s) => ({ type: s.operation, options: s.options }));
  const outcome = await ctx.assetProcessor.processAsset(input.assetId, steps);
  const a = outcome.asset;
  return {
    assetId: a.id,
    parentAssetId: a.parentAssetId,
    status: a.status,
    cached: outcome.cached,
    path: a.path,
    mimeType: a.mimeType,
    hasTransparency: a.hasTransparency ?? false,
    width: a.width,
    height: a.height,
    sha256: a.sha256,
    chain: outcome.chain,
    hint: "Usa este assetId en emit_penpot_script o sigue encadenando process_asset.",
  };
}
