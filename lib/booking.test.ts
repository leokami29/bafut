import { describe, expect, it } from "vitest";
import {
  BOOKING_DURATIONS,
  BOOKING_HOLD_HOURS,
  BOOKING_MIN_LEAD_HOURS,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_CANCEL_CONFIRMED_LEAD_HOURS,
  bookableSportsForVenue,
  bookingDurationsForMin,
  bookingOwnerNotifyHref,
  bookingOwnerNotifyMessage,
  canCancelConfirmedBooking,
  canPlayerCancelBooking,
  isBookingDuration,
  isBookingPaymentMethod,
  isWithinLeadTime,
  isWithinMaxDaysAhead,
  listBookingStartTimesLocal,
  listBookingSlotsWithStatus,
  listFreeBookingSlots,
  normalizeBookingWhatsapp,
  occupyContainsStart,
  occupyEndMs,
  occupyRangesOverlap,
  venueHasUsableBookingPricing,
} from "@/lib/booking";
import { bookingProofObjectPath } from "@/lib/booking-proofs";
import { legalAcceptErrorMessage } from "@/lib/legal";
import { mapDayOccupancyRpcRow, mapLookupOccupancyRpcRow } from "@/lib/occupancy";

const BOGOTA = "America/Bogota";

describe("booking constants", () => {
  it("match plan hold/lead/horizon/cancel", () => {
    expect(BOOKING_HOLD_HOURS).toBe(4);
    expect(BOOKING_MIN_LEAD_HOURS).toBe(2);
    expect(BOOKING_MAX_HORIZON_DAYS).toBe(14);
    expect(BOOKING_CANCEL_CONFIRMED_LEAD_HOURS).toBe(12);
    expect(BOOKING_DURATIONS).toEqual([30, 60, 90]);
  });
});

describe("occupyRangesOverlap", () => {
  const base = { startsAtMs: Date.parse("2026-09-08T15:00:00.000Z"), durationMin: 60 };

  it("detecta solape y permite pegados", () => {
    expect(
      occupyRangesOverlap(base, {
        startsAtMs: Date.parse("2026-09-08T15:30:00.000Z"),
        durationMin: 60,
      }),
    ).toBe(true);
    expect(
      occupyRangesOverlap(base, {
        startsAtMs: Date.parse("2026-09-08T16:00:00.000Z"),
        durationMin: 60,
      }),
    ).toBe(false);
  });

  it("occupyContainsStart solo dentro de [start, end)", () => {
    const start = base.startsAtMs;
    const end = occupyEndMs(base);
    expect(occupyContainsStart(base, start)).toBe(true);
    expect(occupyContainsStart(base, start + 30 * 60_000)).toBe(true);
    expect(occupyContainsStart(base, end)).toBe(false);
    expect(occupyContainsStart(base, start - 30 * 60_000)).toBe(false);
  });
});

describe("isBookingDuration / payment", () => {
  it("solo 30/60/90", () => {
    expect(isBookingDuration(30)).toBe(true);
    expect(isBookingDuration(120)).toBe(false);
  });

  it("payment nequi | bank_transfer", () => {
    expect(isBookingPaymentMethod("nequi")).toBe(true);
    expect(isBookingPaymentMethod("bank_transfer")).toBe(true);
    expect(isBookingPaymentMethod("cash")).toBe(false);
  });
});

describe("lead / horizon / cancel", () => {
  it("lead 2h", () => {
    const now = Date.parse("2026-09-08T12:00:00.000Z");
    expect(isWithinLeadTime(now + 119 * 60_000, now)).toBe(false);
    expect(isWithinLeadTime(now + 120 * 60_000, now)).toBe(true);
  });

  it("horizonte 14d", () => {
    expect(isWithinMaxDaysAhead("2026-09-22", "2026-09-08")).toBe(true);
    expect(isWithinMaxDaysAhead("2026-09-23", "2026-09-08")).toBe(false);
  });

  it("cancel confirmed ≥12h", () => {
    const start = Date.parse("2026-09-08T20:00:00.000Z");
    expect(canCancelConfirmedBooking(start, start - 12 * 3_600_000)).toBe(true);
    expect(canCancelConfirmedBooking(start, start - 11 * 3_600_000)).toBe(false);
  });
});

describe("slot grid", () => {
  it("06–23 con duración 60", () => {
    const times = listBookingStartTimesLocal(60);
    expect(times[0]).toBe("06:00");
    expect(times.at(-1)).toBe("22:00");
    expect(times).not.toContain("22:30");
  });

  it("listFreeBookingSlots resta ocupación y lead", () => {
    const occupied = [
      {
        startsAtMs: Date.parse("2026-09-10T20:00:00.000Z"), // 15:00 Bogotá
        durationMin: 60,
      },
    ];
    // now = 2026-09-10 10:00 Bogotá = 15:00Z
    const nowMs = Date.parse("2026-09-10T15:00:00.000Z");
    const free = listFreeBookingSlots({
      dayKey: "2026-09-10",
      durationMin: 60,
      timeZone: BOGOTA,
      occupied,
      nowMs,
    });
    expect(free).not.toContain("2026-09-10T15:00");
    expect(free).toContain("2026-09-10T16:00");
    // lead 2h desde 10:00 → no 11:00
    expect(free).not.toContain("2026-09-10T11:00");
  });

  it("listBookingSlotsWithStatus distingue ocupado vs no cabe y lead", () => {
    const nowMs = Date.parse("2026-09-10T15:00:00.000Z"); // 10:00 Bogotá
    const slots = listBookingSlotsWithStatus({
      dayKey: "2026-09-10",
      durationMin: 60,
      timeZone: BOGOTA,
      nowMs,
      occupied: [
        {
          startsAtMs: Date.parse("2026-09-10T20:00:00.000Z"), // 15:00
          durationMin: 60,
          kind: "match",
        },
        {
          startsAtMs: Date.parse("2026-09-10T21:00:00.000Z"), // 16:00
          durationMin: 60,
          kind: "booking",
        },
      ],
      hasTariff: (local) => local !== "2026-09-10T17:00",
    });
    expect(slots.find((s) => s.hm === "11:00")?.status).toBe("too_soon");
    // 14:30 cruzaría el partido 15:00–16:00 con duración 60
    expect(slots.find((s) => s.hm === "14:30")?.status).toBe("no_fit");
    expect(slots.find((s) => s.hm === "15:00")?.status).toBe("occupied_match");
    expect(slots.find((s) => s.hm === "15:30")?.status).toBe("occupied_match");
    expect(slots.find((s) => s.hm === "16:00")?.status).toBe("occupied_booking");
    expect(slots.find((s) => s.hm === "16:30")?.status).toBe("occupied_booking");
    expect(slots.find((s) => s.hm === "17:00")?.status).toBe("no_tariff");
    expect(slots.find((s) => s.hm === "18:00")?.status).toBe("available");
  });

  it("reserva 20:00–21:00: 19:30 es no_fit (60 min), no ocupado", () => {
    const nowMs = Date.parse("2026-09-10T15:00:00.000Z"); // 10:00 Bogotá
    const slots = listBookingSlotsWithStatus({
      dayKey: "2026-09-10",
      durationMin: 60,
      timeZone: BOGOTA,
      nowMs,
      occupied: [
        {
          // 20:00 Bogotá = 01:00Z del día siguiente… wait, Bogotá is UTC-5
          // 20:00 Bogotá = 2026-09-11T01:00:00.000Z if day is Sep 10... 
          // Actually Sep 10 20:00 Bogotá = Sep 11 01:00 UTC
          startsAtMs: Date.parse("2026-09-11T01:00:00.000Z"),
          durationMin: 60,
          kind: "booking",
        },
      ],
    });
    expect(slots.find((s) => s.hm === "19:30")?.status).toBe("no_fit");
    expect(slots.find((s) => s.hm === "20:00")?.status).toBe("occupied_booking");
    expect(slots.find((s) => s.hm === "20:30")?.status).toBe("occupied_booking");
    // 19:00 con 60 min termina en 20:00 → pegado, libre
    expect(slots.find((s) => s.hm === "19:00")?.status).toBe("available");
  });

  it("con duración 30, 19:30 queda libre si la reserva es 20:00–21:00", () => {
    const nowMs = Date.parse("2026-09-10T15:00:00.000Z");
    const slots = listBookingSlotsWithStatus({
      dayKey: "2026-09-10",
      durationMin: 30,
      timeZone: BOGOTA,
      nowMs,
      occupied: [
        {
          startsAtMs: Date.parse("2026-09-11T01:00:00.000Z"), // 20:00 Bogotá
          durationMin: 60,
          kind: "booking",
        },
      ],
    });
    expect(slots.find((s) => s.hm === "19:30")?.status).toBe("available");
    expect(slots.find((s) => s.hm === "20:00")?.status).toBe("occupied_booking");
    expect(slots.find((s) => s.hm === "20:30")?.status).toBe("occupied_booking");
  });
});

describe("whatsapp + owner notify", () => {
  it("normaliza móvil CO", () => {
    expect(normalizeBookingWhatsapp("3001234567")).toBe("573001234567");
    expect(normalizeBookingWhatsapp("6051234567")).toBeNull();
  });

  it("arma wa.me al dueño", () => {
    const msg = bookingOwnerNotifyMessage({
      venueName: "Padel Park",
      sportLabel: "Pádel",
      whenLabel: "vie, 10 de sept, 3:00 p. m.",
      durationMin: 90,
      finalCop: 80000,
      playerWhatsapp: "573001234567",
    });
    expect(msg).toContain("Padel Park");
    expect(msg).toContain("573001234567");
    const href = bookingOwnerNotifyHref("3009876543", msg);
    expect(href).toMatch(/^https:\/\/wa\.me\/573009876543\?text=/);
  });
});

describe("booking proofs path", () => {
  it("usa venue_id/user_id/uuid.ext", () => {
    const path = bookingProofObjectPath(
      "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      "11111111-2222-3333-4444-555555555555",
      "comp.jpg",
    );
    expect(path).toMatch(
      /^aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee\/11111111-2222-3333-4444-555555555555\/.+\.jpg$/,
    );
  });
});

describe("feature flag venue_booking", () => {
  it("está en keys, default off, parseEnv funciona", async () => {
    const { FEATURE_FLAG_KEYS, parseFeatureEnv, featureFlagDefault } =
      await import("@/lib/feature-flags");
    expect(FEATURE_FLAG_KEYS).toContain("venue_booking");
    expect(FEATURE_FLAG_KEYS).not.toContain("venue_bookings");
    expect(featureFlagDefault("venue_booking")).toBe(false);
    expect(featureFlagDefault("premium_paywall")).toBe(true);
    expect(parseFeatureEnv("0")).toBe(false);
    expect(parseFeatureEnv("1")).toBe(true);
    expect(parseFeatureEnv(undefined)).toBeNull();
  });
});

describe("legal booking variant", () => {
  it("mensaje específico", () => {
    expect(legalAcceptErrorMessage("booking")).toMatch(/reservar/i);
  });
});

describe("occupancy kind mapping", () => {
  it("lookup booking → block_kind + booking_id", () => {
    const hit = mapLookupOccupancyRpcRow({
      kind: "booking",
      match_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      share_code: null,
      host_id: null,
      starts_at: "2026-09-10T20:00:00.000Z",
      duration_min: 60,
      venue_id: "vvvvvvvv-vvvv-vvvv-vvvv-vvvvvvvvvvvv",
      venue_name: "Cancha",
      away_opened_by: null,
      open_slot_count: 0,
      has_side_b: true,
      sport: "padel",
      format: null,
    });
    expect(hit.block_kind).toBe("booking");
    expect(hit.booking_id).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    expect(hit.match_id).toBeNull();
  });

  it("day booking → block_kind + booking_id", () => {
    const row = mapDayOccupancyRpcRow({
      kind: "booking",
      match_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
      share_code: null,
      starts_at: "2026-09-10T20:00:00.000Z",
      duration_min: 60,
      sport: "padel",
      format: null,
      open_slot_count: 0,
      has_side_b: true,
    });
    expect(row.block_kind).toBe("booking");
    expect(row.booking_id).toBe("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    expect(row.match_id).toBeNull();
  });

  it("day match conserva match_id", () => {
    const row = mapDayOccupancyRpcRow({
      kind: "match",
      match_id: "mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm",
      share_code: "abc12345",
      starts_at: "2026-09-10T20:00:00.000Z",
      duration_min: 90,
      sport: "futbol",
      format: "5v5",
      open_slot_count: 2,
      has_side_b: false,
    });
    expect(row.block_kind).toBe("match");
    expect(row.match_id).toBe("mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm");
    expect(row.booking_id).toBeNull();
  });
});

describe("venueHasUsableBookingPricing / cancel", () => {
  it("detecta pricing usable por deporte", () => {
    const pricing = {
      slots: [{ sport: "padel" }],
      defaults: [{ sport: "futbol" }],
    };
    expect(venueHasUsableBookingPricing(pricing, ["futbol", "padel"])).toBe(true);
    expect(venueHasUsableBookingPricing(pricing, ["basquet"])).toBe(false);
    expect(bookableSportsForVenue(pricing, ["futbol", "basquet", "padel"])).toEqual([
      "futbol",
      "padel",
    ]);
  });

  it("canPlayerCancelBooking pending / confirmed lead", () => {
    const now = Date.parse("2026-09-08T12:00:00.000Z");
    expect(canPlayerCancelBooking("pending", "2026-09-08T13:00:00.000Z", now)).toBe(true);
    expect(canPlayerCancelBooking("confirmed", "2026-09-09T12:00:00.000Z", now)).toBe(true);
    expect(canPlayerCancelBooking("confirmed", "2026-09-08T20:00:00.000Z", now)).toBe(false);
    expect(canPlayerCancelBooking("expired", "2026-09-09T12:00:00.000Z", now)).toBe(false);
  });

  it("bookingDurationsForMin filtra 30 si min=60", () => {
    expect(bookingDurationsForMin(60)).toEqual([60, 90]);
    expect(bookingDurationsForMin(30)).toEqual([30, 60, 90]);
  });
});
