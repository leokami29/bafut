import { describe, expect, it } from "vitest";
import { isProfileComplete, profileCompletenessHint } from "@/lib/profile";

describe("isProfileComplete", () => {
  it("completo con nombre válido (sin email)", () => {
    expect(isProfileComplete({ display_name: "Juan" })).toBe(true);
  });

  it("incompleto con nombre corto", () => {
    expect(isProfileComplete({ display_name: "J" })).toBe(false);
    expect(isProfileComplete({ display_name: "" })).toBe(false);
    expect(isProfileComplete({ display_name: "  " })).toBe(false);
  });

  it("WhatsApp ya no es obligatorio", () => {
    expect(isProfileComplete({ display_name: "Juan", whatsapp: null })).toBe(true);
    expect(isProfileComplete({ display_name: "Juan", whatsapp: "" })).toBe(true);
  });

  it("rechaza nombre igual al prefijo del email", () => {
    expect(isProfileComplete({ display_name: "juan" }, "juan@gmail.com")).toBe(false);
    expect(isProfileComplete({ display_name: "Juan" }, "juan@gmail.com")).toBe(false);
  });

  it("acepta nombre distinto al prefijo del email", () => {
    expect(isProfileComplete({ display_name: "Juan Pérez" }, "juan@gmail.com")).toBe(true);
  });

  it("acepta email con prefijo corto (< 2 chars)", () => {
    expect(isProfileComplete({ display_name: "ab" }, "a@gmail.com")).toBe(true);
  });
});

describe("profileCompletenessHint", () => {
  it("null cuando el perfil está completo", () => {
    expect(profileCompletenessHint({ display_name: "Juan" })).toBe(null);
  });

  it("mensaje cuando falta nombre", () => {
    expect(profileCompletenessHint({ display_name: "J" })).toBe(
      "Pon tu nombre de cancha para que el host sepa quién pide el cupo.",
    );
  });
});
