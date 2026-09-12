import { describe, expect, it } from "vitest";
import {
  buildMatchSlotsPayload,
  type IntentPayloadInput,
} from "@/lib/match-intent-payload";

describe("buildMatchSlotsPayload — Intent 1: starter_slots (Happy Paths)", () => {
  it("construye correctamente Intent 1 para fútbol 5v5 con 3 titulares y 0 suplentes (quick count)", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.hostTeamName).toBeNull();
    expect(res.data.totalStartersA).toBe(3);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(3);

    // Todos los slots deben ser de Side A y starter
    expect(res.data.slots.every((s) => s.side === "a" && s.slot_role === "starter")).toBe(true);
    // Sin selección de cancha, pitch_index debe ser null
    expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
  });

  it("construye correctamente Intent 1 para fútbol 5v5 con selección táctica en cancha y 1 suplente", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      formationId: "futbol-5v5-Diamante",
      pitchSlots: [
        { pitchIndex: 0, position: "gk", level: "mid" },
        { pitchIndex: 2, position: "mid", level: "high" },
      ],
      benchCount: 1,
      rotationRule: "Rotación activa continua",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(2);
    expect(res.data.totalBenchA).toBe(1);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(3);

    // Titular 1: arquero en índice 0
    expect(res.data.slots[0]).toEqual({
      side: "a",
      slot_role: "starter",
      position: "gk",
      level: "mid",
      pitch_index: 0,
    });
    // Titular 2: volante en índice 2
    expect(res.data.slots[1]).toEqual({
      side: "a",
      slot_role: "starter",
      position: "mid",
      level: "high",
      pitch_index: 2,
    });
    // Suplente 1: banca en Side A, pitch_index null
    expect(res.data.slots[2]).toEqual({
      side: "a",
      slot_role: "bench",
      position: "any",
      level: "any",
      pitch_index: null,
    });
    expect(res.data.rotationRule).toBe("Rotación activa continua");
  });

  it("construye correctamente Intent 1 para vóley 6v6 con 4 titulares y 2 suplentes", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "voleibol",
      format: "6v6",
      pitchSlots: [
        { pitchIndex: 0, position: "armador", level: "any" },
        { pitchIndex: 1, position: "central", level: "any" },
        { pitchIndex: 2, position: "opuesto", level: "any" },
        { pitchIndex: 3, position: "receptor", level: "any" },
      ],
      benchCount: 2,
      rotationRule: "Rotación fija cada 15 min",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(4);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(6);
    expect(res.data.slots.slice(0, 4).every((s) => s.slot_role === "starter")).toBe(true);
    expect(res.data.slots.slice(4).every((s) => s.slot_role === "bench")).toBe(true);
  });

  it("construye correctamente Intent 1 para básquet 3v3 con 2 titulares y 1 suplente", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      pitchSlots: [
        { pitchIndex: 0, position: "base", level: "mid" },
        { pitchIndex: 1, position: "pivot", level: "high" },
      ],
      benchCount: 1,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(2);
    expect(res.data.totalBenchA).toBe(1);
    expect(res.data.slots).toHaveLength(3);
  });

  it("construye correctamente Intent 1 para pádel 2v2 con 1 titular faltante", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "padel",
      format: "2v2",
      pitchSlots: [{ pitchIndex: 1, position: "reves", level: "mid" }],
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(1);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.slots[0].position).toBe("reves");
    expect(res.data.slots[0].pitch_index).toBe(1);
  });

  it("asigna rol 'gk' al primer titular si needKeeper es true en deporte con arquero", () => {
    const input: IntentPayloadInput = {
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      benchCount: 0,
      needKeeper: true,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.slots[0].position).toBe("gk");
    expect(res.data.slots[1].position).toBe("any");
    expect(res.data.slots[2].position).toBe("any");
  });
});

describe("buildMatchSlotsPayload — Intent 2: bench_only (Happy Paths)", () => {
  it("construye correctamente Intent 2 para fútbol 5v5 con 0 titulares y 2 suplentes", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "Rotación activa continua",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("pickup");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(2);
    expect(res.data.totalRivalB).toBe(0);
    expect(res.data.slots).toHaveLength(2);
    expect(res.data.slots.every((s) => s.side === "a" && s.slot_role === "bench")).toBe(true);
    expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
    expect(res.data.rotationRule).toBe("Rotación activa continua");
  });

  it("construye correctamente Intent 2 para vóley 6v6 con 1 suplente y pacto obligatorio", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "voleibol",
      format: "6v6",
      benchCount: 1,
      rotationRule: "Rotación fija cada 15 min",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(1);
    expect(res.data.slots).toHaveLength(1);
    expect(res.data.slots[0].slot_role).toBe("bench");
  });

  it("construye correctamente Intent 2 para básquet 3v3 con 3 suplentes", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "basquet",
      format: "3v3",
      benchCount: 3,
      rotationRule: "Pacto libre acordado",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(3);
    expect(res.data.slots).toHaveLength(3);
  });

  it("construye correctamente Intent 2 para pádel 2v2 con el máximo de suplentes (4)", () => {
    const input: IntentPayloadInput = {
      intent: "bench_only",
      sport: "padel",
      format: "2v2",
      benchCount: 4,
      rotationRule: "Rotación activa continua",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(4);
    expect(res.data.slots).toHaveLength(4);
  });
});

describe("buildMatchSlotsPayload — Intent 3: challenge (Happy Paths)", () => {
  it("construye correctamente Intent 3 para fútbol 5v5 con 5 rivales en Side B y equipo completo", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "Los Galácticos",
      benchCount: 0,
      challengeModeType: "full_team",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.hostTeamName).toBe("Los Galácticos");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.totalRivalB).toBe(5);
    expect(res.data.slots).toHaveLength(5);
    expect(res.data.slots.every((s) => s.side === "b" && s.slot_role === "starter")).toBe(true);
    expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
  });

  it("construye correctamente Intent 3 para vóley 6v6 con 6 titulares rivales y 2 suplentes en Side B", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "voleibol",
      format: "6v6",
      hostTeamName: "Halcones VC",
      benchCount: 2,
      challengeModeType: "open_slots",
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.hostTeamName).toBe("Halcones VC");
    expect(res.data.totalStartersA).toBe(0);
    expect(res.data.totalBenchA).toBe(0);
    expect(res.data.totalRivalB).toBe(8); // 6 starters + 2 bench
    expect(res.data.slots).toHaveLength(8);

    const startersB = res.data.slots.filter((s) => s.slot_role === "starter");
    const benchB = res.data.slots.filter((s) => s.slot_role === "bench");
    expect(startersB).toHaveLength(6);
    expect(benchB).toHaveLength(2);
    expect(res.data.slots.every((s) => s.side === "b")).toBe(true);
  });

  it("construye correctamente Intent 3 para básquet 3v3 con 3 titulares rivales", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "basquet",
      format: "3v3",
      hostTeamName: "Rucker Street",
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.totalRivalB).toBe(3);
    expect(res.data.slots).toHaveLength(3);
  });

  it("construye correctamente Intent 3 para pádel 2v2 con 2 titulares rivales", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "padel",
      format: "2v2",
      hostTeamName: "Top Padel",
      benchCount: 0,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.matchMode).toBe("challenge");
    expect(res.data.totalRivalB).toBe(2);
    expect(res.data.slots).toHaveLength(2);
  });

  it("soporta fútbol 11v11 con 4 suplentes rivales (15 slots) respetando el límite < 16 de PostgreSQL", () => {
    const input: IntentPayloadInput = {
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      hostTeamName: "Atlético BaFut",
      benchCount: 4,
    };

    const res = buildMatchSlotsPayload(input);
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    expect(res.data.totalRivalB).toBe(15);
    expect(res.data.slots).toHaveLength(15);
    // 15 es estrictamente menor a 16 (límite del trigger guard_slot_side_insert)
    expect(res.data.slots.length).toBeLessThan(16);
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Starter Limits & Format Capacity", () => {
  it("rechaza si starterCount supera la capacidad de jugadores por lado (fútbol 5v5 -> 6)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 6,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si starterCount supera la capacidad en pádel 2v2 -> 3", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "padel",
      format: "2v2",
      starterCount: 3,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si pitchSlots supera la capacidad en básquet 3v3 -> 4", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      pitchSlots: [
        { pitchIndex: 0, position: "base" },
        { pitchIndex: 1, position: "ala" },
        { pitchIndex: 2, position: "pivot" },
        { pitchIndex: 3, position: "base" },
      ],
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si starterCount es 0 en Intent 1 (requiere al menos 1 titular)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 0,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza si starterCount es negativo", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: -1,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza pitchIndex negativo (< 0)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: -1 }],
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza pitchIndex fuera de rango (> 15)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 16 }],
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza índices de cancha duplicados en pitchSlots", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [
        { pitchIndex: 1, position: "def" },
        { pitchIndex: 1, position: "mid" },
      ],
    });
    expect(res.ok).toBe(false);
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Bench Limits (0, 1, 4, 5)", () => {
  it("rechaza benchCount = 0 en Intent 2 (Solo Banca REQUIERE al menos 1 suplente)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 0,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(false);
  });

  it("acepta benchCount = 1 en Intent 2 (límite inferior válido)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 1,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.totalBenchA).toBe(1);
  });

  it("acepta benchCount = 4 en Intent 2 (límite superior válido)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 4,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.totalBenchA).toBe(4);
  });

  it("rechaza benchCount = 5 en Intent 2 (supera el límite de 4 suplentes)", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 5,
      rotationRule: "Rotación activa continua",
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza benchCount negativo en cualquier intención", () => {
    const res1 = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 2,
      benchCount: -1,
    });
    expect(res1.ok).toBe(false);

    const res2 = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      benchCount: -1,
    });
    expect(res2.ok).toBe(false);
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Host Team Name Length (1, 2, 60, 61)", () => {
  it("rechaza nombre de equipo de 1 carácter ('A')", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "A",
    });
    expect(res.ok).toBe(false);
  });

  it("acepta nombre de equipo de 2 caracteres ('FC') y recorta espacios", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: "  FC  ",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hostTeamName).toBe("FC");
  });

  it("acepta nombre de equipo de exactamente 60 caracteres", () => {
    const name60 = "A".repeat(60);
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: name60,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hostTeamName).toBe(name60);
  });

  it("rechaza nombre de equipo de 61 caracteres", () => {
    const name61 = "A".repeat(61);
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: name61,
    });
    expect(res.ok).toBe(false);
  });

  it("permite nombre de equipo nulo o vacío en Intent 3", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      hostTeamName: null,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.hostTeamName).toBeNull();
  });
});

describe("buildMatchSlotsPayload — Boundary Tests: Rotation Rule Length", () => {
  it("rechaza regla de rotación de 1 carácter ('R')", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "R",
    });
    expect(res.ok).toBe(false);
  });

  it("acepta regla de rotación de 2 caracteres ('15')", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "15",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.rotationRule).toBe("15");
  });

  it("acepta regla de rotación de 120 caracteres", () => {
    const rule120 = "R".repeat(120);
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: rule120,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.rotationRule).toBe(rule120);
  });

  it("rechaza regla de rotación de 121 caracteres", () => {
    const rule121 = "R".repeat(121);
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: rule121,
    });
    expect(res.ok).toBe(false);
  });

  it("aplica fallback automático a 'Rotación activa continua' en Intent 2 si rotationRule está vacía", () => {
    const res = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      rotationRule: "",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.rotationRule).toBe("Rotación activa continua");
  });
});

describe("buildMatchSlotsPayload — Security & Integrity Invariants", () => {
  it("invariante RLS/Trigger: NINGÚN slot de Side B se genera en modo pickup (Intent 1 y Intent 2)", () => {
    const res1 = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 4,
      benchCount: 2,
    });
    expect(res1.ok).toBe(true);
    if (res1.ok) {
      expect(res1.data.slots.some((s) => s.side === "b")).toBe(false);
      expect(res1.data.totalRivalB).toBe(0);
    }

    const res2 = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "voleibol",
      format: "6v6",
      benchCount: 3,
    });
    expect(res2.ok).toBe(true);
    if (res2.ok) {
      expect(res2.data.slots.some((s) => s.side === "b")).toBe(false);
      expect(res2.data.totalRivalB).toBe(0);
    }
  });

  it("invariante RLS/Trigger: NINGÚN slot de Side A se genera en modo reto (Intent 3)", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.slots.some((s) => s.side === "a")).toBe(false);
      expect(res.data.totalStartersA).toBe(0);
      expect(res.data.totalBenchA).toBe(0);
    }
  });

  it("invariante de roles: todos los slots tienen estrictamente 'starter' o 'bench'", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      starterCount: 3,
      benchCount: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      for (const slot of res.data.slots) {
        expect(["starter", "bench"]).toContain(slot.slot_role);
      }
    }
  });

  it("invariante de banca: los slots de banca NUNCA tienen pitch_index (siempre null)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "futbol",
      format: "5v5",
      pitchSlots: [{ pitchIndex: 0, position: "gk" }],
      benchCount: 3,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      const benchSlots = res.data.slots.filter((s) => s.slot_role === "bench");
      expect(benchSlots).toHaveLength(3);
      expect(benchSlots.every((s) => s.pitch_index === null)).toBe(true);
    }
  });

  it("invariante de rivales: los slots de Side B NUNCA tienen pitch_index (siempre null)", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "voleibol",
      format: "6v6",
      benchCount: 2,
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data.slots.every((s) => s.pitch_index === null)).toBe(true);
    }
  });

  it("invariante deportiva: rechaza posiciones incompatibles con el deporte (ej. 'gk' en básquet)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "basquet",
      format: "3v3",
      pitchSlots: [{ pitchIndex: 0, position: "gk" }],
    });
    expect(res.ok).toBe(false);
  });

  it("invariante deportiva: rechaza formatos incompatibles con el deporte (ej. '11v11' en pádel)", () => {
    const res = buildMatchSlotsPayload({
      intent: "starter_slots",
      sport: "padel",
      format: "11v11",
      starterCount: 2,
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza intento inválido", () => {
    const res = buildMatchSlotsPayload({
      intent: "invalid_intent" as any,
      sport: "futbol",
      format: "5v5",
    });
    expect(res.ok).toBe(false);
  });

  it("rechaza en Intent 2 si se pasan pitchSlots o starterCount", () => {
    const res1 = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      pitchSlots: [{ pitchIndex: 0 }],
    });
    expect(res1.ok).toBe(false);

    const res2 = buildMatchSlotsPayload({
      intent: "bench_only",
      sport: "futbol",
      format: "5v5",
      benchCount: 2,
      starterCount: 1,
    });
    expect(res2.ok).toBe(false);
  });

  it("rechaza si total Side B supera 15 cupos en challenge (ej. 11v11 con 5 suplentes)", () => {
    const res = buildMatchSlotsPayload({
      intent: "challenge",
      sport: "futbol",
      format: "11v11",
      benchCount: 5, // 11 + 5 = 16 -> triggers >= 16 exception
    });
    expect(res.ok).toBe(false);
  });
});
