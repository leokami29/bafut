import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpApplicationContext, createContext, ContextOptions } from "./context";
import { SearchImagesInput, handleSearchImages } from "./tools/search-images";
import { DownloadAssetInput, handleDownloadAsset } from "./tools/download-asset";
import { ProcessAssetInput, handleProcessAsset } from "./tools/process-asset";
import { ResolveAssetPlanInput, handleResolveAssetPlan } from "./tools/resolve-asset-plan";
import { EmitPenpotScriptInput, handleEmitPenpotScript } from "./tools/emit-penpot-script";
import { CreateCampaignInput, handleCreateCampaign } from "./tools/create-campaign";
import { RankImageCandidatesInput, handleRankImageCandidates } from "./tools/rank-image-candidates";
import { CritiqueCompositionInput, handleCritiqueComposition } from "./tools/critique-composition";
import { McpToolError } from "./types";

/**
 * Creative Assets MCP — capa delgada de orquestación sobre los servicios
 * existentes (SearchEngine, AssetService, AssetProcessor, Composition).
 *
 * NO implementa lógica de Penpot: genera scripts con ScriptedPenpotAdapter
 * que el agente ejecuta con el Penpot MCP (penpot_execute_code).
 *
 * Comunicación exclusivamente por stdio. Logs → stderr.
 */

function log(...args: unknown[]): void {
  console.error("[creative-assets-mcp]", ...args);
}

function toToolError(err: unknown): McpToolError {
  if (err instanceof McpToolError) return err;
  const e = err as { code?: string; message?: string; name?: string };
  const message = e?.message ?? String(err);
  log("error:", message);
  if (e?.name === "AssetError") {
    const code = message.includes("not_found") || message.includes("empty_url") ? "ASSET_NOT_FOUND" : message.includes("invalid") ? "INVALID_INPUT" : "PROCESSING_ERROR";
    return new McpToolError(code as never, message);
  }
  if (e?.name === "ProcessingError") {
    const code = message.includes("tool_unavailable") ? "TOOL_UNAVAILABLE" : message.includes("unknown_operation") || message.includes("invalid_options") ? "INVALID_OPERATION" : "PROCESSING_ERROR";
    return new McpToolError(code as never, message);
  }
  if (message.includes("No se pudo cargar la marca")) return new McpToolError("BRAND_NOT_FOUND", message);
  return new McpToolError("PROVIDER_ERROR", message.slice(0, 300));
}

export function createMcpServer(ctx: McpApplicationContext): McpServer {
  const server = new McpServer(
    { name: "creative-assets-mcp", version: "0.1.0" },
    { instructions: "Creative Asset Orchestration Layer: search → select → download → process → compose → export (script de Penpot para penpot_execute_code)." },
  );

  server.tool(
    "search_images",
    "Busca imágenes reales en proveedores habilitados (p. ej. Pexels). NO descarga nada. Devuelve candidatos normalizados para que el agente seleccione.",
    SearchImagesInput.shape,
    async (input) => {
      try {
        const result = await handleSearchImages(ctx, SearchImagesInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "download_asset",
    "Descarga una imagen seleccionada y la registra como asset (validación, sha256, dedupe, metadata). Reutiliza assets ya descargados (deduplicated: true).",
    DownloadAssetInput.shape,
    async (input) => {
      try {
        const result = await handleDownloadAsset(ctx, DownloadAssetInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "process_asset",
    "Procesa un asset con un pipeline (remove-background, resize, crop, convert, optimize). Idempotente; produce assets derivados con parentAssetId.",
    ProcessAssetInput.shape,
    async (input) => {
      try {
        const result = await handleProcessAsset(ctx, ProcessAssetInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "resolve_asset_plan",
    "Reconcilia un CompositionPlan contra el inventario de assets: indica qué falta (search), qué necesita procesamiento y qué está listo. NO busca ni descarga.",
    ResolveAssetPlanInput.shape,
    async (input) => {
      try {
        const result = await handleResolveAssetPlan(ctx, ResolveAssetPlanInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "emit_penpot_script",
    "Genera un script (Penpot Plugin API) que compone la pieza en un board con capas, imágenes reales, gradientes, sombras y textos de marca. El script NO se ejecuta aquí: el agente lo ejecuta con penpot_execute_code (Penpot MCP).",
    EmitPenpotScriptInput.shape,
    async (input) => {
      try {
        const result = await handleEmitPenpotScript(ctx, EmitPenpotScriptInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "create_campaign",
    "Crea/actualiza una campaña: valida brief+plan, carga la marca, resuelve el AssetPlan y guarda el manifiesto. Devuelve estado y nextActions.",
    CreateCampaignInput.shape,
    async (input) => {
      try {
        const result = await handleCreateCampaign(ctx, CreateCampaignInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "rank_image_candidates",
    "Ordena candidatos de búsqueda por aptitud visual EXPLICABLE (resolución, aspect fit, orientación, composición, crop) para un rol y formato del plan. Solo metadata: no descarga, no procesa. Posición del sujeto/espacio negativo se reportan como unknown sin análisis de píxeles.",
    RankImageCandidatesInput.shape,
    async (input) => {
      try {
        const result = await handleRankImageCandidates(ctx, RankImageCandidatesInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  server.tool(
    "critique_composition",
    "Evalúa un CompositionPlan y devuelve un CritiqueReport explicable: issues accionables (jerarquía, safe areas, solapamientos, marca, referencia) con severidad y sugerencias. SOLO analiza: no modifica Penpot ni archivos. Sin render, las categorías visuales son unknown.",
    CritiqueCompositionInput.shape,
    async (input) => {
      try {
        const result = await handleCritiqueComposition(ctx, CritiqueCompositionInput.parse(input));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: JSON.stringify(toToolError(err).toJSON()) }] };
      }
    },
  );

  return server;
}

export async function startStdio(opts: ContextOptions = {}): Promise<McpServer> {
  const ctx = await createContext(opts);
  const server = createMcpServer(ctx);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log("server listo por stdio (tools: search_images, download_asset, process_asset, resolve_asset_plan, emit_penpot_script, create_campaign)");
  return server;
}

const isDirectRun = process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("mcp/server");
if (isDirectRun) {
  startStdio().catch((err) => {
    log("fatal:", err);
    process.exit(1);
  });
}
