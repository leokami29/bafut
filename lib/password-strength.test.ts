import { describe, expect, it } from "vitest";
import {
  passwordMeetsMinimum,
  passwordScoreLabel,
  scorePassword,
} from "@/lib/password-strength";

describe("scorePassword", () => {
  it("vacía puntúa 0", () => {
    expect(scorePassword("")).toBe(0);
  });

  it("corta puntúa 1", () => {
    expect(scorePassword("abc")).toBe(1);
  });

  it("8 caracteres simples puntúa 2", () => {
    expect(scorePassword("abcdefgh")).toBe(2);
  });

  it("8+ con letra y número puntúa 3", () => {
    expect(scorePassword("abcdefg1")).toBe(3);
  });

  it("10+ con letra, número y mayúscula/símbolo puntúa 4", () => {
    expect(scorePassword("abcdefgh1A")).toBe(4);
    expect(scorePassword("abcdefgh1!")).toBe(4);
  });

  it("respeta acentos como letras", () => {
    expect(scorePassword("ábcdefgh1")).toBe(3);
    expect(scorePassword("Ábcdefghi1")).toBe(4);
  });
});

describe("passwordScoreLabel", () => {
  it("etiquetas en orden", () => {
    expect(passwordScoreLabel(0)).toBe("");
    expect(passwordScoreLabel(1)).toBe("Muy débil");
    expect(passwordScoreLabel(2)).toBe("Débil");
    expect(passwordScoreLabel(3)).toBe("Aceptable");
    expect(passwordScoreLabel(4)).toBe("Fuerte");
  });
});

describe("passwordMeetsMinimum", () => {
  it("exige 8+ caracteres con score 2+", () => {
    expect(passwordMeetsMinimum("abcdefgh")).toBe(true);
    expect(passwordMeetsMinimum("abcdefg1")).toBe(true);
    expect(passwordMeetsMinimum("abc")).toBe(false);
  });
});
