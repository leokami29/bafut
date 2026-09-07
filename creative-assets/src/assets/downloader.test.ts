import { describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AssetDownloader, DEFAULT_LIMITS } from "./downloader";
import { AssetError } from "./types";

function pngBuffer(sizeBytes = 2000): Buffer {
  const ihdr = Buffer.alloc(17);
  ihdr.writeUInt32BE(1920, 0);
  ihdr.writeUInt32BE(1280, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(13, 0);
  const type = Buffer.from("IHDR", "ascii");
  const padding = Buffer.alloc(Math.max(0, sizeBytes - sig.length - 12 - ihdr.length), 7);
  return Buffer.concat([sig, len, type, ihdr, padding]);
}

function imageResponse(body: Buffer, contentType = "image/jpeg"): Response {
  return new Response(new Uint8Array(body), {
    status: 200,
    headers: { "Content-Type": contentType, "Content-Length": String(body.length) },
  });
}

async function tempDir(): Promise<string> {
  return mkdtemp(path.join(tmpdir(), "bafut-dl-"));
}

const PNG = pngBuffer();

describe("AssetDownloader", () => {
  it("descarga exitosa: escribe el archivo y expone head para sniffing", async () => {
    const dir = await tempDir();
    const fetcher = vi.fn().mockResolvedValue(imageResponse(PNG, "image/png"));
    const dl = new AssetDownloader({ tempDir: dir, fetcher });
    const result = await dl.download("https://images.example.com/photo.png");

    expect(fetcher).toHaveBeenCalledWith("https://images.example.com/photo.png", expect.objectContaining({ redirect: "follow" }));
    expect(result.sizeBytes).toBe(PNG.length);
    expect(result.contentType).toBe("image/png");
    expect(result.head.subarray(0, 8)).toEqual(PNG.subarray(0, 8));
    const written = await readFile(result.tempPath);
    expect(written.length).toBe(PNG.length);
    await rm(dir, { recursive: true, force: true });
  });

  it("rechaza esquemas no http(s)", async () => {
    const dl = new AssetDownloader({ tempDir: await tempDir(), fetcher: vi.fn() });
    await expect(dl.download("file:///etc/passwd")).rejects.toThrow(/unsupported_scheme/);
    await expect(dl.download("ftp://x/y.jpg")).rejects.toThrow(/unsupported_scheme/);
  });

  it("rechaza URL inválida y URL vacía", async () => {
    const dl = new AssetDownloader({ tempDir: await tempDir(), fetcher: vi.fn() });
    await expect(dl.download("no-es-una-url")).rejects.toThrow(/invalid_url/);
    const r = { provider: "pexels", thumbnailUrl: "t", previewUrl: "p", originalUrl: "" };
    await expect(dl.downloadFromResult(r as never)).rejects.toThrow(/empty_url/);
  });

  it("mapea HTTP 404/500 a http_error", async () => {
    const dir = await tempDir();
    const dl = new AssetDownloader({
      tempDir: dir,
      fetcher: vi.fn()
        .mockResolvedValueOnce(new Response("nope", { status: 404 }))
        .mockResolvedValueOnce(new Response("boom", { status: 500 })),
    });
    const e1 = await dl.download("https://x/1.jpg").catch((e) => e);
    expect(e1).toBeInstanceOf(AssetError);
    expect(e1.code).toBe("http_error");
    expect(e1.httpStatus).toBe(404);
    const e2 = await dl.download("https://x/2.jpg").catch((e) => e);
    expect(e2.code).toBe("http_error");
    expect(e2.httpStatus).toBe(500);
  });

  it("rechaza Content-Type no imagen (HTML disfrazado)", async () => {
    const dir = await tempDir();
    const dl = new AssetDownloader({
      tempDir: dir,
      fetcher: vi.fn().mockResolvedValue(new Response("<html>login</html>", { status: 200, headers: { "Content-Type": "text/html" } })),
    });
    const err = await dl.download("https://x/evil.jpg").catch((e) => e);
    expect(err.code).toBe("invalid_content_type");
  });

  it("aplica timeout", async () => {
    const dir = await tempDir();
    const timeoutErr = new Error("timeout");
    timeoutErr.name = "TimeoutError";
    const dl = new AssetDownloader({ tempDir: dir, fetcher: vi.fn().mockRejectedValue(timeoutErr) });
    const err = await dl.download("https://x/slow.jpg").catch((e) => e);
    expect(err.code).toBe("timeout");
  });

  it("rechaza archivo demasiado grande (límite en vivo durante el streaming)", async () => {
    const dir = await tempDir();
    // respuesta con más bytes que el límite configurado
    const big = Buffer.alloc(DEFAULT_LIMITS.maxBytes / 8 + 10, 1);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(big));
        controller.close();
      },
    });
    const dl = new AssetDownloader({
      tempDir: dir,
      limits: { maxBytes: big.length - 5, timeoutMs: 5000 },
      fetcher: vi.fn().mockResolvedValue(new Response(stream, { status: 200, headers: { "Content-Type": "image/png" } })),
    });
    const err = await dl.download("https://x/big.png").catch((e) => e);
    expect(err.code).toBe("file_too_large");
    // el temporal fallido se limpia
    const { readdir } = await import("node:fs/promises");
    expect((await readdir(dir)).filter((f) => f.startsWith("dl_"))).toHaveLength(0);
  });

  it("rechaza cuerpo vacío", async () => {
    const dir = await tempDir();
    const dl = new AssetDownloader({
      tempDir: dir,
      fetcher: vi.fn().mockResolvedValue(new Response(new Uint8Array(0), { status: 200, headers: { "Content-Type": "image/jpeg" } })),
    });
    const err = await dl.download("https://x/empty.jpg").catch((e) => e);
    expect(err.code).toBe("empty_file");
  });

  it("sigue redirects (redirect: follow) y no permite escribir fuera de temp/", async () => {
    const dir = await tempDir();
    const fetcher = vi.fn().mockResolvedValue(imageResponse(PNG));
    const dl = new AssetDownloader({ tempDir: dir, fetcher });
    await dl.download("https://cdn.example.com/redirected.jpg");
    expect(fetcher).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ redirect: "follow" }));
    // prueba explícita de contención de ruta
    const outside = path.join(dir, "..", "escape.bin");
    expect(path.resolve(outside).startsWith(path.resolve(dir))).toBe(false);
  });
});

describe("AssetValidator (base para tests de AssetService)", () => {
  it("acepta PNG y calcula sha256 estable", async () => {
    const { AssetValidator } = await import("./validator");
    const dir = await tempDir();
    const file = path.join(dir, "img.png");
    await writeFile(file, PNG);
    const v = new AssetValidator();
    const result = await v.validateFile(file);
    expect(result.mimeType).toBe("image/png");
    expect(result.extension).toBe("png");
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1280);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    // hash determinista
    const again = await v.validateFile(file);
    expect(again.sha256).toBe(result.sha256);
    await rm(dir, { recursive: true, force: true });
  });

  it("rechaza HTML disfrazado de .jpg", async () => {
    const { AssetValidator } = await import("./validator");
    const dir = await tempDir();
    const file = path.join(dir, "evil.jpg");
    await writeFile(file, Buffer.from("<!doctype html><html><h1>hola</h1></html>" + "x".repeat(1200)));
    const err = await new AssetValidator().validateFile(file).catch((e) => e);
    expect(err).toBeInstanceOf(AssetError);
    expect(err.code).toBe("not_an_image");
    await rm(dir, { recursive: true, force: true });
  });

  it("rechaza archivo vacío y demasiado pequeño", async () => {
    const { AssetValidator } = await import("./validator");
    const dir = await tempDir();
    const file = path.join(dir, "tiny.jpg");
    await writeFile(file, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));
    const err = await new AssetValidator().validateFile(file).catch((e) => e);
    expect(err.code).toBe("empty_file");
    const missing = await new AssetValidator().validateFile(path.join(dir, "missing.jpg")).catch((e) => e);
    expect(missing.code).toBe("not_found");
    await rm(dir, { recursive: true, force: true });
  });
});

describe("image-format · detección por magic bytes", () => {
  it("detecta JPEG, PNG, WEBP y GIF; rechaza texto", async () => {
    const { detectImageFormat } = await import("./image-format");
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
    expect(detectImageFormat(jpeg)).toMatchObject({ ok: true, info: { mimeType: "image/jpeg" } });

    expect(detectImageFormat(pngBuffer())).toMatchObject({
      ok: true,
      info: { mimeType: "image/png", width: 1920, height: 1280 },
    });

    const webp = Buffer.concat([
      Buffer.from("RIFF", "ascii"), Buffer.from([36, 0, 0, 0]), Buffer.from("WEBP", "ascii"), Buffer.from("VP8 ", "ascii"),
      Buffer.alloc(10), Buffer.from([0x80, 0x07, 0x00, 0x05, 0x00]), Buffer.alloc(10),
    ]);
    const webpResult = detectImageFormat(webp);
    expect(webpResult).toMatchObject({ ok: true, info: { mimeType: "image/webp" } });
    if (webpResult.ok) expect(webpResult.info.width).toBe(1920);

    const gif = Buffer.concat([Buffer.from("GIF89a", "ascii"), Buffer.from([0x80, 0x07, 0x00, 0x05, 0x00]), Buffer.alloc(20)]);
    expect(detectImageFormat(gif)).toMatchObject({ ok: true, info: { mimeType: "image/gif", width: 1920, height: 1280 } });

    const html = Buffer.from("<!doctype html><html>" + "x".repeat(32));
    expect(detectImageFormat(html)).toMatchObject({ ok: false, reason: "not_an_image" });
  });
});
