import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  cardTier,
  computePlayerOverall,
  emptyPlayerCardStats,
  formatTrustStat,
  isAllowedBirthDate,
  statsFromActivity,
  trustPercent,
  type PlayerCardStats,
} from "@/lib/player-card";

function stats(overrides: Partial<PlayerCardStats> = {}): PlayerCardStats {
  return { ...emptyPlayerCardStats(), ...overrides };
}

describe("computePlayerOverall", () => {
  it("queda en 0 sin partidos jugados ni organizados", () => {
    expect(
      computePlayerOverall({
        played: 0,
        hosted: 0,
        confirmed: 0,
        decidedClaims: 0,
        levelOk: 0,
        levelFeedback: 0,
      }),
    ).toBe(0);
  });

  it("sube al jugar y no pasa de 99", () => {
    const first = computePlayerOverall({
      played: 1,
      hosted: 0,
      confirmed: 1,
      decidedClaims: 1,
      levelOk: 0,
      levelFeedback: 0,
    });
    expect(first).toBeGreaterThan(40);
    expect(
      computePlayerOverall({
        played: 40,
        hosted: 20,
        confirmed: 40,
        decidedClaims: 40,
        levelOk: 20,
        levelFeedback: 20,
      }),
    ).toBe(99);
  });
});

describe("statsFromActivity", () => {
  it("incluye overall derivado", () => {
    expect(emptyPlayerCardStats().overall).toBe(0);
    expect(
      statsFromActivity({
        played: 2,
        hosted: 1,
        confirmed: 2,
        decidedClaims: 2,
        levelOk: 3,
        levelFeedback: 3,
      }).overall,
    ).toBeGreaterThan(0);
  });
});

describe("trustPercent", () => {
  it("devuelve null con menos de 3 feedbacks", () => {
    expect(trustPercent({ levelOk: 2, levelFeedback: 2 })).toBeNull();
    expect(formatTrustStat({ levelOk: 2, levelFeedback: 2 })).toBe("—");
  });

  it("calcula porcentaje redondeado sobre 99", () => {
    expect(trustPercent({ levelOk: 2, levelFeedback: 4 })).toBe(50);
    expect(formatTrustStat({ levelOk: 2, levelFeedback: 4 })).toBe("50");
    expect(trustPercent({ levelOk: 4, levelFeedback: 4 })).toBe(99);
  });
});

describe("cardTier", () => {
  it("asigna rookie sin actividad o con pocos partidos", () => {
    expect(cardTier(stats())).toBe("rookie");
    expect(cardTier(stats({ overall: 0, played: 0 }))).toBe("rookie");
    expect(cardTier(stats({ overall: 45, played: 2 }))).toBe("rookie");
  });

  it("asigna club con actividad suficiente y overall moderado", () => {
    expect(cardTier(stats({ overall: 50, played: 5 }))).toBe("club");
  });

  it("asigna oro por overall alto o confianza de nivel", () => {
    expect(cardTier(stats({ overall: 65, played: 10 }))).toBe("oro");
    expect(cardTier(stats({ overall: 55, played: 8, levelOk: 3, levelFeedback: 4 }))).toBe("oro");
  });

  it("no asigna oro por confianza sin feedback suficiente", () => {
    expect(cardTier(stats({ overall: 50, played: 5, levelOk: 2, levelFeedback: 2 }))).toBe("club");
  });

  it("asigna elite por overall ≥ 80", () => {
    expect(cardTier(stats({ overall: 80, played: 20 }))).toBe("elite");
    expect(cardTier(stats({ overall: 92, played: 30 }))).toBe("elite");
  });

  it("prioriza elite sobre oro", () => {
    expect(
      cardTier(stats({ overall: 85, played: 25, levelOk: 4, levelFeedback: 4 })),
    ).toBe("elite");
  });
});

describe("ageFromBirthDate", () => {
  it("calcula edad y rechaza menores de 18", () => {
    const now = new Date("2026-09-15T12:00:00");
    expect(ageFromBirthDate("2000-01-01", now)).toBe(26);
    expect(isAllowedBirthDate("2016-09-16", now)).toBe(false);
    expect(isAllowedBirthDate("2008-09-15", now)).toBe(true);
    expect(isAllowedBirthDate("2008-09-16", now)).toBe(false);
  });
});
