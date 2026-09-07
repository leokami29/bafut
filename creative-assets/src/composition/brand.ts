import { readFile } from "node:fs/promises";
import path from "node:path";
import { BrandStyles } from "./types";

/**
 * Integración con el sistema de marca (Fase 1).
 * La MARCA tiene prioridad: la composición no inventa colores ni fuentes
 * si brand.json los define.
 */

const CREATIVE_ROOT = path.resolve(process.cwd(), "creative-assets");

export function brandDir(brandId: string): string {
  return path.join(CREATIVE_ROOT, "brands", brandId);
}

export function brandJsonPath(brandId: string): string {
  return path.join(brandDir(brandId), "brand.json");
}

interface BrandJson {
  id: string;
  colors: Record<string, { hex: string } | string>;
  typography?: { display?: { family: string }; body?: { family: string }; mono?: { family: string } };
  tagline?: string;
  links?: { production?: string };
  assets_registered?: { logos?: string[] };
}

/** Carga y normaliza brands/[id]/brand.json → BrandStyles. */
export async function loadBrand(brandId: string): Promise<BrandStyles> {
  let raw: BrandJson;
  try {
    raw = JSON.parse(await readFile(brandJsonPath(brandId), "utf8")) as BrandJson;
  } catch {
    throw new Error(`No se pudo cargar la marca "${brandId}" (${brandJsonPath(brandId)}). Verifica brands/<id>/brand.json.`);
  }
  const colors: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw.colors ?? {})) {
    colors[k] = typeof v === "string" ? v : v.hex;
  }
  return {
    id: raw.id ?? brandId,
    colors,
    fonts: {
      display: raw.typography?.display?.family ?? "Barlow Condensed",
      body: raw.typography?.body?.family ?? "Outfit",
      mono: raw.typography?.mono?.family ?? "IBM Plex Mono",
    },
    tagline: raw.tagline,
    website: raw.links?.production,
  };
}

/** Resuelve un color: hex directo o token de marca ("flood" → #FFD25A). */
export function resolveColor(brand: BrandStyles | null, color?: string, brandToken?: string): string | undefined {
  if (brandToken && brand) {
    const hex = brand.colors[brandToken];
    if (hex) return hex;
  }
  if (color) return color;
  return undefined;
}

/** Fuente de una capa de texto: la de la marca salvo override explícito. */
export function resolveFont(brand: BrandStyles | null, layer: { fontFamily?: string; role?: string }): { family: string; weight: string } {
  const display = brand?.fonts.display ?? "Barlow Condensed";
  const body = brand?.fonts.body ?? "Outfit";
  const mono = brand?.fonts.mono ?? "IBM Plex Mono";
  if (layer.fontFamily) return { family: layer.fontFamily, weight: "800" };
  switch (layer.role) {
    case "headline":
    case "subheadline":
    case "cta":
    case "logo":
      return { family: display, weight: "800" };
    case "body":
      return { family: body, weight: "500" };
    default:
      return { family: mono, weight: "500" };
  }
}

/** Ruta del logo de la marca, si existe registrado. */
export function brandLogoPath(brand: BrandStyles | null): string | undefined {
  return brand?.logoAssetId;
}
