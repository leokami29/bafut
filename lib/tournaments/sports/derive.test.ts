import { describe, expect, it } from "vitest";
import {
  assertEventAllowed,
  basquetCatalog,
  deriveMatchScore,
  eventTypesFor,
  futbolCatalog,
  getSportCatalog,
  padelCatalog,
  SPORT_CATALOGS,
  voleibolCatalog,
  type MatchEvent,
} from "@/lib/tournaments/sports";

function ev(partial: Omit<MatchEvent, "team_side"> & { team_side?: "a" | "b" }): MatchEvent {
  return { team_side: "a", ...partial };
}

describe("SPORT_CATALOGS registry", () => {
  it("registra los 4 deportes del plan", () => {
    expect(Object.keys(SPORT_CATALOGS).sort()).toEqual([
      "basquet",
      "futbol",
      "padel",
      "voleibol",
    ]);
    expect(getSportCatalog("futbol").bracketScoreKind).toBe("goals");
    expect(getSportCatalog("basquet").bracketScoreKind).toBe("points");
    expect(getSportCatalog("voleibol").bracketScoreKind).toBe("sets");
    expect(getSportCatalog("padel").bracketScoreKind).toBe("sets");
  });

  it("expone teamSize según plan", () => {
    expect(futbolCatalog.teamSize).toEqual({ min: 5, max: 8 });
    expect(basquetCatalog.teamSize).toEqual({ min: 5, max: 12 });
    expect(voleibolCatalog.teamSize).toEqual({ min: 6, max: 12 });
    expect(padelCatalog.teamSize).toEqual({ min: 2, max: 2 });
  });
});

describe("assertEventAllowed", () => {
  it("acepta tipos scoring y amateur del catálogo", () => {
    expect(assertEventAllowed("futbol", "goal", {})).toEqual({
      ok: true,
      payload: {},
    });
    expect(assertEventAllowed("futbol", "yellow_card")).toMatchObject({ ok: true });
    expect(assertEventAllowed("basquet", "fg3_made")).toMatchObject({ ok: true });
    expect(assertEventAllowed("voleibol", "set_point", { point_won_by: "b" })).toMatchObject({
      ok: true,
    });
  });

  it("rechaza tipos pro / desconocidos y payload inválido", () => {
    expect(assertEventAllowed("futbol", "xg").ok).toBe(false);
    expect(assertEventAllowed("voleibol", "set_point", { point_won_by: "c" }).ok).toBe(
      false,
    );
    expect(
      assertEventAllowed("futbol", "assist", { goal_event_id: "not-a-uuid" }).ok,
    ).toBe(false);
  });

  it("eventTypesFor filtra por capa", () => {
    expect(eventTypesFor("futbol", "scoring")).toEqual(["goal", "own_goal"]);
    expect(eventTypesFor("futbol", "amateur")).toContain("assist");
  });
});

describe("deriveMatchScore — futbol", () => {
  it("suma goles y acredita own_goal al rival", () => {
    const events: MatchEvent[] = [
      ev({ type: "goal", team_side: "a" }),
      ev({ type: "goal", team_side: "a" }),
      ev({ type: "goal", team_side: "b" }),
      ev({ type: "own_goal", team_side: "a" }), // cuenta para B
      ev({ type: "own_goal", team_side: "b" }), // cuenta para A
      ev({ type: "yellow_card", team_side: "a" }),
      ev({ type: "goal", team_side: "a", voided_at: "2026-01-01T00:00:00Z" }),
    ];
    expect(futbolCatalog.deriveMatchScore(events)).toEqual({
      a: 3,
      b: 2,
      complete: true,
    });
    expect(deriveMatchScore("futbol", events)).toEqual({ a: 3, b: 2, complete: true });
  });
});

describe("deriveMatchScore — basquet", () => {
  it("calcula 2/3/FT por lado", () => {
    const events: MatchEvent[] = [
      ev({ type: "fg2_made", team_side: "a" }),
      ev({ type: "fg2_made", team_side: "a" }),
      ev({ type: "fg3_made", team_side: "a" }),
      ev({ type: "ft_made", team_side: "a" }),
      ev({ type: "fg3_made", team_side: "b" }),
      ev({ type: "ft_made", team_side: "b" }),
      ev({ type: "ft_made", team_side: "b" }),
      ev({ type: "fg2_miss", team_side: "a" }),
      ev({ type: "reb", team_side: "b" }),
    ];
    // A: 2+2+3+1 = 8; B: 3+1+1 = 5
    expect(basquetCatalog.deriveMatchScore(events)).toEqual({
      a: 8,
      b: 5,
      complete: true,
    });
  });
});

describe("deriveMatchScore — voleibol", () => {
  it("cuenta sets ganados y complete al best-of-5 (first to 3)", () => {
    const incomplete: MatchEvent[] = [
      ev({ type: "set_won", team_side: "a" }),
      ev({ type: "set_won", team_side: "b" }),
      ev({ type: "set_won", team_side: "a" }),
      ev({ type: "set_point", team_side: "a", payload: { point_won_by: "a" } }),
    ];
    expect(voleibolCatalog.deriveMatchScore(incomplete)).toEqual({
      a: 2,
      b: 1,
      complete: false,
    });

    const complete: MatchEvent[] = [
      ...incomplete,
      ev({ type: "set_won", team_side: "a" }),
    ];
    expect(voleibolCatalog.deriveMatchScore(complete)).toEqual({
      a: 3,
      b: 1,
      complete: true,
    });
  });
});

describe("deriveMatchScore — padel", () => {
  it("cuenta sets (best of 3) desde set_won", () => {
    const events: MatchEvent[] = [
      ev({ type: "point_won", team_side: "a", payload: { point_won_by: "a" } }),
      ev({ type: "game_won", team_side: "a" }),
      ev({ type: "set_won", team_side: "a" }),
      ev({ type: "set_won", team_side: "b" }),
      ev({ type: "set_won", team_side: "a" }),
      ev({ type: "winner", team_side: "a" }),
    ];
    expect(padelCatalog.deriveMatchScore(events)).toEqual({
      a: 2,
      b: 1,
      complete: true,
    });
  });

  it("incomplete sin sets suficientes", () => {
    expect(
      padelCatalog.deriveMatchScore([ev({ type: "set_won", team_side: "a" })]),
    ).toEqual({ a: 1, b: 0, complete: false });
  });
});
