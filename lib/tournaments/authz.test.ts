import { describe, expect, it } from "vitest";
import {
  canAccessVenueTournamentsAdmin,
  canManageVenueTournaments,
  canScoreTournament,
  resolveVenueTournamentsGate,
  venueTournamentsGateCopy,
  type AuthzVenueContext,
} from "@/lib/tournaments/authz";

const future = new Date(Date.now() + 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();

function baseCtx(over: Partial<AuthzVenueContext> = {}): AuthzVenueContext {
  return {
    venueId: "venue-1",
    ownerId: "owner-1",
    subscriptions: [{ status: "active", plan: "premium", expires_at: future }],
    staffRows: [],
    isPlatformAdmin: false,
    tournamentsFlagEnabled: true,
    ...over,
  };
}

describe("canManageVenueTournaments", () => {
  it("permite owner con premium y flag", () => {
    expect(canManageVenueTournaments(baseCtx(), "owner-1")).toBe(true);
  });

  it("permite manager, no scorer", () => {
    const ctx = baseCtx({
      staffRows: [{ venue_id: "venue-1", user_id: "u-m", role: "manager" }],
    });
    expect(canManageVenueTournaments(ctx, "u-m")).toBe(true);
    const scorerCtx = baseCtx({
      staffRows: [{ venue_id: "venue-1", user_id: "u-s", role: "scorer" }],
    });
    expect(canManageVenueTournaments(scorerCtx, "u-s")).toBe(false);
  });

  it("bloquea sin flag, sin premium o guest", () => {
    expect(canManageVenueTournaments(baseCtx({ tournamentsFlagEnabled: false }), "owner-1")).toBe(
      false,
    );
    expect(
      canManageVenueTournaments(
        baseCtx({
          subscriptions: [{ status: "active", plan: "premium", expires_at: past }],
        }),
        "owner-1",
      ),
    ).toBe(false);
    expect(canManageVenueTournaments(baseCtx(), null)).toBe(false);
    expect(canManageVenueTournaments(baseCtx(), "stranger")).toBe(false);
  });
});

describe("canScoreTournament", () => {
  it("permite owner, manager y scorer", () => {
    expect(canScoreTournament(baseCtx(), "owner-1")).toBe(true);
    expect(
      canScoreTournament(
        baseCtx({
          staffRows: [{ venue_id: "venue-1", user_id: "u-m", role: "manager" }],
        }),
        "u-m",
      ),
    ).toBe(true);
    expect(
      canScoreTournament(
        baseCtx({
          staffRows: [{ venue_id: "venue-1", user_id: "u-s", role: "scorer" }],
        }),
        "u-s",
      ),
    ).toBe(true);
  });

  it("platform admin puede scorear con premium+flag", () => {
    expect(
      canScoreTournament(baseCtx({ isPlatformAdmin: true, ownerId: "other" }), "admin-1"),
    ).toBe(true);
  });
});

describe("canAccessVenueTournamentsAdmin", () => {
  it("permite ver el skeleton aunque falte premium", () => {
    expect(
      canAccessVenueTournamentsAdmin(
        {
          venueId: "venue-1",
          ownerId: "owner-1",
          staffRows: [],
          subscriptions: [],
        },
        "owner-1",
      ),
    ).toBe(true);
  });
});

describe("resolveVenueTournamentsGate", () => {
  it("distingue forbidden, flag_off, no_premium y ok", () => {
    expect(resolveVenueTournamentsGate(baseCtx(), "stranger")).toBe("forbidden");
    expect(
      resolveVenueTournamentsGate(baseCtx({ tournamentsFlagEnabled: false }), "owner-1"),
    ).toBe("flag_off");
    expect(
      resolveVenueTournamentsGate(
        baseCtx({
          subscriptions: [{ status: "active", plan: "premium", expires_at: past }],
        }),
        "owner-1",
      ),
    ).toBe("no_premium");
    expect(resolveVenueTournamentsGate(baseCtx(), "owner-1")).toBe("ok");
  });

  it("prioriza flag_off sobre no_premium cuando el rol alcanza", () => {
    expect(
      resolveVenueTournamentsGate(
        baseCtx({
          tournamentsFlagEnabled: false,
          subscriptions: [],
        }),
        "owner-1",
      ),
    ).toBe("flag_off");
  });
});

describe("venueTournamentsGateCopy", () => {
  it("incluye CTA premium solo en no_premium y CTA flags en flag_off", () => {
    expect(venueTournamentsGateCopy("no_premium").ctaPremium).toBe(true);
    expect(venueTournamentsGateCopy("flag_off").ctaFlags).toBe(true);
    expect(venueTournamentsGateCopy("flag_off").ctaPremium).toBeUndefined();
    expect(venueTournamentsGateCopy("forbidden").ctaPremium).toBeUndefined();
  });
});
