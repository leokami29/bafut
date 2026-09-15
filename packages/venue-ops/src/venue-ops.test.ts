import { describe, expect, it } from "vitest";
import {
  buildAdminDayBlocks,
  computeBookingDeposit,
  isOpsPath,
  isPathAllowedForSurface,
  occupyRangesOverlap,
  parseBafutSurface,
  toAdminOccupancyKind,
  mapDayOccupancyRpcRow,
} from "./index";

describe("@bafut/venue-ops overlap", () => {
  it("detecta solape half-open", () => {
    const a = { startsAtMs: 0, durationMin: 60 };
    expect(occupyRangesOverlap(a, { startsAtMs: 30 * 60_000, durationMin: 60 })).toBe(true);
    expect(occupyRangesOverlap(a, { startsAtMs: 60 * 60_000, durationMin: 60 })).toBe(false);
  });

  it("computeBookingDeposit redondea como el RPC", () => {
    expect(computeBookingDeposit(56000, 20)).toEqual({
      depositCop: 56000,
      remainderCop: 0,
    });
    expect(computeBookingDeposit(56000, 30)).toEqual({
      depositCop: 16800,
      remainderCop: 39200,
    });
  });
});

describe("@bafut/venue-ops admin kinds", () => {
  it("mapea source block y hold", () => {
    expect(
      toAdminOccupancyKind({
        blockKind: "booking",
        bookingStatus: "confirmed",
        bookingSource: "block",
      }),
    ).toBe("block");
    expect(
      toAdminOccupancyKind({
        blockKind: "booking",
        bookingStatus: "hold",
        bookingSource: "player",
      }),
    ).toBe("booking_hold");
  });

  it("buildAdminDayBlocks enriquece bookings", () => {
    const raw = mapDayOccupancyRpcRow({
      kind: "booking",
      match_id: "b1",
      share_code: null,
      starts_at: "2026-09-15T15:00:00.000Z",
      duration_min: 60,
      sport: "padel",
      format: null,
      open_slot_count: 0,
      has_side_b: true,
    });
    const blocks = buildAdminDayBlocks(
      [raw],
      new Map([
        [
          "b1",
          {
            id: "b1",
            status: "pending",
            source: "player",
            hold_expires_at: "2026-09-15T19:00:00.000Z",
          },
        ],
      ]),
      { turnosBasePath: "/canchas/x/admin/turnos" },
    );
    expect(blocks[0]?.kind).toBe("booking_pending");
    expect(blocks[0]?.href).toContain("booking-b1");
  });
});

describe("@bafut/venue-ops surfaces", () => {
  it("parsea surface y clasifica rutas", () => {
    expect(parseBafutSurface("ops")).toBe("ops");
    expect(parseBafutSurface("public")).toBe("web");
    expect(isOpsPath("/admin/flags")).toBe(true);
    expect(isOpsPath("/canchas/padel-park/admin/turnos")).toBe(true);
    expect(isOpsPath("/canchas/padel-park/turno")).toBe(false);
    expect(isPathAllowedForSurface("/admin", "web")).toBe(false);
    expect(isPathAllowedForSurface("/partidos", "web")).toBe(true);
    expect(isPathAllowedForSurface("/admin", "ops")).toBe(true);
  });
});
