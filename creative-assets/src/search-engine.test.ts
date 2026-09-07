import { describe, expect, it, vi } from "vitest";
import { SearchEngine, makeCacheKey } from "./search-engine";
import { ImageCandidate, ImageProvider, ImageSearchResult, ProviderError, SearchCache } from "./providers/types";

function fakeProvider(id: string, results: Partial<ImageSearchResult>[], impl?: Partial<ImageProvider>): ImageProvider {
  return {
    id,
    search: impl?.search ?? vi.fn().mockResolvedValue(
      results.map((r, i) => ({
        id: `${id}-${i}`,
        provider: id,
        thumbnailUrl: "https://img/thumb.jpg",
        previewUrl: "https://img/preview.jpg",
        originalUrl: "https://img/original.jpg",
        ...r,
      })) as ImageSearchResult[],
    ),
    ...impl,
  };
}

describe("SearchEngine", () => {
  it("normaliza y envuelve los resultados como candidatos pendientes", async () => {
    const engine = new SearchEngine([fakeProvider("pexels", [{ title: "A" }, { title: "B" }])]);
    const outcome = await engine.searchImages({ query: "football player" });
    expect(outcome.totalResults).toBe(2);
    expect(outcome.candidates[0]).toMatchObject({
      status: "pending",
      result: { provider: "pexels", title: "A" },
    });
    expect(outcome.candidates[0].selected).toBeUndefined();
  });

  it("falla claro si no hay proveedores habilitados", () => {
    expect(() => new SearchEngine([])).toThrow(/No hay proveedores habilitados/);
  });

  it("agrega resultados de múltiples proveedores", async () => {
    const engine = new SearchEngine([
      fakeProvider("pexels", [{ title: "A" }]),
      fakeProvider("fake2", [{ title: "B" }]),
    ]);
    const outcome = await engine.searchImages({ query: "x" });
    expect(outcome.totalResults).toBe(2);
    expect(outcome.byProvider.map((o) => o.providerId).sort()).toEqual(["fake2", "pexels"]);
  });

  it("un proveedor caído NO aborta la búsqueda: reporta el error por proveedor", async () => {
    const broken = fakeProvider("broken", [], {
      search: vi.fn().mockRejectedValue(new ProviderError("network", "broken", "boom")),
    });
    const engine = new SearchEngine([broken, fakeProvider("pexels", [{ title: "OK" }])]);
    const outcome = await engine.searchImages({ query: "x" });
    expect(outcome.totalResults).toBe(1);
    const brokenOutcome = outcome.byProvider.find((o) => o.providerId === "broken");
    expect(brokenOutcome?.error).toBeInstanceOf(ProviderError);
    expect(brokenOutcome?.error?.message).toContain("[broken] network");
  });

  it("transforma errores no-ProviderError en ProviderError", async () => {
    const weird = fakeProvider("weird", [], { search: vi.fn().mockRejectedValue(new Error("undefined is not a function")) });
    const engine = new SearchEngine([weird]);
    const outcome = await engine.searchImages({ query: "x" });
    expect(outcome.byProvider[0].error).toBeInstanceOf(ProviderError);
    expect(outcome.byProvider[0].error?.message).toContain("weird");
  });
});

describe("SearchEngine · cache (arquitectura, NoopCache por defecto)", () => {
  it("con un cache activo, la segunda búsqueda idéntica se sirve del cache", async () => {
    const store = new Map<string, ImageCandidate[]>();
    const cache: SearchCache = {
      get: <T,>(k: string) => store.get(k) as T | undefined,
      set: (k, v) => void store.set(k, v as ImageCandidate[]),
    };
    const search = vi.fn().mockResolvedValue([{ id: "pexels-1", provider: "pexels", thumbnailUrl: "t", previewUrl: "p", originalUrl: "o" }]);
    const provider = fakeProvider("pexels", [], { search });
    const engine = new SearchEngine([provider], cache);

    await engine.searchImages({ query: "football player", limit: 10 });
    await engine.searchImages({ query: "football player", limit: 10 });

    expect(search).toHaveBeenCalledTimes(1); // segunda desde cache
  });

  it("consultas distintas generan claves de cache distintas", () => {
    const a = makeCacheKey("pexels", { query: "Football Player", limit: 10 });
    const b = makeCacheKey("pexels", { query: "football player", limit: 20 });
    const c = makeCacheKey("unsplash", { query: "Football Player", limit: 10 });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    // case-insensitive en la query
    expect(a).toBe(makeCacheKey("pexels", { query: "FOOTBALL PLAYER", limit: 10 }));
  });
});

describe("ImageCandidate (arquitectura de selección, fase 3)", () => {
  it("permite marcar selección/rechazo sin afectar el resultado original", async () => {
    const engine = new SearchEngine([fakeProvider("pexels", [{ title: "A" }])]);
    const outcome = await engine.searchImages({ query: "x" });
    const c = outcome.candidates[0];
    c.status = "rejected";
    c.rejectionReason = "resolución insuficiente para impresión";
    expect(c.result.id).toBe("pexels-0");
    expect(c.rejectionReason).toContain("impresión");
  });
});
