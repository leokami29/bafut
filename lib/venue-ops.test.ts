import { describe, expect, it } from "vitest";
import {
  filterPublicVenues,
  isVenuePubliclyListed,
  shouldExpireSubscription,
} from "@/lib/venue-ops";

describe("expire venue_subscriptions", () => {
  const now = Date.parse("2026-09-06T12:00:00.000Z");

  it("expira active con expires_at en el pasado", () => {
    expect(
      shouldExpireSubscription(
        { status: "active", expires_at: "2026-09-05T23:59:59.000Z" },
        now,
      ),
    ).toBe(true);
  });

  it("no toca active vigente ni ya expired", () => {
    expect(
      shouldExpireSubscription(
        { status: "active", expires_at: "2026-09-07T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
    expect(
      shouldExpireSubscription(
        { status: "expired", expires_at: "2026-09-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });
});

describe("soft-delete venues", () => {
  it("lista solo canchas sin deleted_at", () => {
    expect(isVenuePubliclyListed({ deleted_at: null })).toBe(true);
    expect(isVenuePubliclyListed({ deleted_at: "2026-09-06T00:00:00.000Z" })).toBe(false);
    expect(
      filterPublicVenues([
        { id: "a", deleted_at: null },
        { id: "b", deleted_at: "2026-09-06T00:00:00.000Z" },
      ]).map((v) => v.id),
    ).toEqual(["a"]);
  });
});

/**
 * Stub e-ops: matching de `match_alerts` llega con agente C (push/alertas).
 * Cuando exista `lib/match-alerts.ts` (o equivalente), reemplazar este describe
 * por tests reales de matching (ciudad, deporte, horario, enabled).
 */
describe.skip("match_alerts matching (pendiente agente C)", () => {
  it("documenta el contrato esperado", () => {
    expect(true).toBe(true);
  });
});
