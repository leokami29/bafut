import { describe, expect, it } from "vitest";
import {
  featureFlagDescriptionLabel,
  planActiveLabel,
  planConsoleTitle,
  planLabel,
} from "@/lib/plan-labels";

describe("plan-labels", () => {
  it("mapea premium a Exclusivo", () => {
    expect(planLabel("premium")).toBe("Exclusivo");
    expect(planActiveLabel("premium")).toBe("Exclusivo activo");
    expect(planConsoleTitle("premium")).toBe("Consola Exclusivo");
  });

  it("reescribe descripciones de flags", () => {
    expect(featureFlagDescriptionLabel("Mostrar paywall / solicitud Premium a dueños")).toBe(
      "Mostrar paywall / solicitud Exclusivo a dueños",
    );
    expect(featureFlagDescriptionLabel(null)).toBe("Sin descripción.");
  });

  it("deja pasar otros planes", () => {
    expect(planLabel("basic")).toBe("Básico");
    expect(planLabel("custom")).toBe("custom");
  });
});
