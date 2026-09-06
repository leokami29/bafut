import { describe, expect, it } from "vitest";
import {
  CLAIM_REJECT_COOLDOWN_DAYS,
  claimCooldownEndsAt,
  claimStatusLabel,
  formatClaimCooldownUntil,
  isClaimInCooldown,
  validateClaimInput,
  validateClaimProofChecklist,
  venueOwnershipDisputeMailto,
} from "@/lib/venue-claims";

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

describe("validateClaimProofChecklist", () => {
  it("exige al menos una prueba", () => {
    const result = validateClaimProofChecklist({
      proofFacade: false,
      proofNit: false,
      proofCallNote: "",
    });
    expect("error" in result).toBe(true);
  });

  it("acepta solo fachada", () => {
    expect(
      validateClaimProofChecklist({
        proofFacade: true,
        proofNit: false,
        proofCallNote: "",
      }),
    ).toEqual({
      ok: true,
      proofFacade: true,
      proofNit: false,
      proofCallNote: null,
    });
  });

  it("acepta solo nota de llamada válida", () => {
    const result = validateClaimProofChecklist({
      proofFacade: false,
      proofNit: false,
      proofCallNote: "  Llamé a recepción, confirmó a Carlos.  ",
    });
    expect(result).toEqual({
      ok: true,
      proofFacade: false,
      proofNit: false,
      proofCallNote: "Llamé a recepción, confirmó a Carlos.",
    });
  });

  it("rechaza nota de llamada demasiado corta", () => {
    const result = validateClaimProofChecklist({
      proofFacade: false,
      proofNit: false,
      proofCallNote: "ok",
    });
    expect("error" in result && result.error).toMatch(/nota de llamada/i);
  });
});

describe("claim cooldown", () => {
  it(`usa ${CLAIM_REJECT_COOLDOWN_DAYS} días`, () => {
    const reviewedAt = "2026-09-01T12:00:00.000Z";
    const end = claimCooldownEndsAt(reviewedAt);
    expect(end.toISOString()).toBe("2026-09-08T12:00:00.000Z");
  });

  it("detecta cooldown activo y vencido", () => {
    const reviewedAt = "2026-09-01T12:00:00.000Z";
    expect(isClaimInCooldown(reviewedAt, new Date("2026-09-05T12:00:00.000Z"))).toBe(true);
    expect(isClaimInCooldown(reviewedAt, new Date("2026-09-09T12:00:00.000Z"))).toBe(false);
    expect(isClaimInCooldown(null)).toBe(false);
  });

  it("formatea fecha de fin en es-CO", () => {
    const text = formatClaimCooldownUntil("2026-09-01T12:00:00.000Z", "America/Bogota");
    expect(text).toMatch(/\d{2}\/\d{2}\/2026/);
  });
});

describe("venueOwnershipDisputeMailto", () => {
  it("arma mailto con asunto y cuerpo", () => {
    const href = venueOwnershipDisputeMailto({
      venueName: "Cancha Norte",
      venueSlug: "cancha-norte",
      siteOrigin: "https://bafut.macuttech.com",
    });
    expect(href.startsWith("mailto:duenos@bafut.com?")).toBe(true);
    expect(href).toContain(encodeURIComponent("Disputa de titularidad: Cancha Norte"));
    expect(href).toContain(encodeURIComponent("https://bafut.macuttech.com/canchas/cancha-norte"));
  });
});
