import { describe, expect, it } from "vitest";
import {
  buildPushPayload,
  matchMatchesAlert,
  type MatchForAlert,
} from "@/lib/match-alerts";

const baseMatch: MatchForAlert = {
  id: "m1",
  city_id: "c1",
  sport: "futbol",
  format: "5v5",
  status: "open",
  share_code: "ABC123",
  starts_at: "2026-09-10T22:00:00.000Z",
  venues: { name: "Cancha Norte", neighborhood: "Riomar" },
  match_slots: [{ level: "mid" }, { level: "any" }],
};

describe("matchMatchesAlert", () => {
  it("matchea ciudad y deporte", () => {
    expect(
      matchMatchesAlert(baseMatch, {
        city_id: "c1",
        sport: "futbol",
        format: null,
        level: null,
        neighborhood: null,
      }),
    ).toBe(true);
  });

  it("rechaza otra ciudad o deporte", () => {
    expect(
      matchMatchesAlert(baseMatch, {
        city_id: "c2",
        sport: null,
        format: null,
        level: null,
        neighborhood: null,
      }),
    ).toBe(false);
    expect(
      matchMatchesAlert(baseMatch, {
        city_id: "c1",
        sport: "padel",
        format: null,
        level: null,
        neighborhood: null,
      }),
    ).toBe(false);
  });

  it("filtra barrio case-insensitive", () => {
    expect(
      matchMatchesAlert(baseMatch, {
        city_id: "c1",
        sport: null,
        format: null,
        level: null,
        neighborhood: "riomar",
      }),
    ).toBe(true);
    expect(
      matchMatchesAlert(baseMatch, {
        city_id: "c1",
        sport: null,
        format: null,
        level: null,
        neighborhood: "Centro",
      }),
    ).toBe(false);
  });

  it("nivel: any en alerta o slot, o slot = alerta", () => {
    expect(
      matchMatchesAlert(baseMatch, {
        city_id: "c1",
        sport: null,
        format: null,
        level: "high",
        neighborhood: null,
      }),
    ).toBe(true); // slot any
    expect(
      matchMatchesAlert(
        { ...baseMatch, match_slots: [{ level: "low" }] },
        {
          city_id: "c1",
          sport: null,
          format: null,
          level: "mid",
          neighborhood: null,
        },
      ),
    ).toBe(false);
  });
});

describe("buildPushPayload", () => {
  it("arma payload mínimo con url de ficha", () => {
    const payload = buildPushPayload(baseMatch);
    expect(payload.title).toContain("BaFut");
    expect(payload.url).toBe("/p/ABC123");
    expect(payload.body).toContain("5v5");
  });
});
