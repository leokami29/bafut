import { describe, expect, it } from "vitest";
import {
  buildLeaderboards,
  buildScoreEvolution,
} from "@/lib/tournaments/stats-load";

describe("buildLeaderboards", () => {
  it("ordena goleadores de fútbol y omite ceros", () => {
    const boards = buildLeaderboards("futbol", [
      {
        teamMemberId: "m1",
        displayName: "Ana",
        teamName: "Norte",
        jerseyNumber: 9,
        metrics: { goals: 3, assists: 1 },
      },
      {
        teamMemberId: "m2",
        displayName: "Bruno",
        teamName: "Sur",
        jerseyNumber: null,
        metrics: { goals: 5, assists: 0 },
      },
      {
        teamMemberId: "m3",
        displayName: "Cami",
        teamName: "Norte",
        jerseyNumber: 7,
        metrics: { goals: 0, cards: 2 },
      },
    ]);

    const goals = boards.find((b) => b.key === "goals");
    expect(goals?.entries.map((e) => e.displayName)).toEqual(["Bruno", "Ana"]);
    expect(goals?.entries[0]?.value).toBe(5);

    const cards = boards.find((b) => b.key === "cards");
    expect(cards?.entries).toHaveLength(1);
    expect(cards?.entries[0]?.displayName).toBe("Cami");
  });

  it("usa métricas de básquet (pts)", () => {
    const boards = buildLeaderboards("basquet", [
      {
        teamMemberId: "m1",
        displayName: "Dia",
        teamName: "A",
        jerseyNumber: 10,
        metrics: { pts: 18, reb: 4, ast: 2 },
      },
    ]);
    const pts = boards.find((b) => b.key === "pts");
    expect(pts?.label).toBe("Puntos");
    expect(pts?.entries[0]?.value).toBe(18);
  });
});

describe("buildScoreEvolution", () => {
  it("acumula for_score por equipo en orden temporal", () => {
    const points = buildScoreEvolution(
      [
        {
          confirmedAt: "2026-09-01T12:00:00Z",
          matchNumber: 1,
          scoreA: 2,
          scoreB: 1,
          teamAId: "a",
          teamBId: "b",
        },
        {
          confirmedAt: "2026-09-01T14:00:00Z",
          matchNumber: 2,
          scoreA: 0,
          scoreB: 3,
          teamAId: "a",
          teamBId: "c",
        },
      ],
      { a: "Alpha", b: "Beta", c: "Gamma" },
    );

    expect(points).toHaveLength(2);
    expect(points[0]?.byTeam).toEqual({ a: 2, b: 1, c: 0 });
    expect(points[1]?.byTeam).toEqual({ a: 2, b: 1, c: 3 });
  });
});
