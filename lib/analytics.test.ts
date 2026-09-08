import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("analytics funnel helpers", () => {
  const gtag = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    gtag.mockReset();
    vi.stubEnv("NEXT_PUBLIC_GA4_MEASUREMENT_ID", "G-TEST");
    vi.stubGlobal("window", { gtag });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("emite venue_claim_submit y sub_activated con params", async () => {
    const {
      trackVenueClaimSubmit,
      trackSubActivated,
      FUNNEL_EVENTS,
    } = await import("@/lib/analytics");

    trackVenueClaimSubmit({ venue_id: "v1", venue_slug: "cancha-x" });
    trackSubActivated({ venue_id: "v1", plan: "premium", payment_method: "manual" });

    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.venue_claim_submit, {
      venue_id: "v1",
      venue_slug: "cancha-x",
    });
    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.sub_activated, {
      venue_id: "v1",
      plan: "premium",
      payment_method: "manual",
    });
  });

  it("exporta stubs paywall/proof listos para A2", async () => {
    const { trackPremiumPaywallView, trackNequiProofSubmit, FUNNEL_EVENTS } =
      await import("@/lib/analytics");

    trackPremiumPaywallView({ venue_id: "v1", plan: "premium" });
    trackNequiProofSubmit({ venue_id: "v1", plan: "premium" });

    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.premium_paywall_view, {
      venue_id: "v1",
      plan: "premium",
    });
    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.nequi_proof_submit, {
      venue_id: "v1",
      plan: "premium",
    });
  });

  it("emite funnel Pedir turno", async () => {
    const {
      trackTurnoStart,
      trackTurnoProofSubmit,
      trackTurnoApproved,
      FUNNEL_EVENTS,
    } = await import("@/lib/analytics");

    trackTurnoStart({ venue_id: "v1", venue_slug: "cancha-x" });
    trackTurnoProofSubmit({ venue_id: "v1", sport: "padel", duration_min: 90 });
    trackTurnoApproved({ venue_id: "v1", booking_id: "b1" });

    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.turno_start, {
      venue_id: "v1",
      venue_slug: "cancha-x",
    });
    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.turno_proof_submit, {
      venue_id: "v1",
      sport: "padel",
      duration_min: 90,
    });
    expect(gtag).toHaveBeenCalledWith("event", FUNNEL_EVENTS.turno_approved, {
      venue_id: "v1",
      booking_id: "b1",
    });
  });
});
