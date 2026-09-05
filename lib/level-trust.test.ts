import { describe, expect, it } from "vitest";
import {
  DECLARED_LEVELS,
  defaultDeclaredLevel,
  formatLevelOkBadge,
  isDeclaredLevel,
  isFeedbackWindow,
  isMismatch,
  LEVEL_SIGNAL_MIN,
  matchEndsAt,
} from "@/lib/level-trust";

describe("defaultDeclaredLevel", () => {
  it("respeta el nivel del perfil cuando es válido", () => {
    expect(defaultDeclaredLevel("low")).toBe("low");
    expect(defaultDeclaredLevel("mid")).toBe("mid");
    expect(defaultDeclaredLevel("high")).toBe("high");
  });

  it("hace fallback a mid con any, vacío o desconocido", () => {
    expect(defaultDeclaredLevel("any")).toBe("mid");
    expect(defaultDeclaredLevel(null)).toBe("mid");
    expect(defaultDeclaredLevel(undefined)).toBe("mid");
    expect(defaultDeclaredLevel("extremo")).toBe("mid");
  });
});

describe("isDeclaredLevel", () => {
  it("solo acepta low, mid y high (no any)", () => {
    for (const level of DECLARED_LEVELS) {
      expect(isDeclaredLevel(level)).toBe(true);
    }
    expect(isDeclaredLevel("any")).toBe(false);
    expect(isDeclaredLevel("")).toBe(false);
    expect(isDeclaredLevel(null)).toBe(false);
  });
});

describe("isMismatch", () => {
  it("mismatch cuando el slot pide nivel y el declarado difiere", () => {
    expect(isMismatch("high", "low")).toBe(true);
    expect(isMismatch("low", "high")).toBe(true);
    expect(isMismatch("mid", "high")).toBe(true);
  });

  it("sin mismatch con mismo nivel", () => {
    expect(isMismatch("high", "high")).toBe(false);
  });

  it("slot any o vacío nunca genera mismatch", () => {
    expect(isMismatch("any", "low")).toBe(false);
    expect(isMismatch(null, "low")).toBe(false);
    expect(isMismatch(undefined, "low")).toBe(false);
  });

  it("sin declarado nunca genera mismatch", () => {
    expect(isMismatch("high", null)).toBe(false);
    expect(isMismatch("high", undefined)).toBe(false);
  });
});

describe("matchEndsAt", () => {
  it("suma la duración en minutos", () => {
    expect(matchEndsAt("2026-09-05T15:00:00.000Z", 60).toISOString()).toBe(
      "2026-09-05T16:00:00.000Z",
    );
    expect(matchEndsAt(new Date("2026-09-05T15:00:00.000Z"), 30).toISOString()).toBe(
      "2026-09-05T15:30:00.000Z",
    );
  });
});

describe("isFeedbackWindow", () => {
  const startsAt = "2026-09-05T15:00:00.000Z";
  const ends = new Date("2026-09-05T16:00:00.000Z");
  const closes = new Date(ends.getTime() + 7 * 24 * 60 * 60 * 1000);

  it("abierto desde el fin del partido hasta +7 días inclusive", () => {
    expect(isFeedbackWindow(ends, startsAt, 60)).toBe(true);
    expect(isFeedbackWindow(closes, startsAt, 60)).toBe(true);
  });

  it("cerrado antes del fin y después de la ventana", () => {
    expect(isFeedbackWindow(new Date(ends.getTime() - 60_000), startsAt, 60)).toBe(false);
    expect(isFeedbackWindow(new Date(closes.getTime() + 1), startsAt, 60)).toBe(false);
  });
});

describe("formatLevelOkBadge", () => {
  it("null por debajo del umbral de señal", () => {
    expect(formatLevelOkBadge(2, LEVEL_SIGNAL_MIN - 1)).toBe(null);
    expect(formatLevelOkBadge(0, 0)).toBe(null);
  });

  it("badge con conteos al alcanzar el umbral", () => {
    expect(formatLevelOkBadge(2, LEVEL_SIGNAL_MIN)).toBe(`Nivel OK · 2/${LEVEL_SIGNAL_MIN}`);
  });

  it("badge aunque haya algún no-ok", () => {
    expect(formatLevelOkBadge(1, 4)).toBe("Nivel OK · 1/4");
  });
});
