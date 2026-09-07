import process from "node:process";
import { readFileSync } from "node:fs";
import { loadEnabledProviders } from "./providers/registry";
import { SearchEngine } from "./search-engine";
import { splitResultId } from "./assets/ids";
import { AssetError, AssetMetadata } from "./assets/types";
import { buildAssetService } from "./assets/defaults";
import { buildAssetProcessor } from "./assets/processing/defaults";
import { ImageSearchResult, SearchImagesOptions } from "./providers/types";
import { ProcessingStep, ProcessingError } from "./assets/processing/types";
import { loadCampaignFile, resolveAssetPlan, pendingSearchQueries, saveCampaign } from "./composition/campaign";
import { ScriptedPenpotAdapter } from "./composition/penpot-adapter";
import { loadBrand } from "./composition/brand";
import path from "node:path";

/**
 * CLI de assets:
 *   npm run asset:download -- pexels-123456 --query "football player"
 *   npm run asset:info -- asset_abc123...
 *   npm run asset:list
 *   npm run asset:process -- asset_abc --remove-background --resize 1080 --convert png
 *   npm run asset:process -- asset_abc --pipeline "remove-background,resize:1080"
 *   npm run asset:process -- asset_abc --pipeline-file pipeline.json
 */

function usage(): string {
  return [
    "Uso:",
    '  npm run asset:download -- <result-id> [--query "texto"] [--campaign id] [--brand id] [--tag t ...]',
    "  npm run asset:info -- <asset-id>",
    "  npm run asset:list [--json]",
    "  npm run asset:process -- <asset-id> [--remove-background] [--resize W[xH]] [--crop WxH[@position]]",
    "                          [--convert jpeg|png|webp] [--optimize [quality]]",
    '                          [--pipeline "remove-background,resize:1080,convert:png"] [--pipeline-file pipeline.json]',
  ].join("\n");
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function findResultById(resultId: string, query: string): Promise<ImageSearchResult> {
  const parsed = splitResultId(resultId);
  if (!parsed) {
    throw new AssetError("invalid_url", `ID de resultado no reconocido: ${resultId} (formato esperado: pexels-123456)`);
  }
  if (!query) {
    throw new AssetError(
      "empty_url",
      `No existe metadata para ${resultId}. Para descargarlo por primera vez indica la búsqueda que lo encontró: npm run asset:download -- ${resultId} --query "tu búsqueda"`,
    );
  }
  const providers = await loadEnabledProviders();
  const engine = new SearchEngine(providers);
  const options: SearchImagesOptions = { query, limit: 80, page: 1 };
  let target: ImageSearchResult | undefined;
  for (let page = 1; page <= 3 && !target; page++) {
    options.page = page;
    const outcome = await engine.searchImages(options);
    target = outcome.candidates.map((c) => c.result).find((r) => r.id === resultId.trim());
  }
  if (!target) {
    throw new AssetError("not_found", `No se encontró ${resultId} en las primeras páginas de la búsqueda "${query}".`);
  }
  return target;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const rest = argv.slice(1);
  const { service, paths } = buildAssetService();

  switch (command) {
    case "download": {
      const resultId = rest.find((a) => !a.startsWith("--"));
      if (!resultId) {
        console.error(usage());
        process.exitCode = 1;
        return;
      }
      const query = argValue(rest, "--query") ?? "";
      const campaignId = argValue(rest, "--campaign");
      const brandId = argValue(rest, "--brand");
      const tags = rest
        .map((a, i) => (a === "--tag" ? rest[i + 1] : undefined))
        .filter((t): t is string => Boolean(t));

      const existing = await service.getAsset(await idFromResultId(resultId));
      if (existing) {
        console.log(`Ya existe (nada que descargar): ${existing.id} → ${existing.path}`);
        return;
      }
      const result = await findResultById(resultId, query);
      const outcome = await service.downloadAsset(result, { campaignId, brandId, tags });
      printDownload(outcome.asset, outcome.downloaded, outcome.duplicate);
      return;
    }

    case "info": {
      const id = rest.find((a) => !a.startsWith("--"));
      if (!id) {
        console.error(usage());
        process.exitCode = 1;
        return;
      }
      const meta = await service.getAsset(id);
      if (!meta) {
        console.error(`No existe metadata para el asset ${id}.`);
        process.exitCode = 1;
        return;
      }
      console.log(JSON.stringify(meta, null, 2));
      return;
    }

    case "list": {
      const json = rest.includes("--json");
      const all = await service.listAssets();
      if (json) {
        console.log(JSON.stringify(all, null, 2));
        return;
      }
      if (all.length === 0) {
        console.log("(sin assets aún — usa npm run asset:download)");
        return;
      }
      for (const m of all) {
        console.log(
          `${m.id}  ${m.provider}/${m.providerAssetId ?? "?"}  ${m.width ?? "?"}x${m.height ?? "?"}  ${formatBytes(m.sizeBytes)}  ${m.status}  ${m.path}`,
        );
      }
      console.log(`\nTotal: ${all.length} asset(s) · metadata en ${paths.metadataDir}`);
      return;
    }

    case "process": {
      const assetId = rest.find((a, i) => !a.startsWith("--") && rest[i - 1] !== "--query");
      if (!assetId) {
        console.error(usage());
        process.exitCode = 1;
        return;
      }
      const steps = parseProcessArgs(rest.filter((a) => a !== assetId));
      if (steps.length === 0) {
        console.error(usage());
        process.exitCode = 1;
        return;
      }
      const { processor } = buildAssetProcessor();
      const outcome = await processor.processAsset(assetId, steps);
      printProcess(outcome);
      return;
    }

    case "campaign": {
      const file = rest.find((a) => !a.startsWith("--"));
      if (!file) {
        console.error("Uso: npm run campaign:create -- <campaign.json> [--emit-script]");
        process.exitCode = 1;
        return;
      }
      const emitScript = rest.includes("--emit-script");
      const { manifest, errors } = await loadCampaignFile(file);
      if (errors.length) {
        console.error("Campaign JSON inválido:");
        for (const e of errors) console.error(" - " + e);
        process.exitCode = 1;
        return;
      }
      const plan = manifest.composition;
      console.log(`Campaña: ${manifest.brief.campaignId} · ${plan.canvas.width}x${plan.canvas.height} · marca: ${plan.brandId ?? "(ninguna)"}`);
      console.log(`Capas (${plan.layers.length}, el orden = z-index):`);
      for (const l of plan.layers) console.log(`  - [${l.type}] ${l.role}${l.position ? " @" + l.position : ""}`);

      const resolutions = await resolveAssetPlan(plan);
      console.log("\nAssets:");
      for (const r of resolutions) {
        const state = r.status === "ready" ? "LISTO" : r.status === "needs_processing" ? "PROCESAR" : "FALTA";
        console.log(`  - [${state}] ${r.planItem.id} (${r.planItem.role})${r.planItem.query ? ` query: "${r.planItem.query}"` : ""}`);
        if (r.pendingSteps.length) console.log(`      pipeline: ${r.pendingSteps.map((s) => s.type).join(" → ")}`);
      }
      const missing = pendingSearchQueries(resolutions);
      if (missing.length) {
        console.log("\nBúsquedas pendientes (ejecutar con npm run search --):");
        for (const m of missing) console.log(`  - ${m.id}: "${m.query}"`);
      }

      manifest.status = missing.length ? "draft" : "assets_ready";
      const saved = await saveCampaign(manifest);
      console.log(`\nManifiesto: ${saved}`);

      if (emitScript) {
        if (missing.length) {
          console.log("\n--emit-script omitido: faltan assets. Descárgalos y procésalos primero.");
          process.exitCode = 1;
          return;
        }
        const brand = plan.brandId ? await loadBrand(plan.brandId) : null;
        const images = [];
        const { service } = buildAssetService();
        for (const r of resolutions) {
          if (!r.metadata) continue;
          const abs = service.resolveAssetPath(r.metadata.path);
          images.push({ key: r.planItem.id, name: r.planItem.id, mimeType: r.metadata.mimeType, width: r.metadata.width ?? 1, height: r.metadata.height ?? 1, data: readFileSync(abs) });
        }
        const script = new ScriptedPenpotAdapter().emit(plan, brand, images);
        const dir = path.join(path.dirname(saved), "penpot");
        await import("node:fs/promises").then((fs) => fs.mkdir(dir, { recursive: true }));
        const scriptFile = path.join(dir, "compose.js");
        await import("node:fs/promises").then((fs) => fs.writeFile(scriptFile, script.script, "utf8"));
        console.log(`\nScript de Penpot generado: ${scriptFile}`);
        console.log("Pasos (los ejecuta el agente con las herramientas penpot_*):");
        script.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
      }
      return;
    }

    default:
      console.error(usage());
      process.exitCode = command ? 1 : 0;
  }
}

/** Convierte flags CLI en pasos de pipeline: --resize 1080 → {type:"resize", options:{width:1080}}. */
export function parseProcessArgs(args: string[]): ProcessingStep[] {
  const steps: ProcessingStep[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = args[i + 1];
    if (a === "--remove-background") {
      steps.push({ type: "remove-background" });
    } else if (a === "--resize" && next) {
      i++;
      const [w, h] = next.split("x").map(Number);
      const options: Record<string, unknown> = { width: w };
      if (h && Number.isFinite(h)) options.height = h;
      steps.push({ type: "resize", options });
    } else if (a === "--crop" && next) {
      i++;
      const [dims, position] = next.split("@");
      const [w, h] = dims.split("x").map(Number);
      const options: Record<string, unknown> = { width: w, height: h };
      if (position) options.position = position;
      steps.push({ type: "crop", options });
    } else if (a === "--convert" && next) {
      i++;
      steps.push({ type: "convert", options: { format: next } });
    } else if (a === "--optimize") {
      const quality = next && !next.startsWith("--") ? Number(next) : undefined;
      if (quality !== undefined && Number.isFinite(quality)) i++;
      steps.push({ type: "optimize", options: quality !== undefined ? { quality } : {} });
    } else if (a === "--pipeline" && next) {
      i++;
      steps.push(...parsePipelineString(next));
    } else if (a === "--pipeline-file" && next) {
      i++;
      const parsed = JSON.parse(readFileSync(next, "utf8")) as { assetId?: string; operations: ProcessingStep[] };
      steps.push(...(parsed.operations ?? []).map((op) => ({ type: op.type, options: op.options ?? {} })));
    }
  }
  return steps;
}

/** "remove-background,resize:1080,convert:png,optimize:80" → pasos. */
export function parsePipelineString(pipeline: string): ProcessingStep[] {
  return pipeline
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const [type, arg] = token.split(":");
      switch (type) {
        case "remove-background":
          return { type };
        case "resize": {
          const [w, h] = (arg ?? "").split("x").map(Number);
          const options: Record<string, unknown> = { width: w };
          if (h && Number.isFinite(h)) options.height = h;
          return { type, options };
        }
        case "crop": {
          const [dims, position] = (arg ?? "").split("@");
          const [w, h] = dims.split("x").map(Number);
          const options: Record<string, unknown> = { width: w, height: h };
          if (position) options.position = position;
          return { type, options };
        }
        case "convert":
          return { type, options: { format: arg } };
        case "optimize":
          return { type, options: arg ? { quality: Number(arg) } : {} };
        default:
          throw new ProcessingError("unknown_operation", `Operación desconocida en --pipeline: "${type}"`, type);
      }
    });
}

function printProcess(outcome: { asset: AssetMetadata; processed: boolean; cached: boolean; path: string; chain: Array<{ assetId: string; operation: string; cached: boolean }> }): void {
  const lines: string[] = [];
  lines.push(outcome.cached && !outcome.processed ? "Asset derivado ya existía — reutilizado (idempotente)" : "Asset processed successfully");
  lines.push("");
  lines.push("Cadena de derivación:");
  for (const c of outcome.chain) {
    lines.push(`  ${c.cached ? "↻" : "→"} ${c.operation} → ${c.assetId}${c.cached ? " (cache)" : ""}`);
  }
  lines.push("");
  lines.push(`Derived Asset ID:\n${outcome.asset.id}`);
  lines.push(`Parent Asset ID:\n${outcome.asset.parentAssetId ?? "?"}`);
  lines.push(`File:\n${outcome.asset.path}`);
  lines.push(`Resolution:\n${outcome.asset.width ?? "?"}x${outcome.asset.height ?? "?"}`);
  lines.push(`Size:\n${formatBytes(outcome.asset.sizeBytes)} (${outcome.asset.mimeType})`);
  lines.push(`Transparency:\n${outcome.asset.hasTransparency === true ? "sí" : "no"}`);
  lines.push(`SHA256:\n${outcome.asset.sha256}`);
  lines.push(`Status:\n${outcome.asset.status}`);
  console.log(lines.join("\n"));
}

async function idFromResultId(resultId: string): Promise<string> {
  const { computeAssetId } = await import("./assets/ids");
  const parsed = splitResultId(resultId);
  if (!parsed) return resultId; // quizá ya es un asset id
  // El id interno requiere la originalUrl como fallback, pero si el proveedor
  // expone id numérico, el basis es estable sin URL:
  return computeAssetId({ provider: parsed.provider, providerAssetId: parsed.providerAssetId });
}

function printDownload(asset: AssetMetadata, downloaded: boolean, duplicate: boolean): void {
  const lines = [
    downloaded && !duplicate ? "Asset downloaded successfully" : duplicate ? "Asset duplicado — se reutiliza el existente" : "Asset existente",
    "",
    `Asset ID:\n${asset.id}`,
    `Provider:\n${asset.provider} (ID: ${asset.providerAssetId ?? "?"})`,
    `File:\n${asset.path}`,
    `Resolution:\n${asset.width ?? "?"}x${asset.height ?? "?"}`,
    `Size:\n${formatBytes(asset.sizeBytes)} (${asset.mimeType})`,
    `SHA256:\n${asset.sha256}`,
    `Status:\n${asset.status}`,
    `License:\n${asset.license ?? "?"}`,
  ];
  console.log(lines.join("\n"));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

main().catch((err) => {
  if (err instanceof AssetError || err instanceof ProcessingError) {
    console.error(err.message);
  } else {
    console.error("Error inesperado:", err instanceof Error ? err.message : err);
  }
  process.exitCode = 1;
});
