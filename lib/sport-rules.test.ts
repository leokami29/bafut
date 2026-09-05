import { describe, expect, it } from "vitest";
import {
  defaultFormatForSport,
  formatAllowedForSport,
  isDuration,
  isFormat,
  isPosition,
  isSport,
  positionAllowedForSport,
  SPORT_RULES,
  venuesForSport,
} from "@/lib/sport-rules";

describe("sport-rules", () => {
  it("reconoce deportes válidos y rechaza desconocidos", () => {
    expect(isSport("futbol")).toBe(true);
    expect(isSport("padel")).toBe(true);
    expect(isSport("tenis")).toBe(false);
    expect(isSport("")).toBe(false);
  });

  it("reconoce formatos del catálogo global", () => {
    expect(isFormat("5v5")).toBe(true);
    expect(isFormat("4v4")).toBe(true);
    expect(isFormat("9v9")).toBe(false);
  });

  it("reconoce posiciones del catálogo global", () => {
    expect(isPosition("gk")).toBe(true);
    expect(isPosition("armador")).toBe(true);
    expect(isPosition("quarterback")).toBe(false);
  });

  it("cada deporte solo acepta sus formatos", () => {
    expect(formatAllowedForSport("futbol", "11v11")).toBe(true);
    expect(formatAllowedForSport("futbol", "2v2")).toBe(false);
    expect(formatAllowedForSport("futbol_sala", "5v5")).toBe(true);
    expect(formatAllowedForSport("futbol_sala", "7v7")).toBe(false);
    expect(formatAllowedForSport("basquet", "3v3")).toBe(true);
    expect(formatAllowedForSport("voleibol", "6v6")).toBe(true);
    expect(formatAllowedForSport("padel", "2v2")).toBe(true);
    expect(formatAllowedForSport("padel", "6v6")).toBe(false);
  });

  it("cada deporte solo acepta sus posiciones", () => {
    expect(positionAllowedForSport("futbol", "gk")).toBe(true);
    expect(positionAllowedForSport("futbol", "base")).toBe(false);
    expect(positionAllowedForSport("basquet", "base")).toBe(true);
    expect(positionAllowedForSport("basquet", "gk")).toBe(false);
    expect(positionAllowedForSport("voleibol", "libero")).toBe(true);
    expect(positionAllowedForSport("padel", "drive")).toBe(true);
    expect(positionAllowedForSport("padel", "mid")).toBe(false);
  });

  it("formato por defecto coherente con las reglas del deporte", () => {
    for (const sport of Object.keys(SPORT_RULES) as Array<keyof typeof SPORT_RULES>) {
      const def = defaultFormatForSport(sport);
      expect(formatAllowedForSport(sport, def)).toBe(true);
      expect(SPORT_RULES[sport].formats).toContain(def);
    }
    expect(defaultFormatForSport("padel")).toBe("2v2");
    expect(defaultFormatForSport("voleibol")).toBe("6v6");
  });

  it("isDuration solo acepta 30, 60 y 90", () => {
    expect(isDuration(30)).toBe(true);
    expect(isDuration(60)).toBe(true);
    expect(isDuration(90)).toBe(true);
    expect(isDuration(45)).toBe(false);
    expect(isDuration(0)).toBe(false);
    expect(isDuration(Number.NaN)).toBe(false);
  });

  it("venuesForSport filtra por lista de deportes de la cancha", () => {
    const venues = [
      { sports: ["futbol"] },
      { sports: ["futbol", "futbol_sala"] },
      { sports: [] },
      { sports: null },
      { sports: ["padel"] },
    ];
    expect(venuesForSport(venues, "futbol")).toHaveLength(2);
    expect(venuesForSport(venues, "padel")).toHaveLength(1);
    expect(venuesForSport(venues, "basquet")).toHaveLength(0);
  });
});
