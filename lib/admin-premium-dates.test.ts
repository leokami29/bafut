import { describe, expect, it } from "vitest";
import { defaultExtendDateInput, parseDateInputInZone } from "@/lib/datetime";
import { friendlyPremiumAdminError } from "@/lib/premium-admin-copy";

describe("defaultExtendDateInput", () => {
  it("usa día civil Bogotá + N días (evita default = mismo día del vencimiento)", () => {
    // Vence 11 dic 2026 23:59:59 Bogotá
    const expires = "2026-12-12T04:59:59.000Z";
    expect(defaultExtendDateInput(expires, 30)).toBe("2027-01-10");
    expect(defaultExtendDateInput(expires, 1)).toBe("2026-12-12");
  });

  it("el default parseado como fin de día es posterior al expires_at actual", () => {
    const expires = "2026-12-12T04:59:59.000Z";
    const ymd = defaultExtendDateInput(expires, 30);
    const parsed = parseDateInputInZone(ymd, "end")!;
    expect(parsed.getTime()).toBeGreaterThan(new Date(expires).getTime());
  });

  it("durationDays 0 fuerza al menos +1 día", () => {
    const expires = "2026-11-13T04:59:59.000Z"; // 12 nov EOD Bogotá
    expect(defaultExtendDateInput(expires, 0)).toBe("2026-11-13");
  });
});

describe("friendlyPremiumAdminError", () => {
  it("traduce el error de extensión a copy clara", () => {
    expect(
      friendlyPremiumAdminError("new_expires_at debe ser posterior al expires_at actual"),
    ).toMatch(/posterior al vencimiento actual/i);
  });
});
