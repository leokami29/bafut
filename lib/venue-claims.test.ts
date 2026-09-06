import { describe, expect, it } from "vitest";
import { claimStatusLabel, validateClaimInput } from "@/lib/venue-claims";

describe("validateClaimInput", () => {
  it("acepta celular CO, nota válida y sin email", () => {
    const result = validateClaimInput({
      whatsapp: "3001234567",
      note: "Soy el encargado, pregunten en la recepción al 6052221111.",
    });
    expect(result).toEqual({
      ok: true,
      whatsapp: "573001234567",
      email: null,
      note: "Soy el encargado, pregunten en la recepción al 6052221111.",
    });
  });

  it("normaliza el email a minúsculas", () => {
    const result = validateClaimInput({
      whatsapp: "573001234567",
      email: "Dueño@Example.com",
      note: "Dueño desde 2019, la razón social es Deportes SA.",
    });
    expect("ok" in result && result.email).toBe("dueño@example.com");
  });

  it("rechaza teléfono no celular colombiano", () => {
    expect("ok" in validateClaimInput({ whatsapp: "6051234567", note: "x".repeat(15) })).toBe(false);
    expect("ok" in validateClaimInput({ whatsapp: "123", note: "x".repeat(15) })).toBe(false);
    expect("ok" in validateClaimInput({ whatsapp: "", note: "x".repeat(15) })).toBe(false);
  });

  it("rechaza email mal formado", () => {
    const result = validateClaimInput({
      whatsapp: "3001234567",
      email: "no-es-email",
      note: "Pregunten por Carlos en la taquilla de la cancha.",
    });
    expect("error" in result && result.error).toContain("correo");
  });

  it("rechaza nota corta y muy larga", () => {
    expect("ok" in validateClaimInput({ whatsapp: "3001234567", note: "soy" })).toBe(false);
    expect("ok" in validateClaimInput({ whatsapp: "3001234567", note: "x".repeat(501) })).toBe(false);
  });
});

describe("claimStatusLabel", () => {
  it("traduce estados", () => {
    expect(claimStatusLabel("pending")).toBe("En revisión");
    expect(claimStatusLabel("approved")).toBe("Aprobado");
    expect(claimStatusLabel("rejected")).toBe("Rechazado");
    expect(claimStatusLabel("otro")).toBe("otro");
  });
});
