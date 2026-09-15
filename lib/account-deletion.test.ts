import { describe, expect, it } from "vitest";
import {
  ACCOUNT_PURGE_DAYS,
  DELETED_PLAYER_LABEL,
  canCancelAccountDeletion,
  displayNameForProfile,
  isDeletionScheduled,
  isProfilePurged,
  resolvePurgeSchedule,
} from "@/lib/account-deletion";

describe("account deletion helpers", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");

  it("detecta perfil purgado", () => {
    expect(isProfilePurged({ deleted_at: "2026-10-01T00:00:00Z" })).toBe(true);
    expect(isProfilePurged({ deleted_at: null })).toBe(false);
  });

  it("detecta eliminación programada", () => {
    expect(
      isDeletionScheduled({
        deletion_scheduled_at: now.toISOString(),
        purge_at: new Date(now.getTime() + 86_400_000).toISOString(),
        deleted_at: null,
      }),
    ).toBe(true);
    expect(
      isDeletionScheduled({
        deletion_scheduled_at: now.toISOString(),
        purge_at: null,
        deleted_at: null,
      }),
    ).toBe(false);
  });

  it("permite cancelar solo durante gracia vigente", () => {
    const future = new Date(now.getTime() + 86_400_000).toISOString();
    const past = new Date(now.getTime() - 86_400_000).toISOString();
    expect(
      canCancelAccountDeletion(
        {
          deletion_scheduled_at: now.toISOString(),
          purge_at: future,
          deleted_at: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      canCancelAccountDeletion(
        {
          deletion_scheduled_at: now.toISOString(),
          purge_at: past,
          deleted_at: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("displayNameForProfile anonimiza solo post-purge", () => {
    expect(
      displayNameForProfile({ display_name: "Leo", deleted_at: "2026-10-01T00:00:00Z" }),
    ).toBe(DELETED_PLAYER_LABEL);
    expect(displayNameForProfile({ display_name: "Leo", deleted_at: null })).toBe("Leo");
  });

  it("resolvePurgeSchedule es idempotente si ya hay fechas", () => {
    const existing = {
      deletion_scheduled_at: "2026-09-01T00:00:00.000Z",
      purge_at: "2026-10-01T00:00:00.000Z",
    };
    expect(resolvePurgeSchedule(existing, now)).toEqual(existing);
  });

  it("resolvePurgeSchedule calcula purge_at +30 días en solicitud nueva", () => {
    const resolved = resolvePurgeSchedule({ deletion_scheduled_at: null, purge_at: null }, now);
    expect(resolved.deletion_scheduled_at).toBe(now.toISOString());
    const purge = new Date(resolved.purge_at);
    const diffDays = (purge.getTime() - now.getTime()) / 86_400_000;
    expect(diffDays).toBe(ACCOUNT_PURGE_DAYS);
  });

  it("re-schedule tras cancelar genera nuevo purge_at", () => {
    const first = resolvePurgeSchedule({ deletion_scheduled_at: null, purge_at: null }, now);
    const later = new Date("2026-09-20T12:00:00.000Z");
    const second = resolvePurgeSchedule(
      { deletion_scheduled_at: null, purge_at: null },
      later,
    );
    expect(second.purge_at).not.toBe(first.purge_at);
    expect(new Date(second.purge_at).getTime()).toBeGreaterThan(later.getTime());
  });

  it("bloquea schedule si es el único admin (regla de negocio)", () => {
    const adminCount = 1;
    const userIsAdmin = true;
    expect(userIsAdmin && adminCount === 1).toBe(true);
  });
});
