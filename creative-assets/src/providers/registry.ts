import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageProvider } from "./types";
import { PexelsProvider } from "./pexels-provider";
import { UnsplashProvider } from "./unsplash-provider";

/**
 * Registro de proveedores. Lee la declaración en config/sources.json
 * (multiproveedor por diseño) y construye las instancias habilitadas.
 */

interface SourcesConfig {
  providers?: Array<{
    id: string;
    enabled?: boolean;
    api_env_var?: string | null;
  }>;
}

const CONFIG_PATH = path.resolve(process.cwd(), "creative-assets", "config", "sources.json");

export interface RegisteredProvider {
  id: string;
  enabled: boolean;
  provider: ImageProvider;
  /** Razón por la que está deshabilitado (p. ej. sin API key). */
  disabledReason?: string;
}

async function loadSourcesConfig(): Promise<SourcesConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return JSON.parse(raw) as SourcesConfig;
  } catch {
    // Config ausente/inválida: no bloquea; se usan los defaults conocidos.
    return { providers: [] };
  }
}

const FACTORIES: Record<string, () => ImageProvider> = {
  pexels: () => new PexelsProvider(),
  unsplash: () => new UnsplashProvider(),
};

/** Devuelve todos los proveedores conocidos con su estado habilitado/deshabilitado. */
export async function loadProviders(): Promise<RegisteredProvider[]> {
  const config = await loadSourcesConfig();
  const declared = new Map<string, { enabled?: boolean; api_env_var?: string | null }>();
  for (const p of config.providers ?? []) {
    if (p && typeof p.id === "string") {
      declared.set(p.id, { enabled: p.enabled, api_env_var: p.api_env_var });
    }
  }

  const out: RegisteredProvider[] = [];
  for (const [id, factory] of Object.entries(FACTORIES)) {
    const entry = declared.get(id) ?? { enabled: false };
    const envVar = entry.api_env_var;
    const keyMissing = envVar ? !process.env[envVar] : false;
    const enabled = entry.enabled === true && !keyMissing;
    out.push({
      id,
      enabled,
      provider: factory(),
      disabledReason: entry.enabled === false ? "disabled en config/sources.json" : keyMissing ? `${envVar} no configurada` : undefined,
    });
  }
  return out;
}

/** Solo los proveedores listos para buscar. */
export async function loadEnabledProviders(): Promise<ImageProvider[]> {
  const all = await loadProviders();
  return all.filter((p) => p.enabled).map((p) => p.provider);
}
