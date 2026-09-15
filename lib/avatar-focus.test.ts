import { describe, expect, it } from "vitest";
import {
  clampAvatarFocus,
  DEFAULT_AVATAR_FOCUS,
  panAvatarFocus,
} from "@/lib/avatar-focus";

describe("clampAvatarFocus", () => {
  it("usa el recorte centro-arriba por defecto", () => {
    expect(clampAvatarFocus()).toEqual(DEFAULT_AVATAR_FOCUS);
  });

  it("recorta valores fuera de rango", () => {
    expect(clampAvatarFocus({ x: -10, y: 140, zoom: 9 })).toEqual({ x: 0, y: 100, zoom: 2.5 });
  });
});

describe("panAvatarFocus", () => {
  it("al arrastrar a la derecha baja X (sigue el dedo)", () => {
    const next = panAvatarFocus({ x: 50, y: 50, zoom: 1 }, 40, 0, { width: 200, height: 200 });
    expect(next.x).toBe(30);
    expect(next.y).toBe(50);
  });
});
