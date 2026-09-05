import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safe-next";

describe("safeNextPath", () => {
  it("acepta rutas internas de la allowlist", () => {
    expect(safeNextPath("/entrar/clave")).toBe("/entrar/clave");
    expect(safeNextPath("/p/abc12345")).toBe("/p/abc12345");
    expect(safeNextPath("/partidos")).toBe("/partidos");
    expect(safeNextPath("/partidos/nuevo")).toBe("/partidos/nuevo");
    expect(safeNextPath("/canchas/la-jaula-ensenanza")).toBe("/canchas/la-jaula-ensenanza");
    expect(safeNextPath("/perfil/partidos")).toBe("/perfil/partidos");
  });

  it("acepta query strings en rutas permitidas", () => {
    expect(safeNextPath("/perfil?next=/p/abc12345")).toBe("/perfil?next=/p/abc12345");
  });

  it("decodifica URLs codificadas", () => {
    expect(safeNextPath("%2Fentrar%2Fclave")).toBe("/entrar/clave");
  });

  it("bloquea open redirects externos", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("http://evil.com/entrar")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
  });

  it("bloquea path traversal y escapes de carpeta", () => {
    expect(safeNextPath("/../etc/passwd")).toBe("/");
    expect(safeNextPath("/entrar/clave?next=..%2F..%2Fadmin")).toBe("/");
    expect(safeNextPath("/entrar\\clave")).toBe("/");
  });

  it("bloquea rutas fuera de la allowlist", () => {
    expect(safeNextPath("/admin")).toBe("/");
    expect(safeNextPath("/p/")).toBe("/");
    expect(safeNextPath("/entrar/otra-cosa")).toBe("/");
  });

  it("respete el fallback custom", () => {
    expect(safeNextPath(null, "/partidos")).toBe("/partidos");
    expect(safeNextPath(undefined, "/perfil")).toBe("/perfil");
    expect(safeNextPath("", "/canchas")).toBe("/canchas");
  });

  it("fallback default es /", () => {
    expect(safeNextPath(null)).toBe("/");
  });
});
