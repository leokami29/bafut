import { BracketsManager } from "brackets-manager";
import { describe, expect, it } from "vitest";
import {
  MemoryTournamentBracketsStorage,
  mergeBmRow,
} from "@/lib/tournaments/brackets-storage";
import {
  clampMaxTeams,
  defaultGroupCount,
  formatSupportsStageGeneration,
  formatToStageType,
  interleaveGroupQualifiers,
  nextPowerOfTwo,
  orderTeamsForSeeding,
  padSeedingIdsWithByes,
  parseCreateTournamentInput,
  validateTeamName,
  validateTournamentName,
} from "@/lib/tournaments/service";

describe("mergeBmRow", () => {
  it("hace merge profundo de opponent objects", () => {
    const existing = {
      id: 1,
      opponent1: { id: 10, score: 1 },
      status: 2,
    };
    const merged = mergeBmRow(existing, {
      opponent1: { score: 3, result: "win" } as Record<string, unknown>,
      status: 4,
    } as Partial<typeof existing>);
    expect(merged).toEqual({
      id: 1,
      opponent1: { id: 10, score: 3, result: "win" },
      status: 4,
    });
  });
});

describe("format / validación dominio", () => {
  it("mapea formatos a StageType BM", () => {
    expect(formatToStageType("single_elim")).toBe("single_elimination");
    expect(formatToStageType("double_elim")).toBe("double_elimination");
    expect(formatToStageType("round_robin")).toBe("round_robin");
    expect(formatToStageType("groups_knockout")).toBe("round_robin");
    expect(formatSupportsStageGeneration("groups_knockout")).toBe(true);
  });

  it("elige groupCount por defecto", () => {
    expect(defaultGroupCount("round_robin", 8)).toBe(1);
    expect(defaultGroupCount("groups_knockout", 8)).toBe(2);
    expect(defaultGroupCount("groups_knockout", 16)).toBe(4);
  });

  it("intercala clasificados 1ºs luego 2ºs", () => {
    const ids = interleaveGroupQualifiers([
      [{ id: 1 }, { id: 2 }],
      [{ id: 3 }, { id: 4 }],
    ]);
    expect(ids).toEqual([1, 3, 2, 4]);
  });

  it("padea seeding con BYEs a potencia de 2", () => {
    expect(nextPowerOfTwo(5)).toBe(8);
    expect(padSeedingIdsWithByes([1, 2, 3], 4)).toEqual([1, 2, 3, null]);
  });

  it("valida nombres y max teams", () => {
    expect(validateTournamentName("A")).toBeTruthy();
    expect(validateTournamentName("Copa Norte")).toBeNull();
    expect(validateTeamName("")).toBeTruthy();
    expect(validateTeamName("Los Pibes")).toBeNull();
    expect(clampMaxTeams(8)).toBe(8);
    expect(clampMaxTeams(99)).toBe(32);
    expect(clampMaxTeams(1)).toBe(2);
  });

  it("parseCreateTournamentInput ok / error", () => {
    const ok = parseCreateTournamentInput({
      venueId: "v1",
      name: "Apertura",
      sport: "futbol",
      format: "round_robin",
      maxTeams: 8,
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data.maxTeams).toBe(8);
      expect(ok.data.format).toBe("round_robin");
      expect(ok.data.status).toBe("registration");
    }

    const bad = parseCreateTournamentInput({
      venueId: "v1",
      name: "X",
      sport: "futbol",
      format: "single_elim",
    });
    expect(bad.ok).toBe(false);
  });

  it("ordena seeding por seed luego created_at", () => {
    const ordered = orderTeamsForSeeding([
      { name: "C", seed: null, created_at: "2026-01-03T00:00:00Z" },
      { name: "A", seed: 2, created_at: "2026-01-01T00:00:00Z" },
      { name: "B", seed: 1, created_at: "2026-01-02T00:00:00Z" },
      { name: "D", seed: null, created_at: "2026-01-01T00:00:00Z" },
    ]);
    expect(ordered.map((t) => t.name)).toEqual(["B", "A", "D", "C"]);
  });
});

describe("MemoryTournamentBracketsStorage + BracketsManager", () => {
  it("genera single elimination con 4 equipos aislado por tournamentId", async () => {
    const tournamentId = "11111111-1111-4111-8111-111111111111";
    const storage = new MemoryTournamentBracketsStorage(tournamentId);
    const manager = new BracketsManager(storage);

    const stage = await manager.create.stage({
      tournamentId,
      name: "Test SE",
      type: "single_elimination",
      seeding: ["Alpha", "Bravo", "Charlie", "Delta"],
      settings: { seedOrdering: ["natural"], balanceByes: true },
    });

    expect(stage.id).toBeTypeOf("number");

    const participants = await storage.select("participant");
    expect(participants).toHaveLength(4);

    const matches = await storage.select("match");
    expect(matches).not.toBeNull();
    expect((matches as unknown[]).length).toBeGreaterThanOrEqual(3);

    // Aislamiento: otro torneo no ve datos
    const other = new MemoryTournamentBracketsStorage(
      "22222222-2222-4222-8222-222222222222",
    );
    expect(await other.select("participant")).toEqual([]);
  });

  it("merge de update por filtro en match opponent", async () => {
    const tournamentId = "33333333-3333-4333-8333-333333333333";
    const storage = new MemoryTournamentBracketsStorage(tournamentId);
    const manager = new BracketsManager(storage);

    await manager.create.stage({
      tournamentId,
      name: "SE2",
      type: "single_elimination",
      seeding: ["A", "B", "C", "D"],
      settings: { seedOrdering: ["natural"] },
    });

    const matches = (await storage.select("match")) as Array<{
      id: number;
      opponent1: { id?: number; score?: number } | null;
      opponent2: { id?: number; score?: number } | null;
      status: number;
    }>;
    const m0 = matches.find((m) => m.opponent1?.id != null && m.opponent2?.id != null);
    expect(m0).toBeTruthy();

    await storage.update(
      "match",
      m0!.id,
      {
        ...m0!,
        opponent1: { ...m0!.opponent1, score: 5, result: "win" },
        opponent2: { ...m0!.opponent2, score: 2 },
        status: 4,
      } as never,
    );

    const updated = (await storage.select("match", m0!.id)) as {
      opponent1: { score: number; result: string };
      opponent2: { score: number };
      status: number;
    };
    expect(updated.opponent1.score).toBe(5);
    expect(updated.opponent1.result).toBe("win");
    expect(updated.opponent2.score).toBe(2);
    expect(updated.status).toBe(4);
  });
});
