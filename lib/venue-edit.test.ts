import { describe, expect, it } from "vitest";
import {
  diffVenueFields,
  parseCoordinate,
  parsePastedCoords,
  validateVenueFields,
  type VenueEditableFields,
} from "@/lib/venue-edit";

const base: VenueEditableFields = {
  name: "La Jaula",
  neighborhood: "Riomar",
  address: "Cra. 53 #86-119",
  phone: "3014258786",
  website: "https://lajaula.co",
  notes: "Canchas techadas",
  lat: 11.0118,
  lng: -74.8214,
};

describe("validateVenueFields", () => {
  it("acepta una ficha completa válida", () => {
    expect(validateVenueFields(base)).toEqual({ ok: true });
  });

  it("rechaza nombre corto y muy largo", () => {
    expect("error" in validateVenueFields({ name: "x" })).toBe(true);
    expect("error" in validateVenueFields({ name: "y".repeat(121) })).toBe(true);
  });

  it("rechaza teléfono con letras", () => {
    expect("error" in validateVenueFields({ phone: "no es un tel" })).toBe(true);
  });

  it("acepta formatos de teléfono válidos", () => {
    expect(validateVenueFields({ phone: "+57 301 4258786" })).toEqual({ ok: true });
    expect(validateVenueFields({ phone: "(605) 1234567" })).toEqual({ ok: true });
    expect(validateVenueFields({ phone: "" })).toEqual({ ok: true }); // vacío = limpiar
  });

  it("rechaza website sin protocolo", () => {
    expect("error" in validateVenueFields({ website: "lajaula.co" })).toBe(true);
    expect(validateVenueFields({ website: "https://lajaula.co" })).toEqual({ ok: true });
  });

  it("requiere al menos un deporte válido", () => {
    expect("error" in validateVenueFields({ sports: [] })).toBe(true);
    expect("error" in validateVenueFields({ sports: ["tenis"] })).toBe(true);
    expect(validateVenueFields({ sports: ["futbol", "padel"] })).toEqual({ ok: true });
  });

  it("valida coordenadas en rango", () => {
    expect("error" in validateVenueFields({ lat: 95 })).toBe(true);
    expect("error" in validateVenueFields({ lng: -200 })).toBe(true);
    expect(validateVenueFields({ lat: 10.98, lng: -74.79 })).toEqual({ ok: true });
  });

  it("rechaza notas larguísimas", () => {
    expect("error" in validateVenueFields({ notes: "x".repeat(501) })).toBe(true);
  });
});

describe("diffVenueFields", () => {
  it("solo devuelve campos cambiados, ya trimeados", () => {
    const diff = diffVenueFields(base, { ...base, phone: "  6051234567  ", name: "La Jaula" });
    expect(diff).toEqual({ phone: "6051234567" });
  });

  it("un campo vacío seteado como '' se envía para limpiar", () => {
    const diff = diffVenueFields(base, { ...base, website: "" });
    expect(diff.website).toBe("");
  });

  it("campos numéricos solo cambian si difieren", () => {
    expect(diffVenueFields(base, base)).toEqual({});
    expect(diffVenueFields(base, { ...base, lat: 10 }).lat).toBe(10);
  });
});

describe("parseCoordinate", () => {
  it("convierte comas a punto y valida números", () => {
    expect(parseCoordinate("10,96854")).toBeCloseTo(10.96854, 5);
    expect(parseCoordinate("-74.78132")).toBeCloseTo(-74.78132, 5);
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate("abc")).toBeNull();
  });
});

describe("parsePastedCoords", () => {
  it("entiende lo que Google Maps copia al portapapeles", () => {
    expect(parsePastedCoords("10.96854, -74.78132")).toEqual({ lat: 10.96854, lng: -74.78132 });
    expect(parsePastedCoords("10.96854 -74.78132")).toEqual({ lat: 10.96854, lng: -74.78132 });
    expect(parsePastedCoords(" 10.96854 ; -74.78132 ")).toEqual({ lat: 10.96854, lng: -74.78132 });
  });

  it("acepta punto y coma como separador", () => {
    expect(parsePastedCoords("10.96854; -74.78132")).toEqual({ lat: 10.96854, lng: -74.78132 });
  });

  it("rechaza pares incompletos, no numéricos o fuera de rango", () => {
    expect(parsePastedCoords("10.9")).toBeNull();
    expect(parsePastedCoords("10.9, 20.5, 30.1")).toBeNull();
    expect(parsePastedCoords("abc, def")).toBeNull();
    expect(parsePastedCoords("100, 0")).toBeNull();
    expect(parsePastedCoords("0, 500")).toBeNull();
    expect(parsePastedCoords("")).toBeNull();
  });
});
