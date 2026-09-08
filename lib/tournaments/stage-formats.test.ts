import { BracketsManager } from "brackets-manager";
import { describe, expect, it } from "vitest";
import { MemoryTournamentBracketsStorage } from "@/lib/tournaments/brackets-storage";
import {
  DEFAULT_RR_RANKING_FORMULA,
  interleaveGroupQualifiers,
  padSeedingIdsWithByes,
} from "@/lib/tournaments/service";

describe("generación de stages por formato (BM in-memory)", () => {
  it("round_robin con 1 grupo (liga)", async () => {
    const tournamentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const storage = new MemoryTournamentBracketsStorage(tournamentId);
    const manager = new BracketsManager(storage);

    const stage = await manager.create.stage({
      tournamentId,
      name: "Liga",
      type: "round_robin",
      seeding: ["A", "B", "C", "D"],
      settings: {
        groupCount: 1,
        roundRobinMode: "simple",
        seedOrdering: ["groups.effort_balanced"],
      },
    });

    expect(stage.type).toBe("round_robin");
    const groups = await storage.select("group");
    expect(groups).toHaveLength(1);
    const matches = (await storage.select("match")) as unknown[];
    // C(4,2) = 6 partidos
    expect(matches).toHaveLength(6);
  });

  it("groups_knockout fase 1: RR con 2 grupos", async () => {
    const tournamentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const storage = new MemoryTournamentBracketsStorage(tournamentId);
    const manager = new BracketsManager(storage);

    await manager.create.stage({
      tournamentId,
      name: "Grupos",
      type: "round_robin",
      seeding: ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"],
      settings: {
        groupCount: 2,
        roundRobinMode: "simple",
        seedOrdering: ["groups.effort_balanced"],
      },
    });

    const groups = await storage.select("group");
    expect(groups).toHaveLength(2);
    const matches = (await storage.select("match")) as Array<{ group_id: number }>;
    // 2 grupos × C(4,2)=6 → 12
    expect(matches).toHaveLength(12);
    const byGroup = new Map<number, number>();
    for (const m of matches) {
      byGroup.set(m.group_id, (byGroup.get(m.group_id) ?? 0) + 1);
    }
    expect([...byGroup.values()].every((n) => n === 6)).toBe(true);
  });

  it("groups_knockout fase 2: SE con clasificados tras completar grupos", async () => {
    const tournamentId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const storage = new MemoryTournamentBracketsStorage(tournamentId);
    const manager = new BracketsManager(storage);

    const groupStage = await manager.create.stage({
      tournamentId,
      name: "Grupos",
      type: "round_robin",
      seeding: ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4"],
      settings: {
        groupCount: 2,
        roundRobinMode: "simple",
        seedOrdering: ["groups.effort_balanced"],
      },
    });

    const matches = (await storage.select("match")) as Array<{
      id: number;
      opponent1: { id: number | null } | null;
      opponent2: { id: number | null } | null;
      status: number;
    }>;

    // Completar todos los partidos (gana opponent1)
    for (const m of matches) {
      if (m.opponent1?.id == null || m.opponent2?.id == null) continue;
      await manager.update.match({
        id: m.id,
        opponent1: { score: 2, result: "win" },
        opponent2: { score: 0 },
      });
    }

    const standings = await manager.get.finalStandings(groupStage.id, {
      rankingFormula: DEFAULT_RR_RANKING_FORMULA,
      maxQualifiedParticipantsPerGroup: 2,
    });
    expect(standings.length).toBe(4);

    const groupOrder: number[] = [];
    const byGroup = new Map<number, Array<{ id: number; rank: number }>>();
    for (const row of standings) {
      const gid = Number(row.groupId);
      if (!byGroup.has(gid)) {
        byGroup.set(gid, []);
        groupOrder.push(gid);
      }
      byGroup.get(gid)!.push({ id: Number(row.id), rank: row.rank });
    }
    for (const list of byGroup.values()) {
      list.sort((a, b) => a.rank - b.rank);
    }

    const qualifiedIds = interleaveGroupQualifiers(
      groupOrder.map((gid) => byGroup.get(gid) ?? []),
    );
    expect(qualifiedIds).toHaveLength(4);

    const knockout = await manager.create.stage({
      tournamentId,
      name: "Llave",
      type: "single_elimination",
      seedingIds: padSeedingIdsWithByes(qualifiedIds),
      settings: { seedOrdering: ["natural"], balanceByes: true },
    });

    expect(knockout.type).toBe("single_elimination");
    const stages = await storage.select("stage");
    expect(stages).toHaveLength(2);
    const koMatches = (await storage.select("match", {
      stage_id: knockout.id,
    })) as unknown[];
    expect(koMatches.length).toBeGreaterThanOrEqual(3);
  });
});
