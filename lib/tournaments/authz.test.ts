import { describe, expect, it } from "vitest";
import {
  canAccessVenueTournamentsAdmin,
  canManageVenueTournaments,
  canScoreTournament,
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
