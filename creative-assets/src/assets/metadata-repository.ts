import path from "node:path";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { AssetError, AssetMetadata } from "./types";

/**
 * MetadataRepository: persistencia de metadata de assets.
 * Implementación inicial: JsonMetadataRepository (un JSON por asset en
 * creative-assets/assets/metadata/). Sin base de datos en esta fase.
 *
 * El resto del sistema solo consume la interfaz → migrar a SQLite/Postgres
 * después NO exige cambios en AssetService.
 */
export interface MetadataRepository {
  create(metadata: AssetMetadata): Promise<AssetMetadata>;
  get(id: string): Promise<AssetMetadata | null>;
  update(id: string, patch: Partial<AssetMetadata>): Promise<AssetMetadata>;
  findByHash(sha256: string): Promise<AssetMetadata | null>;
  findByIdentity(provider: string, providerAssetId: string): Promise<AssetMetadata | null>;
  list(): Promise<AssetMetadata[]>;
}

export class JsonMetadataRepository implements MetadataRepository {
  private dir: string;

  constructor(metadataDir: string) {
    this.dir = path.resolve(metadataDir);
  }

  private fileFor(id: string): string {
    // El id lo genera computeAssetId; patrón cerrado → sin path traversal.
    if (!/^asset_[a-f0-9]{16}$/.test(id)) {
      throw new AssetError("metadata_error", `ID de asset inválido: ${truncate(id, 40)}`);
    }
    return path.join(this.dir, `${id}.json`);
  }

  async create(metadata: AssetMetadata): Promise<AssetMetadata> {
    await mkdir(this.dir, { recursive: true });
    const file = this.fileFor(metadata.id);
    try {
      await writeFile(file, JSON.stringify(metadata, null, 2), "utf8");
    } catch (err) {
      throw new AssetError("metadata_error", `No se pudo escribir metadata: ${err instanceof Error ? err.message : String(err)}`);
    }
    return metadata;
  }

  async get(id: string): Promise<AssetMetadata | null> {
    try {
      const raw = await readFile(this.fileFor(id), "utf8");
      return JSON.parse(raw) as AssetMetadata;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw new AssetError("metadata_error", `Metadata ilegible para ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async update(id: string, patch: Partial<AssetMetadata>): Promise<AssetMetadata> {
    const current = await this.get(id);
    if (!current) {
      throw new AssetError("not_found", `No existe metadata para el asset ${id}.`);
    }
    const updated: AssetMetadata = { ...current, ...patch, id: current.id };
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.fileFor(id), JSON.stringify(updated, null, 2), "utf8");
    return updated;
  }

  async findByHash(sha256: string): Promise<AssetMetadata | null> {
    const all = await this.list();
    return all.find((m) => m.sha256 === sha256) ?? null;
  }

  async findByIdentity(provider: string, providerAssetId: string): Promise<AssetMetadata | null> {
    const all = await this.list();
    return all.find((m) => m.provider === provider && m.providerAssetId === providerAssetId) ?? null;
  }

  async list(): Promise<AssetMetadata[]> {
    let files: string[];
    try {
      files = await readdir(this.dir);
    } catch {
      return [];
    }
    const out: AssetMetadata[] = [];
    for (const f of files.filter((f) => f.endsWith(".json"))) {
      try {
        const raw = await readFile(path.join(this.dir, f), "utf8");
        out.push(JSON.parse(raw) as AssetMetadata);
      } catch {
        // JSON corrupto: se ignora en listados (get() individual sí reporta el error).
      }
    }
    return out.sort((a, b) => a.id.localeCompare(b.id));
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + "…" : s;
}
