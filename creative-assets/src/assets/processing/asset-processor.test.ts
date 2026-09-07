import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { AssetService } from "../asset-service";
import { AssetDownloader } from "../downloader";
import { AssetValidator } from "../validator";
import { LocalAssetStorage } from "../storage";
import { JsonMetadataRepository } from "../metadata-repository";
import { processAsset, deriveAssetId, AssetProcessor } from "./asset-processor";
import { defaultRegistry, ProcessorRegistry } from "./registry";
import { RemoveBackgroundProcessor } from "./remove-background-processor";
import { parsePipelineString, parseProcessArgs } from "../../asset-cli";
import { ImageSearchResult } from "../../providers/types";
import { ProcessingError, ProcessingStep } from "./types";

/** Genera un JPEG real en disco con Sharp (fixture con ruido para superar el minBytes del validador). */
async function makeJpeg(dir: string, w = 400, h = 300, name = "in.jpg"): Promise<string> {
  const file = path.join(dir, name);
  await sharp({ create: { width: w, height: h, channels: 3, background: { r: 0, g: 0, b: 0 }, noise: { type: "gaussian", mean: 80, sigma: 30 } } }).jpeg().toFile(file);
  return file;
}

/** Genera un PNG real en disco con Sharp (fixture con ruido para superar el minBytes). */

/** PNG con transparencia real (mitad alfa 0, mitad opaca). */
async function makeTransparentPng(dir: string, w = 600, h = 600, name = "trans.png"): Promise<string> {
  const file = path.join(dir, name);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w / 2}" height="${h}" fill="#0C6B4C"/><rect x="${w / 2}" width="${w / 2}" height="${h}" fill="none"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  return file;
}

function result(overrides: Partial<ImageSearchResult> = {}): ImageSearchResult {
  return {
    id: "pexels-77",
    provider: "pexels",
    thumbnailUrl: "t", previewUrl: "p", originalUrl: "https://img/o.jpg",
    metadata: { pexels_id: 77 },
    ...overrides,
  } as ImageSearchResult;
}

describe("Motor de procesamiento (Fase 4)", () => {
  let root: string;
  let tempRoot: string;
  let metadataDir: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), "bafut-proc-"));
    tempRoot = path.join(root, "temp");
    metadataDir = path.join(root, "assets", "metadata");
    await mkdir(tempRoot, { recursive: true });
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function buildProcessorDeps(registry?: ProcessorRegistry) {
    return {
      storage: new LocalAssetStorage(path.join(root, "assets")),
      metadata: new JsonMetadataRepository(metadataDir),
      validator: new AssetValidator(),
      registry,
      tempRoot,
    };
  }

  async function createRawAsset(): Promise<{ assetId: string; jpegPath: string }> {
    const jpegPath = await makeJpeg(tempRoot, 400, 300);
    const fetcher = vi.fn().mockImplementation(async () => new Response(new Uint8Array(await readFile(jpegPath)), { status: 200, headers: { "Content-Type": "image/jpeg" } }));
    const dl = new AssetDownloader({ tempDir: tempRoot, fetcher });
    const svc = new AssetService({
      downloader: dl, validator: new AssetValidator(),
      storage: new LocalAssetStorage(path.join(root, "assets")), metadata: new JsonMetadataRepository(metadataDir), tempDir: tempRoot,
    });
    const outcome = await svc.downloadAsset(result(), {});
    return { assetId: outcome.asset.id, jpegPath };
  }

  // ---- registry / pipeline base ----

  it("registry: expone las 5 operaciones de la fase y resuelve por nombre", () => {
    const registry = defaultRegistry();
    expect(registry.names()).toEqual(["convert", "crop", "optimize", "remove-background", "resize"]);
    expect(registry.get("resize").name).toBe("resize");
  });

  it("operaciÃ³n desconocida â†’ error claro con lista de disponibles", async () => {
    const deps = await buildProcessorDeps();
    const err = await processAsset("asset_0000000000000000", [{ type: "shadow" }], deps).catch((e) => e);
    expect(err).toBeInstanceOf(ProcessingError);
    expect(err.code).toBe("unknown_operation");
    expect(err.message).toContain("shadow");
  });

  it("pipeline vacÃ­o â†’ empty_pipeline", async () => {
    const deps = await buildProcessorDeps();
    const err = await processAsset("asset_0000000000000000", [], deps).catch((e) => e);
    expect(err.code).toBe("empty_pipeline");
  });

  it("asset inexistente â†’ asset_not_found", async () => {
    const deps = await buildProcessorDeps();
    const err = await processAsset("asset_0000000000000000", [{ type: "resize", options: { width: 100 } }], deps).catch((e) => e);
    expect(err.code).toBe("asset_not_found");
  });

  it("pipeline con una operaciÃ³n (resize) produce un derivado vÃ¡lido", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const outcome = await processAsset(assetId, [{ type: "resize", options: { width: 200 } }], deps);
    expect(outcome.processed).toBe(true);
    expect(outcome.asset.parentAssetId).toBe(assetId);
    expect(outcome.asset.width).toBe(200);
    expect(outcome.asset.height).toBe(150); // aspect ratio preservado
    expect(outcome.asset.path).toContain("assets/processed/");
    expect(outcome.asset.status).toBe("ready");
    expect(outcome.asset.sha256).toMatch(/^[a-f0-9]{64}$/);
    const ops = outcome.asset.processing?.operations ?? [];
    expect(ops).toHaveLength(1);
    expect(ops[0]).toMatchObject({ operation: "resize", tool: "sharp", inputAssetId: assetId, outputAssetId: outcome.asset.id });
  });

  it("pipeline con mÃºltiples operaciones encadena derivados (resize â†’ crop â†’ convert â†’ optimize)", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const steps: ProcessingStep[] = [
      { type: "resize", options: { width: 300, height: 200, fit: "cover" } },
      { type: "crop", options: { width: 150, height: 100, position: "center" } },
      { type: "convert", options: { format: "png" } },
      { type: "optimize", options: { palette: false } },
    ];
    const outcome = await processAsset(assetId, steps, deps);
    expect(outcome.chain).toHaveLength(4);
    expect(outcome.chain.map((c) => c.operation)).toEqual(["resize", "crop", "convert", "optimize"]);
    // cadena de parents encadenada
    expect(outcome.asset.parentAssetId).toBe(outcome.chain[2].assetId);
    expect(outcome.asset.extension).toBe("png");
    expect(outcome.asset.width).toBe(150);
    expect(outcome.asset.height).toBe(100);
    // raw intacto: sigue existiendo y sin cambios
    const original = await new JsonMetadataRepository(metadataDir).get(assetId);
    expect(original?.status).toBe("ready");
    expect(original?.processing?.operations ?? []).toHaveLength(0);
  });

  // ---- resize ----

  it("resize con solo width preserva aspect ratio", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const outcome = await processAsset(assetId, [{ type: "resize", options: { width: 100 } }], deps);
    expect(outcome.asset.width).toBe(100);
    expect(outcome.asset.height).toBe(75);
  });

  it("resize con dimensiones invÃ¡lidas â†’ invalid_options", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const err = await processAsset(assetId, [{ type: "resize", options: { width: -5 } }], deps).catch((e) => e);
    expect(err.code).toBe("invalid_options");
    const err2 = await processAsset(assetId, [{ type: "resize", options: {} }], deps).catch((e) => e);
    expect(err2.code).toBe("invalid_options");
  });

  // ---- crop ----

  it("crop con position center genera el tamaÃ±o exacto", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const outcome = await processAsset(assetId, [{ type: "crop", options: { width: 200, height: 300, position: "center" } }], deps);
    expect(outcome.asset.width).toBe(200);
    expect(outcome.asset.height).toBe(300);
  });

  it("crop fuera de lÃ­mites â†’ invalid_options", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const err = await processAsset(assetId, [{ type: "crop", options: { width: 500, height: 100, x: 300, y: 0 } }], deps).catch((e) => e);
    expect(err.code).toBe("invalid_options");
    const err2 = await processAsset(assetId, [{ type: "crop", options: { width: 100, height: 100, position: "diagonal" } }], deps).catch((e) => e);
    expect(err2.code).toBe("invalid_options");
  });

  // ---- convert ----

  it("convert JPEG â†’ PNG y PNG â†’ WEBP", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const toPng = await processAsset(assetId, [{ type: "convert", options: { format: "png" } }], deps);
    expect(toPng.asset.mimeType).toBe("image/png");
    expect(toPng.asset.extension).toBe("png");

    const toWebp = await processAsset(toPng.asset.id, [{ type: "convert", options: { format: "webp" } }], deps);
    expect(toWebp.asset.mimeType).toBe("image/webp");
  });

  it("convert con formato invÃ¡lido â†’ invalid_options", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const err = await processAsset(assetId, [{ type: "convert", options: { format: "svg" } }], deps).catch((e) => e);
    expect(err.code).toBe("invalid_options");
  });

  // ---- optimize ----

  it("optimize conserva formato y dimensiones y reduce bytes (JPEG con mozjpeg)", async () => {
    const jpegPath = await makeJpeg(tempRoot, 600, 400);
    const fetcher = vi.fn().mockImplementation(async () => new Response(new Uint8Array(await readFile(jpegPath)), { status: 200, headers: { "Content-Type": "image/jpeg" } }));
    const svc = new AssetService({
      downloader: new AssetDownloader({ tempDir: tempRoot, fetcher }),
      validator: new AssetValidator(), storage: new LocalAssetStorage(path.join(root, "assets")),
      metadata: new JsonMetadataRepository(metadataDir), tempDir: tempRoot,
    });
    const dl = await svc.downloadAsset(result({ id: "pexels-88", metadata: { pexels_id: 88 } }), {});
    const deps = await buildProcessorDeps();
    const outcome = await processAsset(dl.asset.id, [{ type: "optimize", options: { quality: 40 } }], deps);
    expect(outcome.asset.mimeType).toBe("image/jpeg");
    expect(outcome.asset.width).toBe(600);
    expect(outcome.asset.height).toBe(400);
    expect(outcome.asset.sha256).not.toBe(dl.asset.sha256);
    expect(outcome.asset.sizeBytes).toBeLessThan(dl.asset.sizeBytes);
  });

  // ---- remove-background (mock del proceso externo) ----

  it("remove-background mockeado: produce PNG, conserva dimensiones y registra metadata", async () => {
    const { assetId } = await createRawAsset();
    // runner falso: recorta el fondo (copia la mitad del canvas con alfa)
    const runner = vi.fn(async (command: string[]) => {
      const outputPath = command[command.length - 1];
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="200" height="300" fill="#0C6B4C"/></svg>';
      await sharp(Buffer.from(svg)).png().toFile(outputPath);
    });
    const registry = defaultRegistry({ rembgRunner: runner });
    const deps = await buildProcessorDeps(registry);
    const outcome = await processAsset(assetId, [{ type: "remove-background" }], deps);

    expect(runner).toHaveBeenCalledTimes(1);
    const cmd = runner.mock.calls[0][0];
    // el comando se pasa con argumentos separados (seguridad), no como string
    expect(Array.isArray(cmd)).toBe(true);
    expect(cmd[0]).not.toContain(" ");

    expect(outcome.asset.extension).toBe("png");
    expect(outcome.asset.mimeType).toBe("image/png");
    expect(outcome.asset.width).toBe(400);
    expect(outcome.asset.height).toBe(300);
    expect(outcome.asset.hasTransparency).toBe(true);
    const ops = outcome.asset.processing?.operations ?? [];
    expect(ops[0]).toMatchObject({ operation: "remove-background", tool: "rembg", inputAssetId: assetId });
  });

  it("remove-background con proceso externo fallido â†’ processor_failed", async () => {
    const { assetId } = await createRawAsset();
    const registry = defaultRegistry({ rembgRunner: vi.fn(async () => { throw new Error("rembg boom"); }) });
    const deps = await buildProcessorDeps(registry);
    const err = await processAsset(assetId, [{ type: "remove-background" }], deps).catch((e) => e);
    expect(err).toBeInstanceOf(ProcessingError);
    expect(err.code).toBe("processor_failed");
  });

  it("remove-background sin rembg instalado = tool_unavailable", async () => {
    const { assetId } = await createRawAsset();
    const registry = defaultRegistry();
    const deps = await buildProcessorDeps(registry);
    // runner real no disponible: simulamos el fallo que defaultRunner produciría
    const rembg = registry.get("remove-background") as RemoveBackgroundProcessor;
    rembg.runner = vi.fn(async () => {
      throw new ProcessingError("tool_unavailable", "El comando no esta disponible.", "remove-background");
    });
    const err = await processAsset(assetId, [{ type: "remove-background" }], deps).catch((e) => e);
    expect(err.code).toBe("tool_unavailable");
  });

  // ---- assets: hash, dedupe, idempotencia ----

  it("id determinista del derivado: mismo asset+operacion+opciones = mismo id", () => {
    const a = deriveAssetId("asset_aaaa", "resize", { width: 100 });
    const b = deriveAssetId("asset_aaaa", "resize", { width: 100 });
    const c = deriveAssetId("asset_aaaa", "resize", { width: 200 });
    // orden de keys irrelevante
    const d = deriveAssetId("asset_aaaa", "resize", { height: 100, width: 100 });
    const e = deriveAssetId("asset_aaaa", "resize", { width: 100, height: 100 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(d).toBe(e);
    expect(a).toMatch(/^asset_[a-f0-9]{16}$/);
  });

  it("idempotencia: ejecutar el mismo pipeline dos veces reutiliza el derivado", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const steps: ProcessingStep[] = [{ type: "resize", options: { width: 120 } }];
    const first = await processAsset(assetId, steps, deps);
    expect(first.processed).toBe(true);
    expect(first.cached).toBe(false);
    const second = await processAsset(assetId, steps, deps);
    expect(second.processed).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.asset.id).toBe(first.asset.id);
    expect(second.path).toBe(first.path);
    // y no duplicÃ³ operaciones en la metadata
    expect(second.asset.processing?.operations).toHaveLength(1);
  });

  it("output corrupto rechazado: no marca ready, no persiste metadata y limpia temp", async () => {
    const { assetId } = await createRawAsset();
    // processor malicioso/roto que escribe HTML en el output
    const registry = new ProcessorRegistry();
    registry.register({
      name: "resize",
      tool: "broken",
      process: async (ctx) => {
        await writeFile(ctx.outputPath, Buffer.from("<!doctype html>" + "z".repeat(2000)));
        return { mimeType: "image/png", extension: "png" };
      },
    });
    const deps = await buildProcessorDeps(registry);
    const err = await processAsset(assetId, [{ type: "resize", options: { width: 100 } }], deps).catch((e) => e);
    // el validador rechaza el output (AssetError/ProcessingError, cualquiera es válido)
    expect(String(err?.code)).toMatch(/not_an_image|unsupported_format|output_invalid/);
    // no quedÃ³ metadata nueva
    const all = await new JsonMetadataRepository(metadataDir).list();
    expect(all.filter((m) => m.parentAssetId === assetId)).toHaveLength(0);
    // temp limpio
    expect((await readdir(tempRoot)).filter((d) => d.startsWith("proc_"))).toHaveLength(0);
  });

  it("hash del derivado calculado sobre el archivo final", async () => {
    const { assetId } = await createRawAsset();
    const deps = await buildProcessorDeps();
    const outcome = await processAsset(assetId, [{ type: "resize", options: { width: 150 } }], deps);
    const { createHash } = await import("node:crypto");
    const abs = new LocalAssetStorage(path.join(root, "assets")).resolve(outcome.asset.path);
    const buffer = await readFile(abs);
    const expected = createHash("sha256").update(buffer).digest("hex");
    expect(outcome.asset.sha256).toBe(expected);
  });

  // ---- seguridad ----

  it("path traversal: input fuera del storage es rechazado", async () => {
    const deps = await buildProcessorDeps();
    const fakeMeta = {
      id: "asset_1111111111111111", provider: "pexels", storedFilename: "x.jpg",
      path: "../../etc/passwd", mimeType: "image/jpeg", extension: "jpg",
      sizeBytes: 1234, sha256: "a".repeat(64), downloadedAt: new Date().toISOString(), status: "ready",
    };
    await new JsonMetadataRepository(metadataDir).create(fakeMeta as never);
    const err = await processAsset("asset_1111111111111111", [{ type: "resize", options: { width: 100 } }], deps).catch((e) => e);
    expect(err.code).toBe("not_found"); // el storage rechaza la ruta fuera del árbol
    expect(err.message).toContain("Ruta fuera del storage");
  });

  it("output fuera de storage = rechazado por contencion", async () => {
    const { assetId } = await createRawAsset();
    const registry = new ProcessorRegistry();
    registry.register({
      name: "resize",
      tool: "escape",
      process: async (ctx) => {
        // intenta escribir fuera del workdir temporal
        await writeFile(path.resolve(ctx.outputPath, "..", "..", "escape.png"), Buffer.from("nope"));
        return { mimeType: "image/png", extension: "png" };
      },
    });
    const deps = await buildProcessorDeps(registry);
    await expect(processAsset(assetId, [{ type: "resize", options: { width: 100 } }], deps)).rejects.toThrow();
  });

  it("transparencia: detecta JPEG sin alfa y PNG transparente", async () => {
    const transparent = await makeTransparentPng(tempRoot);
    const svc = new AssetService({
      downloader: new AssetDownloader({ tempDir: tempRoot, fetcher: vi.fn().mockImplementation(async () => new Response(new Uint8Array(await readFile(transparent)), { status: 200, headers: { "Content-Type": "image/png" } })) }),
      validator: new AssetValidator(), storage: new LocalAssetStorage((path.join(root, "assets"))),
      metadata: new JsonMetadataRepository(metadataDir), tempDir: tempRoot,
    });
    const dl = await svc.downloadAsset(result({ id: "pexels-99", metadata: { pexels_id: 99 } }), {});
    expect(dl.asset.hasTransparency).toBe(true);
    const deps = await buildProcessorDeps();
    const toJpeg = await processAsset(dl.asset.id, [{ type: "convert", options: { format: "jpeg" } }], deps);
    // documentado: PNG transparente â†’ JPEG aplana el fondo (blanco por defecto)
    expect(toJpeg.asset.hasTransparency).toBe(false);
    expect(toJpeg.asset.mimeType).toBe("image/jpeg");
  });
});

describe("Parsing de pipelines (CLI/JSON â†’ ProcessingStep[])", () => {
  it("parseProcessArgs: flags individuales", () => {
    const steps = parseProcessArgs(["--remove-background", "--resize", "1080", "--crop", "1080x1350@center", "--convert", "png", "--optimize", "80"]);
    expect(steps).toEqual([
      { type: "remove-background" },
      { type: "resize", options: { width: 1080 } },
      { type: "crop", options: { width: 1080, height: 1350, position: "center" } },
      { type: "convert", options: { format: "png" } },
      { type: "optimize", options: { quality: 80 } },
    ]);
  });

  it("parsePipelineString: tokens separados por coma", () => {
    const steps = parsePipelineString("remove-background,resize:1080,convert:png,optimize:80");
    expect(steps).toEqual([
      { type: "remove-background" },
      { type: "resize", options: { width: 1080 } },
      { type: "convert", options: { format: "png" } },
      { type: "optimize", options: { quality: 80 } },
    ]);
  });

  it("parsePipelineString con resize anchoxalto y crop con position", () => {
    const steps = parsePipelineString("resize:1080x1350,crop:500x500@top");
    expect(steps[0].options).toEqual({ width: 1080, height: 1350 });
    expect(steps[1].options).toEqual({ width: 500, height: 500, position: "top" });
  });

  it("operaciÃ³n desconocida en --pipeline â†’ unknown_operation", () => {
    expect(() => parsePipelineString("makemagic")).toThrow(ProcessingError);
  });
});

describe("AssetProcessor (fachada)", () => {
  it("expone processAsset/getAsset sobre las mismas dependencias", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "bafut-facade-"));
    try {
      const tempDir = path.join(root, "temp");
      const rawDir = null; void rawDir;
      const metaDir = path.join(root, "meta");
      await mkdir(tempDir, { recursive: true });
      const jpeg = await makeJpeg(tempDir, 300, 200);
      const svc = new AssetService({
        downloader: new AssetDownloader({ tempDir, fetcher: vi.fn().mockImplementation(async () => new Response(new Uint8Array(await readFile(jpeg)), { status: 200, headers: { "Content-Type": "image/jpeg" } })) }),
        validator: new AssetValidator(), storage: new LocalAssetStorage((path.join(root, "assets"))),
        metadata: new JsonMetadataRepository(metaDir), tempDir,
      });
      const dl = await svc.downloadAsset(result(), {});
      const processor = new AssetProcessor({
        storage: new LocalAssetStorage((path.join(root, "assets"))),
        metadata: new JsonMetadataRepository(metaDir),
        validator: new AssetValidator(),
        tempRoot: tempDir,
      });
      const out = await processor.processAsset(dl.asset.id, [{ type: "resize", options: { width: 200 } }]);
      expect(out.asset.width).toBe(200);
      expect((await processor.getAsset(out.asset.id))?.id).toBe(out.asset.id);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
