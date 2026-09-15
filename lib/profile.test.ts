import { describe, expect, it } from "vitest";
import {
  isProfileComplete,
  isPublicPlayerCard,
  missingProfileSteps,
  profileCompletenessHint,
} from "@/lib/profile";
import type { ProfileGate } from "@/lib/player-card";

function gate(over: Partial<ProfileGate> = {}): ProfileGate {
  return {
    display_name: "Juan",
    whatsapp: "573001234567",
    avatar_path: "11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222.jpg",
    preferred_sport: "futbol",
    preferred_format: "5v5",
    preferred_position: "fwd",
    terms_accepted_at: "2026-09-15T00:00:00Z",
    ...over,
  };
}

describe("isPublicPlayerCard", () => {
  it("pública con ficha mínima sin WhatsApp", () => {
    expect(isPublicPlayerCard(gate({ whatsapp: null }))).toBe(true);
  });

  it("no pública sin foto ni términos", () => {
    expect(isPublicPlayerCard(gate({ avatar_path: null }))).toBe(false);
    expect(isPublicPlayerCard(gate({ terms_accepted_at: null }))).toBe(false);
  });
});

describe("isProfileComplete", () => {
  it("completo con ficha mínima", () => {
    expect(isProfileComplete(gate())).toBe(true);
  });

  it("incompleto con nombre corto", () => {
    expect(isProfileComplete(gate({ display_name: "J" }))).toBe(false);
    expect(isProfileComplete(gate({ display_name: "" }))).toBe(false);
  });

  it("exige WhatsApp", () => {
    expect(isProfileComplete(gate({ whatsapp: null }))).toBe(false);
    expect(isProfileComplete(gate({ whatsapp: "" }))).toBe(false);
  });

  it("exige foto, formato y términos", () => {
    expect(isProfileComplete(gate({ avatar_path: null }))).toBe(false);
    expect(isProfileComplete(gate({ preferred_format: null }))).toBe(false);
    expect(isProfileComplete(gate({ terms_accepted_at: null }))).toBe(false);
  });

  it("rechaza formato que no es del deporte", () => {
    expect(isProfileComplete(gate({ preferred_sport: "basquet", preferred_format: "11v11" }))).toBe(
      false,
    );
  });

  it("rechaza nombre igual al prefijo del email", () => {
    expect(isProfileComplete(gate({ display_name: "juan" }), "juan@gmail.com")).toBe(false);
  });

  it("acepta nombre distinto al prefijo del email", () => {
    expect(isProfileComplete(gate({ display_name: "Juan Pérez" }), "juan@gmail.com")).toBe(true);
  });
});

describe("profileCompletenessHint", () => {
  it("null cuando el perfil está completo", () => {
    expect(profileCompletenessHint(gate())).toBe(null);
  });

  it("mensaje cuando falta nombre", () => {
    expect(profileCompletenessHint(gate({ display_name: "J" }))).toBe(
      "Pon tu nombre de cancha para que el host sepa quién pide el cupo.",
    );
  });
});

describe("missingProfileSteps", () => {
  it("marca contacto si falta WhatsApp", () => {
    expect(missingProfileSteps(gate({ whatsapp: null })).contact).toBe(true);
    expect(missingProfileSteps(gate()).contact).toBe(false);
  });
});
