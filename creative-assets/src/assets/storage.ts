import path from "node:path";
import { mkdir, copyFile, stat } from "node:fs/promises";
import { AssetError } from "./types";

/**
 * AssetStorage: abstracción de almacenamiento binario.
 * Implementación inicial: LocalAssetStorage con raíz en creative-assets/assets
 * (contiene raw/ y processed/). Futuro: S3AssetStorage / CloudStorage.
 *
 * Las rutas devueltas son RELATIVAS a creative-assets/ (portables);
 * `resolve()` convierte relativa → absoluta solo dentro del storage.
 */
export interface AssetStorage {
  /** subdir: "raw" o "processed/<parentAssetId>" — siempre dentro del storage. */
  save(tempPath: string, filename: string, subdir?: string): Promise<string>;
  resolve(relativePath: string): string;
  exists(relativePath: string): Promise<boolean>;
}

export class LocalAssetStorage implements AssetStorage {
  private root: string; // creative-assets/assets
  private base: string; // creative-assets

  constructor(assetsDir: string) {
    this.root = path.resolve(assetsDir);
    this.base = path.resolve(this.root, "..");
  }

  async save(tempPath: string, filename: string, subdir = "raw"): Promise<string> {
    // El filename SIEMPRE lo genera el sistema; el subdir solo acepta el patrón interno.
    if (!/^[A-Za-z0-9._-]+$/.test(filename)) {
      throw new AssetError("storage_error", `Filename generado invalido: ${filename}`);
    }
    if (!/^[A-Za-z0-9._/-]+$/.test(subdir) || subdir.includes("..")) {
      throw new AssetError("storage_error", `Subdirectorio de storage invalido: ${subdir}`);
    }
    const targetDir = path.join(this.root, subdir);
    const finalPath = path.join(targetDir, filename);
    if (!finalPath.startsWith(this.root + path.sep)) {
      throw new AssetError("storage_error", "Intento de escritura fuera del storage.");
    }
    await mkdir(targetDir, { recursive: true });
    try {
      await copyFile(tempPath, finalPath);
    } catch (err) {
      throw new AssetError("storage_error", `Fallo al guardar el asset: ${err instanceof Error ? err.message : String(err)}`);
    }
    return path.relative(this.base, finalPath).split(path.sep).join("/");
  }

  resolve(relativePath: string): string {
    const abs = path.resolve(this.base, relativePath);
    if (!abs.startsWith(this.root + path.sep)) {
      throw new AssetError("not_found", `Ruta fuera del storage de assets: ${relativePath}`);
    }
    return abs;
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const info = await stat(this.resolve(relativePath));
      return info.isFile();
    } catch {
      return false;
    }
  }
}
