import { describe, expect, it } from "vitest";
import {
  humanizeSideBError,
  occupancyReason,
  occupancyUserMessage,
  parseOccupancyShareCode,
  type OccupancyHit,
} from "@/lib/occupancy";

function hit(overrides: Partial<OccupancyHit> = {}): OccupancyHit {
  return {
    match_id: "11111111-1111-1111-1111-111111111111",
    share_code: "abc12345",
    host_id: "host-1",
    starts_at: "2026-09-05T15:30:00.000Z",
    duration_min: 60,
    venue_id: "venue-1",
    venue_name: "La Jaula",
    away_opened_by: null,
    open_slot_count: 2,
    has_side_b: false,
    sport: "futbol",
    format: "5v5",
    ...overrides,
  };
}

describe("occupancyReason", () => {
  it("own gana: el host ve su propio partido aunque queden cupos", () => {
    expect(occupancyReason("host-1", hit({ open_slot_count: 2 }))).toBe("own");
    expect(occupancyReason("host-1", hit({ open_slot_count: 0, has_side_b: true }))).toBe("own");
  });

  it("join cuando hay cupos libres y no es tuyo", () => {
    expect(occupancyReason(null, hit({ open_slot_count: 1 }))).toBe("join");
    expect(occupancyReason("otro", hit({ open_slot_count: 3 }))).toBe("join");
  });

  it("open_b cuando el equipo está completo y aún no hay rival", () => {
    expect(occupancyReason(null, hit({ open_slot_count: 0, has_side_b: false }))).toBe("open_b");
  });

  it("blocked cuando está completo y ya hay lado B", () => {
    expect(occupancyReason(null, hit({ open_slot_count: 0, has_side_b: true }))).toBe("blocked");
    expect(occupancyReason("otro", hit({ open_slot_count: 0, has_side_b: true }))).toBe("blocked");
  });

  it("userId null nunca produce own", () => {
    expect(occupancyReason(null, hit())).toBe("join");
    expect(occupancyReason(undefined, hit())).toBe("join");
  });
});

describe("occupancyUserMessage", () => {
  it("mensaje own invita a editar/compartir en vez de republicar", () => {
    const msg = occupancyUserMessage({ ...hit(), reason: "own" });
    expect(msg).toContain("Ya publicaste");
    expect(msg).toContain("La Jaula");
  });

  it("mensaje join menciona cuántos cupos faltan", () => {
    const msg = occupancyUserMessage({ ...hit({ open_slot_count: 2 }), reason: "join" });
    expect(msg).toContain("Faltan 2");
  });

  it("mensaje open_b propone armar el rival", () => {
    const msg = occupancyUserMessage({ ...hit(), reason: "open_b" });
    expect(msg).toContain("rival");
  });

  it("mensaje blocked sugiere otra hora", () => {
    const msg = occupancyUserMessage({ ...hit(), reason: "blocked" });
    expect(msg).toContain("otra hora");
  });

  it("sin venue_name usa fallback genérico", () => {
    const msg = occupancyUserMessage({ ...hit({ venue_name: "" }), reason: "own" });
    expect(msg).toContain("esa cancha");
  });
});

describe("humanizeSideBError", () => {
  it("vacío da mensaje por defecto", () => {
    expect(humanizeSideBError(null)).toBe("No se pudo armar el rival. Probá de nuevo.");
    expect(humanizeSideBError("  ")).toBe("No se pudo armar el rival. Probá de nuevo.");
  });

  it("traduce límite de cupos", () => {
    expect(humanizeSideBError("El lado B admite 1 o 2 cupos.")).toBe(
      "Pedí 1 o 2 cupos para el otro equipo.",
    );
  });

  it("traduce intento del host", () => {
    const msg = humanizeSideBError("El lado B es el equipo en contra. Si faltan de tu grupo, uníte a los cupos.");
    expect(msg).toContain("Vos armaste esta pateada");
  });

  it("traduce lado ya abierto", () => {
    expect(humanizeSideBError("El lado B ya está abierto")).toBe(
      "El otro equipo ya se armó. Pedí un cupo ahí.",
    );
  });

  it("errores desconocidos pasan tal cual", () => {
    expect(humanizeSideBError("Error interno")).toBe("Error interno");
  });
});

describe("parseOccupancyShareCode", () => {
  it("extrae el código del formato OCCUPANCY:xxxxxxxx", () => {
    expect(parseOccupancyShareCode("OCCUPANCY:abc12345")).toBe("abc12345");
  });

  it("acepta mayúsculas y normaliza a minúsculas", () => {
    expect(parseOccupancyShareCode("OCCUPANCY:ABCDEF01")).toBe("abcdef01");
  });

  it("rechaza mensajes sin código o con formato inválido", () => {
    expect(parseOccupancyShareCode("OCCUPANCY")).toBe(null);
    expect(parseOccupancyShareCode("OCCUPANCY:xyz")).toBe(null);
    expect(parseOccupancyShareCode("OCCUPANCY:abc123456")).toBe(null);
    expect(parseOccupancyShareCode("")).toBe(null);
    expect(parseOccupancyShareCode(undefined)).toBe(null);
  });
});
