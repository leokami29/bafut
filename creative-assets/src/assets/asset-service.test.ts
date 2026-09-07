import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { crc32, deflateSync } from "node:zlib";

/** PNG real y válido: firma + chunks con CRC + IDAT comprimido. */
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])) >>> 0, 0);
  return Buffer.concat([len, Buffer.from(type, "ascii"), data, crc]);
}

function pngBuffer(sizeBytes = 3000, w = 1920, h = 1280): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // RGBA
  const rowLen = 1 + w * 4;
  const raw = Buffer.alloc(rowLen * h);
  for (let y = 0; y < h; y++) {
    raw[y * rowLen] = 0; // filter: none
    for (let x = 1; x < rowLen; x++) raw[y * rowLen + x] = (x * y) % 251;
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const png = Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  if (png.length >= sizeBytes) return png;
  // padding vía tEXt válido hasta alcanzar el tamaño pedido
  const padLen = Math.max(0, sizeBytes - png.length - 12);
  const pad = Buffer.alloc(padLen, 32);
  return Buffer.concat([sig, pngChunk("IHDR", ihdr), pngChunk("tEXt", pad), pngChunk("IDAT", deflateSync(raw)), pngChunk("IEND", Buffer.alloc(0))]);
}

import { AssetService } from "./asset-service";
import { AssetDownloader } from "./downloader";
import { AssetValidator } from "./validator";
import { LocalAssetStorage } from "./storage";
import { JsonMetadataRepository } from "./metadata-repository";
import { computeAssetId } from "./ids";
import { ImageSearchResult } from "../providers/types";

function result(overrides: Partial<ImageSearchResult> = {}): ImageSearchResult {
  return {
    id: "pexels-123",
    provider: "pexels",
    thumbnailUrl: "https://img/tiny.jpg",
    previewUrl: "https://img/large.jpg",
    originalUrl: "https://img/original.jpg",
    width: 1920,
    height: 1280,
    author: { name: "John Doe", url: "https://pexels.com/@john" },
    sourceUrl: "https://www.pexels.com/photo/123/",
    license: "Pexels License",
    metadata: { pexels_id: 123 },
    ...overrides,
  } as ImageSearchResult;
}

describe("AssetService (fase 3: download -> validate -> store -> metadata)", () => {
  let root: string;
  let tempDir: string;
  let metadataDir: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "bafut-assets-"));
    tempDir = path.join(root, "temp");
    metadataDir = path.join(root, "metadata");
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  function mockFetch(body: Buffer, contentType = "image/png") {
    // Response nuevo por llamada: el body de un Response solo puede leerse una vez.
    return vi.fn().mockImplementation(() => new Response(new Uint8Array(body), { status: 200, headers: { "Content-Type": contentType } }));
  }

  it("descarga, valida, almacena y genera metadata completa", async () => {
    const png = pngBuffer();
    const svc = new AssetService({
      downloader: new AssetDownloader({ tempDir, fetcher: mockFetch(png) }),
      validator: new AssetValidator(),
      storage: new LocalAssetStorage(root),
      metadata: new JsonMetadataRepository(metadataDir),
      tempDir,
    });

    const outcome = await svc.downloadAsset(result(), { campaignId: "lanzamiento", brandId: "bafut", tags: ["futbol", "noche"] });

    expect(outcome.downloaded).toBe(true);
    expect(outcome.duplicate).toBe(false);
    // ruta relativa portable + archivo real en disco
    expect(outcome.asset.path).toMatch(/asset_[a-f0-9]{16}\.png$/);

    const asset = outcome.asset;
    expect(asset.id).toBe(computeAssetId({ provider: "pexels", providerAssetId: "123" }));
    expect(asset.provider).toBe("pexels");
    expect(asset.providerAssetId).toBe("123");
    expect(asset.storedFilename).toBe(asset.id + ".png");
    expect(asset.mimeType).toBe("image/png");
    expect(asset.sizeBytes).toBe(png.length);
    expect(asset.width).toBe(1920);
    expect(asset.height).toBe(1280);
    expect(asset.aspectRatio).toBeCloseTo(1.5, 2);
    expect(asset.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(asset.status).toBe("ready");
    expect(asset.author).toEqual({ name: "John Doe", url: "https://pexels.com/@john" });
    expect(asset.license).toContain("Pexels");
    expect(asset.sourceUrl).toContain("pexels.com/photo/123");
    expect(asset.campaignId).toBe("lanzamiento");
    expect(asset.brandId).toBe("bafut");
    expect(asset.tags).toEqual(["futbol", "noche"]);
    expect(asset.processing).toEqual({ operations: [] });
    expect(new Date(asset.downloadedAt).toString()).not.toBe("Invalid Date");

    // metadata persistida y legible
    const stored = await svc.getAsset(asset.id);
    expect(stored?.sha256).toBe(asset.sha256);
    // temp limpio
    expect((await readdir(tempDir)).filter((f) => f.startsWith("dl_"))).toHaveLength(0);
  });

  it("detecta duplicados por identidad (misma imagen, segunda llamada no re-descarga)", async () => {
    const svc = new AssetService({
      downloader: new AssetDownloader({ tempDir, fetcher: mockFetch(pngBuffer()) }),
      validator: new AssetValidator(),
      storage: new LocalAssetStorage(root),
      metadata: new JsonMetadataRepository(metadataDir),
      tempDir,
    });
    const first = await svc.downloadAsset(result());
    expect(first.downloaded).toBe(true);

    const second = await svc.downloadAsset(result());
    expect(second.downloaded).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.asset.id).toBe(first.asset.id);
    expect(second.path).toBe(first.path);
  });

  it("detecta duplicados por contenido (sha256) aunque cambie la URL", async () => {
    const svc = new AssetService({
      downloader: new AssetDownloader({ tempDir, fetcher: mockFetch(pngBuffer()) }),
      validator: new AssetValidator(),
      storage: new LocalAssetStorage(root),
      metadata: new JsonMetadataRepository(metadataDir),
      tempDir,
    });
    const a = await svc.downloadAsset(result());
    // misma imagen binaria, distinta URL e id de proveedor
    const b = await svc.downloadAsset(result({ id: "pexels-999", originalUrl: "https://img/copy.jpg", metadata: { pexels_id: 999 } }));
    expect(b.duplicate).toBe(true);
    expect(b.downloaded).toBe(false);
    expect(b.asset.id).toBe(a.asset.id);
  });

  it("distingue imagenes distintas (no hay falsos duplicados)", async () => {
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Response(new Uint8Array(pngBuffer(3000, 8, 8)), { status: 200, headers: { "Content-Type": "image/png" } }))
      .mockImplementationOnce(() => new Response(new Uint8Array(pngBuffer(4500, 8, 8)), { status: 200, headers: { "Content-Type": "image/png" } }));
    const svc = new AssetService({
      downloader: new AssetDownloader({ tempDir, fetcher }),
      validator: new AssetValidator(),
      storage: new LocalAssetStorage(root),
      metadata: new JsonMetadataRepository(metadataDir),
      tempDir,
    });
    const a = await svc.downloadAsset(result({ metadata: { pexels_id: 1 }, id: "pexels-1" }));
    const b = await svc.downloadAsset(result({ metadata: { pexels_id: 2 }, id: "pexels-2", originalUrl: "https://img/other.jpg" }));
    // contenido distinto garantizado: PNG 8x8 con padding tEXt de distinto tamaño
    expect(a.asset.sha256).not.toBe(b.asset.sha256);
    expect(a.asset.id).not.toBe(b.asset.id);
    expect(b.duplicate).toBe(false);
  });

  it("no deja basura: fallo de validacion limpia el temporal y no crea metadata", async () => {
    const svc = new AssetService({
      downloader: new AssetDownloader({
        tempDir,
        fetcher: vi.fn().mockImplementation(() => new Response(new Uint8Array(Buffer.from("<html>" + "y".repeat(2000))), { status: 200, headers: { "Content-Type": "image/jpeg" } })),
      }),
      validator: new AssetValidator(),
      storage: new LocalAssetStorage(root),
      metadata: new JsonMetadataRepository(metadataDir),
      tempDir,
    });
    await expect(svc.downloadAsset(result())).rejects.toThrow(/not_an_image|unsupported_format/);
    expect((await readdir(tempDir)).filter((f) => f.startsWith("dl_"))).toHaveLength(0);
    expect((await svc.listAssets()).filter((m) => m.provider === "pexels")).toHaveLength(0);
  });
});

describe("JsonMetadataRepository", () => {
  let dir: string;
  let repo: JsonMetadataRepository;
  const meta = () => ({
    id: "asset_0123456789abcdef",
    provider: "pexels",
    providerAssetId: "123",
    storedFilename: "asset_0123456789abcdef.jpg",
    path: "assets/raw/asset_0123456789abcdef.jpg",
    mimeType: "image/jpeg",
    extension: "jpg",
    sizeBytes: 1234,
    sha256: "a".repeat(64),
    downloadedAt: new Date().toISOString(),
    status: "ready" as const,
  });

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "bafut-meta-"));
    repo = new JsonMetadataRepository(dir);
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("create/get/update/findByHash/findByIdentity/list", async () => {
    await repo.create(meta());
    const got = await repo.get("asset_0123456789abcdef");
    expect(got?.provider).toBe("pexels");

    const updated = await repo.update("asset_0123456789abcdef", { status: "validated", tags: ["x"] });
    expect(updated.status).toBe("validated");
    expect((await repo.get("asset_0123456789abcdef"))?.tags).toEqual(["x"]);

    expect((await repo.findByHash("a".repeat(64)))?.id).toBe("asset_0123456789abcdef");
    expect(await repo.findByHash("b".repeat(64))).toBeNull();
    expect((await repo.findByIdentity("pexels", "123"))?.id).toBe("asset_0123456789abcdef");
    expect(await repo.findByIdentity("pexels", "999")).toBeNull();
    expect(await repo.list()).toHaveLength(1);
  });

  it("get de asset inexistente devuelve null (no lanza)", async () => {
    expect(await repo.get("asset_0000000000000000")).toBeNull();
  });

  it("update sobre asset inexistente lanza not_found", async () => {
    await expect(repo.update("asset_0000000000000000", { status: "ready" })).rejects.toThrow(/not_found/);
  });

  it("rechaza IDs con path traversal", async () => {
    await expect(repo.get("../../etc/passwd" as never)).rejects.toThrow(/ID de asset inv/);
    await expect(repo.get("../.." as never)).rejects.toThrow(/ID de asset inv/);
  });
});

describe("LocalAssetStorage: seguridad de rutas", () => {
  it("save con nombre controlado por el sistema y contencion en root", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "bafut-store-"));
    try {
      const storage = new LocalAssetStorage(root);
      const tmpFile = path.join(root, "source.png");
      await writeFile(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      const rel = await storage.save(tmpFile, "asset_0123456789abcdef.png");
      expect(rel.endsWith("asset_0123456789abcdef.png")).toBe(true);
      expect(storage.resolve(rel).startsWith(path.resolve(root))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rechaza filenames maliciosos y resolucion fuera del storage", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "bafut-store-"));
    try {
      const storage = new LocalAssetStorage(root);
      await expect(storage.save("/tmp/src.png", "../../evil.png")).rejects.toThrow(/Filename generado inv/);
      await expect(storage.save("/tmp/src.png", "sub/dir.png")).rejects.toThrow(/Filename generado inv/);
      expect(() => storage.resolve("../../outside.png")).toThrow(/Ruta fuera del storage/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
