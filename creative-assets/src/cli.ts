import { loadEnabledProviders, loadProviders } from "./providers/registry";
import { SearchEngine, SearchOutcome } from "./search-engine";
import { ProviderError, SearchImagesOptions } from "./providers/types";

/**
 * CLI de prueba del buscador.
 *
 * Uso:
 *   npm run search -- "football player"
 *   npm run search -- "soccer stadium night" --orientation landscape --limit 5
 *   npm run search -- "football player" --json
 */

interface CliArgs {
  query: string;
  json: boolean;
  limit: number;
  page: number;
  orientation?: "landscape" | "portrait" | "square";
  size?: "large" | "medium" | "small";
  color?: string;
  listProviders: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    query: "",
    json: false,
    limit: 10,
    page: 1,
    listProviders: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--json": args.json = true; break;
      case "--limit": args.limit = Number(argv[++i]); break;
      case "--page": args.page = Number(argv[++i]); break;
      case "--orientation": args.orientation = argv[++i] as CliArgs["orientation"]; break;
      case "--size": args.size = argv[++i] as CliArgs["size"]; break;
      case "--color": args.color = argv[++i]; break;
      case "--list-providers": args.listProviders = true; break;
      default:
        if (!a.startsWith("--") && !args.query) args.query = a;
    }
  }
  return args;
}

function summarize(url: string, max = 72): string {
  return url.length > max ? url.slice(0, max) + "…" : url;
}

function renderHuman(outcome: SearchOutcome): string {
  const lines: string[] = [];
  lines.push("SEARCH RESULTS");
  lines.push(`Query: "${outcome.query}" · ${outcome.totalResults} resultado(s)`);
  lines.push("");
  let n = 1;
  for (const byProvider of outcome.byProvider) {
    if (byProvider.error) {
      lines.push(`⚠ [${byProvider.providerId}] ${byProvider.error.message}`);
      lines.push("");
      continue;
    }
    for (const c of byProvider.results) {
      const r = c.result;
      lines.push(`${n}. [${r.provider}] ${r.title ?? "(sin título)"}`);
      lines.push(`   Author: ${r.author?.name ?? "?"}`);
      lines.push(`   Resolution: ${r.width ?? "?"}x${r.height ?? "?"} · Aspect ratio: ${r.aspectRatio ?? "?"}`);
      lines.push(`   Preview: ${summarize(r.previewUrl)}`);
      lines.push(`   Source:  ${summarize(r.sourceUrl ?? "?")}`);
      lines.push("");
      n++;
    }
  }
  if (outcome.totalResults === 0) lines.push("(sin resultados — prueba otra query)");
  return lines.join("\n");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.listProviders) {
    const all = await loadProviders();
    console.log(
      JSON.stringify(
        all.map((p) => ({ id: p.id, enabled: p.enabled, disabledReason: p.disabledReason ?? null })),
        null,
        2,
      ),
    );
    return;
  }

  if (!args.query) {
    console.error("Uso: npm run search -- \"query\" [--json] [--limit N] [--page N] [--orientation landscape|portrait|square] [--size large|medium|small] [--color COLOR] [--list-providers]");
    process.exitCode = 1;
    return;
  }

  const options: SearchImagesOptions = {
    query: args.query,
    limit: args.limit,
    page: args.page,
    orientation: args.orientation,
    size: args.size,
    color: args.color,
  };

  try {
    const providers = await loadEnabledProviders();
    const engine = new SearchEngine(providers);
    const outcome = await engine.searchImages(options);
    if (args.json) {
      console.log(JSON.stringify(outcome, null, 2));
    } else {
      console.log(renderHuman(outcome));
    }
  } catch (err) {
    if (err instanceof ProviderError) {
      console.error(err.message);
    } else {
      console.error("Error inesperado:", err instanceof Error ? err.message : err);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exitCode = 1;
});
