import { describe, expect, it } from "vitest";
import { isActivePremiumSubscription, venueHasActivePremium } from "@/lib/venue-premium";

describe("venue-premium", () => {
  it("detecta premium activo no vencido", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      isActivePremiumSubscription({ status: "active", plan: "premium", expires_at: future }),
    ).toBe(true);
  });

  it("rechaza basic, vencida o no active", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(
      isActivePremiumSubscription({ status: "active", plan: "basic", expires_at: future }),
    ).toBe(false);
    expect(
      isActivePremiumSubscription({ status: "expired", plan: "premium", expires_at: future }),
    ).toBe(false);
    expect(
      isActivePremiumSubscription({ status: "active", plan: "premium", expires_at: past }),
    ).toBe(false);
  });

  it("venueHasActivePremium barre la lista", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      venueHasActivePremium([
        { status: "active", plan: "basic", expires_at: future },
        { status: "active", plan: "premium", expires_at: future },
      ]),
    ).toBe(true);
    expect(venueHasActivePremium([])).toBe(false);
    expect(venueHasActivePremium(null)).toBe(false);
  });
});
