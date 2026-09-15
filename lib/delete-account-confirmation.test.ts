import { describe, expect, it } from "vitest";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  isDeleteAccountConfirmation,
} from "@/lib/delete-account-confirmation";

describe("isDeleteAccountConfirmation", () => {
  it("acepta la palabra exacta", () => {
    expect(isDeleteAccountConfirmation(DELETE_ACCOUNT_CONFIRMATION)).toBe(true);
  });

  it("ignora espacios al inicio y al final", () => {
    expect(isDeleteAccountConfirmation("  ELIMINAR  ")).toBe(true);
  });

  it("rechaza variantes en minúsculas", () => {
    expect(isDeleteAccountConfirmation("eliminar")).toBe(false);
  });

  it("rechaza vacío y texto parcial", () => {
    expect(isDeleteAccountConfirmation("")).toBe(false);
    expect(isDeleteAccountConfirmation("ELIMIN")).toBe(false);
    expect(isDeleteAccountConfirmation("BORRAR")).toBe(false);
  });
});
