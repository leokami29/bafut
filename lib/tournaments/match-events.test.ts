import { BracketsManager } from "brackets-manager";
import { describe, expect, it } from "vitest";
import { MemoryTournamentBracketsStorage } from "@/lib/tournaments/brackets-storage";
import {
  aggregatePlayerMetricsFromEvents,
  eventsToDomain,
  previewMatchScoreFromEvents,
} from "@/lib/tournaments/match-events";
import { assertEventAllowed, type MatchEvent } from "@/lib/tournaments/sports";

function ev(
  partial: Omit<MatchEvent, "team_side"> & { team_side?: "a" | "b" },
): MatchEvent {
  return { team_side: "a", ...partial };
}

describe("match-events — derive → BM update.match", () => {
  it("deriva goles y confirma marcador en brackets-manager (memory)", async () => {
    const tournamentId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const storage = new MemoryTournamentBracketsStorage(tournamentId);
    const manager = new BracketsManager(storage);

    await manager.create.stage({
      tournamentId,
      name: "Copa Test",
      type: "single_elimination",
      seeding: ["Alpha", "Bravo", "Charlie", "Delta"],
      settings: { seedOrdering: ["natural"] },
    });

    const matches = (await storage.select("match")) as Array<{
      id: number;
      opponent1: { id?: number; score?: number; result?: string } | null;
      opponent2: { id?: number; score?: number; result?: string } | null;
      status: number;
    }>;

    const playable = matches.find(
      (m) => m.opponent1?.id != null && m.opponent2?.id != null,
    );
    expect(playable).toBeTruthy();

    const events: MatchEvent[] = [
      ev({ type: "goal", team_side: "a", player_id: "p1" }),
      ev({ type: "goal", team_side: "a", player_id: "p1" }),
      ev({ type: "goal", team_side: "b", player_id: "p2" }),
      ev({ type: "own_goal", team_side: "b" }), // acredita a A → 3-1
      ev({ type: "assist", team_side: "a", player_id: "p3" }),
      ev({
        type: "goal",
        team_side: "b",
        player_id: "p2",
        voided_at: "2026-01-01T00:00:00Z",
      }),
    ];

    for (const e of events) {
      if (e.voided_at) continue;
      const check = assertEventAllowed("futbol", e.type, e.payload ?? {});
      expect(check.ok).toBe(true);
    }

    const score = previewMatchScoreFromEvents("futbol", events);
    expect(score).toEqual({ a: 3, b: 1, complete: true });

    await manager.update.match({
      id: playable!.id,
      opponent1: { score: score.a, result: "win" },
      opponent2: { score: score.b, result: "loss" },
    });

    const updated = (await storage.select("match", playable!.id)) as {
      opponent1: { score: number; result?: string };
      opponent2: { score: number; result?: string };
      status: number;
    };

    expect(updated.opponent1.score).toBe(3);
    expect(updated.opponent2.score).toBe(1);
    expect(updated.opponent1.result).toBe("win");
    expect(updated.opponent2.result).toBe("loss");
    expect(updated.status).toBeGreaterThanOrEqual(4);

    const metrics = aggregatePlayerMetricsFromEvents("futbol", events);
    expect(metrics.p1.goals).toBe(2);
    expect(metrics.p2.goals).toBe(1);
    expect(metrics.p3.assists).toBe(1);
  });

  it("rechaza confirm incompleto en pádel (best of 3)", () => {
    const events: MatchEvent[] = [ev({ type: "set_won", team_side: "a" })];
    const score = previewMatchScoreFromEvents("padel", events);
    expect(score.complete).toBe(false);
  });

  it("eventsToDomain mapea filas DB", () => {
    const domain = eventsToDomain([
      {
        type: "goal",
        team_side: "b",
        player_id: null,
        period: 1,
        clock: 12,
        payload: {},
        voided_at: null,
        sport: "futbol",
      },
    ]);
    expect(domain[0]).toMatchObject({
      type: "goal",
      team_side: "b",
      period: 1,
      clock: 12,
      sport: "futbol",
    });
  });

  it("basquet agrega PTS reales por tipo de tiro", () => {
    const events: MatchEvent[] = [
      ev({ type: "fg2_made", player_id: "j1" }),
      ev({ type: "fg3_made", player_id: "j1" }),
      ev({ type: "reb", player_id: "j1" }),
    ];
    const metrics = aggregatePlayerMetricsFromEvents("basquet", events);
    expect(metrics.j1.pts).toBe(5);
    expect(metrics.j1.reb).toBe(1);
  });
});
