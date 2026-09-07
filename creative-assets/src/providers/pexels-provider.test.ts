import { describe, expect, it, vi } from "vitest";
import { PexelsProvider, PEXELS_LICENSE } from "./pexels-provider";
import { ProviderError, SearchImagesOptions } from "./types";

/** Fábrica de respuestas JSON simuladas de la API de Pexels. */
function pexelsPayload(overrides: Record<string, unknown> = {}) {
  return {
    page: 1,
    per_page: 10,
    total_results: 2,
    photos: [
      {
        id: 123,
        width: 1920,
        height: 1280,
        url: "https://www.pexels.com/photo/123/",
        photographer: "John Doe",
        photographer_url: "https://www.pexels.com/@johndoe",
        photographer_id: 9,
        avg_color: "#0C6B4C",
        liked: false,
        alt: "Football player kicking",
        src: {
          original: "https://images.pexels.com/photos/123/original.jpg",
          large2x: "https://images.pexels.com/photos/123/large2x.jpg",
          large: "https://images.pexels.com/photos/123/large.jpg",
          medium: "https://images.pexels.com/photos/123/medium.jpg",
          small: "https://images.pexels.com/photos/123/small.jpg",
          tiny: "https://images.pexels.com/photos/123/tiny.jpg",
        },
      },
      {
        id: 456,
        width: 3000,
        height: 2000,
        url: "https://www.pexels.com/photo/456/",
        photographer: "Jane Doe",
        photographer_url: "https://www.pexels.com/@janedoe",
        photographer_id: 8,
        avg_color: "#073828",
        liked: true,
        alt: "Soccer Match",
        src: {
          original: "https://images.pexels.com/photos/456/original.jpg",
          large2x: "https://images.pexels.com/photos/456/large2x.jpg",
          large: "https://images.pexels.com/photos/456/large.jpg",
          medium: "https://images.pexels.com/photos/456/medium.jpg",
          small: "https://images.pexels.com/photos/456/small.jpg",
          tiny: "https://images.pexels.com/photos/456/tiny.jpg",
        },
      },
      // item inválido: debe ser descartado, no romper
      { id: null, src: null },
    ],
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const BASE: SearchImagesOptions = { query: "football player" };

describe("PexelsProvider · normalización", () => {
  it("normaliza la respuesta de Pexels al formato común", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, pexelsPayload()));
    const provider = new PexelsProvider({ apiKey: "test-key", fetcher });

    const results = await provider.search(BASE);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain("https://api.pexels.com/v1/search?");
    expect(String(url)).toContain("query=football+player");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "test-key" });

    expect(results).toHaveLength(2); // el item inválido se descarta
    const first = results[0];
    expect(first.id).toBe("pexels-123");
    expect(first.provider).toBe("pexels");
    expect(first.title).toBe("Football player kicking");
    expect(first.thumbnailUrl).toContain("/tiny.jpg");
    expect(first.previewUrl).toContain("/large.jpg");
    expect(first.originalUrl).toContain("/original.jpg");
    expect(first.width).toBe(1920);
    expect(first.height).toBe(1280);
    expect(first.aspectRatio).toBeCloseTo(1.5, 2);
    expect(first.author).toEqual({ name: "John Doe", url: "https://www.pexels.com/@johndoe" });
    expect(first.sourceUrl).toBe("https://www.pexels.com/photo/123/");
    expect(first.license).toBe(PEXELS_LICENSE);
    expect(first.metadata).toMatchObject({ pexels_id: 123, avg_color: "#0C6B4C" });
  });

  it("transforma los parámetros de búsqueda a la query de Pexels", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, pexelsPayload({ photos: [] })));
    const provider = new PexelsProvider({ apiKey: "k", fetcher });
    await provider.search({
      query: "  soccer stadium night  ",
      limit: 5,
      page: 2,
      orientation: "landscape",
      size: "large",
      color: "green",
    });
    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain("query=soccer+stadium+night");
    expect(url).toContain("per_page=5");
    expect(url).toContain("page=2");
    expect(url).toContain("orientation=landscape");
    expect(url).toContain("size=large");
    expect(url).toContain("color=green");
  });

  it("limita per_page al máximo de Pexels (80)", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(200, pexelsPayload({ photos: [] })));
    const provider = new PexelsProvider({ apiKey: "k", fetcher });
    await provider.search({ query: "x", limit: 500 });
    expect(String(fetcher.mock.calls[0][0])).toContain("per_page=80");
  });
});

describe("PexelsProvider · errores", () => {
  it("falla claro con query vacía", async () => {
    const provider = new PexelsProvider({ apiKey: "k", fetcher: vi.fn() });
    await expect(provider.search({ query: "   " })).rejects.toThrow(ProviderError);
    await expect(provider.search({ query: "   " })).rejects.toThrow(/empty_query/);
  });

  it("falla claro sin API key", async () => {
    const provider = new PexelsProvider({ apiKey: undefined, fetcher: vi.fn() });
    await expect(provider.search(BASE)).rejects.toThrow(/PEXELS_API_KEY is not configured/);
  });

  it("mapea 401 a invalid_api_key", async () => {
    const provider = new PexelsProvider({ apiKey: "bad", fetcher: vi.fn().mockResolvedValue(jsonResponse(401, {})) });
    const err = await provider.search(BASE).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderError);
    expect(err.code).toBe("invalid_api_key");
    expect(err.httpStatus).toBe(401);
  });

  it("mapea 429 a rate_limit", async () => {
    const provider = new PexelsProvider({ apiKey: "k", fetcher: vi.fn().mockResolvedValue(jsonResponse(429, {})) });
    const err = await provider.search(BASE).catch((e) => e);
    expect(err.code).toBe("rate_limit");
  });

  it("mapea fallo de red a network", async () => {
    const provider = new PexelsProvider({ apiKey: "k", fetcher: vi.fn().mockRejectedValue(new TypeError("fetch failed")) });
    const err = await provider.search(BASE).catch((e) => e);
    expect(err.code).toBe("network");
  });

  it("mapea timeout a timeout", async () => {
    const timeoutErr = new Error("The operation was aborted due to timeout");
    timeoutErr.name = "TimeoutError";
    const provider = new PexelsProvider({ apiKey: "k", fetcher: vi.fn().mockRejectedValue(timeoutErr) });
    const err = await provider.search(BASE).catch((e) => e);
    expect(err.code).toBe("timeout");
  });

  it("mapea JSON inválido a invalid_response", async () => {
    const bad = new Response("not json", { status: 200 });
    const provider = new PexelsProvider({ apiKey: "k", fetcher: vi.fn().mockResolvedValue(bad) });
    const err = await provider.search(BASE).catch((e) => e);
    expect(err.code).toBe("invalid_response");
  });

  it("responde vacío sin lanzar error cuando no hay fotos", async () => {
    const provider = new PexelsProvider({
      apiKey: "k",
      fetcher: vi.fn().mockResolvedValue(jsonResponse(200, { page: 1, photos: [] })),
    });
    const results = await provider.search(BASE);
    expect(results).toEqual([]);
  });
});
