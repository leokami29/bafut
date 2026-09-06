import { describe, expect, it } from "vitest";
import {
  clearNearMePreference,
  NEAR_ME_STORAGE_KEY,
  parseNearMePreference,
  readNearMePreference,
  writeNearMePreference,
} from "@/lib/near-me-preference";

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("parseNearMePreference", () => {
  it("acepta opt-in válido", () => {
    const raw = JSON.stringify({
      enabled: true,
      lat: 10.96,
      lng: -74.78,
      savedAt: "2026-09-05T12:00:00.000Z",
    });
    expect(parseNearMePreference(raw)).toEqual({
      enabled: true,
      lat: 10.96,
      lng: -74.78,
      savedAt: "2026-09-05T12:00:00.000Z",
    });
  });

  it("rechaza coordenadas fuera de rango", () => {
    expect(
      parseNearMePreference(JSON.stringify({ enabled: true, lat: 100, lng: 0, savedAt: "x" })),
    ).toBeNull();
  });

  it("rechaza JSON inválido o enabled false", () => {
    expect(parseNearMePreference("{")).toBeNull();
    expect(parseNearMePreference(JSON.stringify({ enabled: false, lat: 1, lng: 2 }))).toBeNull();
    expect(parseNearMePreference(null)).toBeNull();
  });
});

describe("read/write/clearNearMePreference", () => {
  it("persiste y restaura entre lecturas", () => {
    const storage = memoryStorage();
    const now = new Date("2026-09-05T15:00:00.000Z");
    const written = writeNearMePreference(10.97, -74.79, storage, now);
    expect(written?.lat).toBe(10.97);
    expect(storage.getItem(NEAR_ME_STORAGE_KEY)).toContain("10.97");
    expect(readNearMePreference(storage)).toEqual(written);
  });

  it("devuelve la misma referencia si el raw no cambió", () => {
    const storage = memoryStorage();
    writeNearMePreference(10.97, -74.79, storage);
    const a = readNearMePreference(storage);
    const b = readNearMePreference(storage);
    expect(a).toBe(b);
  });

  it("clear elimina la clave", () => {
    const storage = memoryStorage();
    writeNearMePreference(1, 2, storage);
    clearNearMePreference(storage);
    expect(readNearMePreference(storage)).toBeNull();
  });
});
