import { readFile } from "node:fs/promises";
import path from "node:path";
import { ReferenceProfile } from "./types";

/**
 * ReferenceProfile: memoria visual de la marca preparada para análisis futuro.
 * Jerarquía de prioridades al decidir estilo:
 *   Brand system (brand.json) > Campaign requirements > ReferenceProfile > heurísticas genéricas.
 * El perfil NUNCA sobrescribe brand.json (solo aporta preferencias).
 *
 * StaticReferenceProfileLoader: carga un perfil EXPLÍCITO si existe
 *   brands/<id>/references/profile.json
 * NO analiza imágenes todavía (eso es para un ReferenceAnalyzer futuro).
 */

export type ReferenceProfileData = Partial<Omit<ReferenceProfile, "brandId" | "source">>;

export interface ReferenceAnalyzer {
  readonly name: string;
  load(brandId: string): Promise<ReferenceProfile | null>;
}

export class StaticReferenceProfileLoader implements ReferenceAnalyzer {
  readonly name = "static-loader";
  private brandsRoot: string;

  constructor(brandsRoot?: string) {
    this.brandsRoot = brandsRoot ?? path.resolve(process.cwd(), "creative-assets", "brands");
  }

  async load(brandId: string): Promise<ReferenceProfile | null> {
    const file = path.join(this.brandsRoot, brandId, "references", "profile.json");
    try {
      const raw = JSON.parse(await readFile(file, "utf8")) as ReferenceProfileData;
      return {
        brandId,
        source: "static",
        preferredFormats: raw.preferredFormats,
        preferredSubjectPlacement: raw.preferredSubjectPlacement,
        overlayUsage: raw.overlayUsage,
        dominantColors: raw.dominantColors,
        notes: raw.notes,
      };
    } catch {
      return null; // sin perfil: el sistema usa brand.json + heurísticas, no inventa
    }
  }
}
