/**
 * Facade de reserva de cancha.
 * Dominio puro vive en `@bafut/venue-ops`; acá quedan helpers que dependen de format/datetime/WA.
 */

import { datetimeLocalInZoneToDate, zonedDateParts } from "@/lib/datetime";
import { formatMoney, formatWhen } from "@/lib/format";
import { normalizeWhatsapp, whatsappChatHref } from "@/lib/whatsapp-contact";
import {
  BOOKING_CANCEL_CONFIRMED_LEAD_HOURS,
  BOOKING_DEPOSIT_PCTS,
  BOOKING_DURATIONS,
  BOOKING_GRID_END_HOUR,
  BOOKING_GRID_START_HOUR,
  BOOKING_HOLD_EXPIRED_CODE,
  BOOKING_HOLD_HOURS,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_MIN_LEAD_HOURS,
  BOOKING_PAYMENT_METHODS,
  BOOKING_PRICE_CHANGED_PREFIX,
  BOOKING_SLOT_STEP_MIN,
  BOOKING_SOFT_HOLD_MINUTES,
  BOOKING_STATUSES,
  BOOKING_WHATSAPP_RE,
  bookingHoldExpiredUserMessage,
  bookingSlotStatusLabel,
  bookingStatusLabel,
  computeBookingDeposit,
  isBookingDepositPct,
  isBookingDuration,
  isBookingHoldExpiredError,
  isBookingPaymentMethod,
  isBookingPriceChangedError,
  normalizeBookingDepositPct,
  occupyContainsStart,
  occupyEndMs,
  occupyRangesOverlap,
  parseBookingPriceChanged,
  type BookingDepositPct,
  type BookingDurationMin,
  type BookingPaymentMethod,
  type BookingPriceChangedAmounts,
  type BookingSlotOption,
  type BookingSlotStatus,
  type BookingStatus,
  type OccupyInterval,
} from "@bafut/venue-ops";

export {
  BOOKING_CANCEL_CONFIRMED_LEAD_HOURS,
  BOOKING_DEPOSIT_PCTS,
  BOOKING_DURATIONS,
  BOOKING_GRID_END_HOUR,
  BOOKING_GRID_START_HOUR,
  BOOKING_HOLD_EXPIRED_CODE,
  BOOKING_HOLD_HOURS,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_MIN_LEAD_HOURS,
  BOOKING_PAYMENT_METHODS,
  BOOKING_PRICE_CHANGED_PREFIX,
  BOOKING_SLOT_STEP_MIN,
  BOOKING_SOFT_HOLD_MINUTES,
  BOOKING_STATUSES,
  BOOKING_WHATSAPP_RE,
  bookingHoldExpiredUserMessage,
  bookingSlotStatusLabel,
  bookingStatusLabel,
  computeBookingDeposit,
  isBookingDepositPct,
  isBookingDuration,
  isBookingHoldExpiredError,
  isBookingPaymentMethod,
  isBookingPriceChangedError,
  normalizeBookingDepositPct,
  occupyContainsStart,
  occupyEndMs,
  occupyRangesOverlap,
  parseBookingPriceChanged,
  type BookingDepositPct,
  type BookingDurationMin,
  type BookingPaymentMethod,
  type BookingPriceChangedAmounts,
  type BookingSlotOption,
  type BookingSlotStatus,
  type BookingStatus,
  type OccupyInterval,
};

export function isWithinLeadTime(
  startsAtMs: number,
  nowMs: number,
  minLeadHours: number = BOOKING_MIN_LEAD_HOURS,
): boolean {
  return startsAtMs >= nowMs + minLeadHours * 3_600_000;
}

export function isWithinMaxDaysAhead(
  localDay: string,
  todayLocal: string,
  maxDaysAhead: number = BOOKING_MAX_HORIZON_DAYS,
): boolean {
  const day = Date.parse(`${localDay}T00:00:00Z`);
  const today = Date.parse(`${todayLocal}T00:00:00Z`);
  if (Number.isNaN(day) || Number.isNaN(today)) return false;
  const diffDays = Math.round((day - today) / 86_400_000);
  return diffDays >= 0 && diffDays <= maxDaysAhead;
}

export function canCancelConfirmedBooking(
  startsAtMs: number,
  nowMs: number,
  leadHours: number = BOOKING_CANCEL_CONFIRMED_LEAD_HOURS,
): boolean {
  return startsAtMs - nowMs >= leadHours * 3_600_000;
}

export function normalizeBookingWhatsapp(raw: string): string | null {
  const normalized = normalizeWhatsapp(raw);
  if (!normalized || !BOOKING_WHATSAPP_RE.test(normalized)) return null;
  return normalized;
}

export function bookingPaymentMethodLabel(method: string): string {
  if (method === "nequi") return "Nequi";
  if (method === "bank_transfer") return "Transferencia";
  return method;
}

export function formatBookingMoney(amountCop: number | null | undefined): string {
  return formatMoney(amountCop ?? null, "COP");
}

export function formatBookingWhen(startsAtIso: string, timeZone: string): string {
  return formatWhen(startsAtIso, timeZone);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function localDayKey(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedDateParts(instant, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function listBookingStartTimesLocal(durationMin: BookingDurationMin): string[] {
  const out: string[] = [];
  const endLimitMin = BOOKING_GRID_END_HOUR * 60;
  for (
    let m = BOOKING_GRID_START_HOUR * 60;
    m + durationMin <= endLimitMin;
    m += BOOKING_SLOT_STEP_MIN
  ) {
    out.push(`${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`);
  }
  return out;
}

export type FreeSlotInput = {
  dayKey: string;
  durationMin: BookingDurationMin;
  timeZone: string;
  occupied: OccupyInterval[];
  nowMs?: number;
  minMinutes?: number;
};

export function listFreeBookingSlots(input: FreeSlotInput): string[] {
  const nowMs = input.nowMs ?? Date.now();
  const todayKey = localDayKey(new Date(nowMs), input.timeZone);
  if (!isWithinMaxDaysAhead(input.dayKey, todayKey)) return [];

  if (input.minMinutes != null && input.durationMin < input.minMinutes) {
    return [];
  }

  const times = listBookingStartTimesLocal(input.durationMin);
  const free: string[] = [];

  for (const hm of times) {
    const local = `${input.dayKey}T${hm}`;
    const startsAt = datetimeLocalInZoneToDate(local, input.timeZone);
    if (!startsAt) continue;
    const startsAtMs = startsAt.getTime();
    if (!isWithinLeadTime(startsAtMs, nowMs)) continue;

    const candidate: OccupyInterval = {
      startsAtMs,
      durationMin: input.durationMin,
    };
    const overlaps = input.occupied.some((block) => occupyRangesOverlap(candidate, block));
    if (overlaps) continue;
    free.push(local);
  }

  return free;
}

export type SlotGridInput = FreeSlotInput & {
  hasTariff?: (local: string) => boolean;
};

export function listBookingSlotsWithStatus(input: SlotGridInput): BookingSlotOption[] {
  const nowMs = input.nowMs ?? Date.now();
  const todayKey = localDayKey(new Date(nowMs), input.timeZone);
  if (!isWithinMaxDaysAhead(input.dayKey, todayKey)) return [];

  if (input.minMinutes != null && input.durationMin < input.minMinutes) {
    return [];
  }

  const times = listBookingStartTimesLocal(input.durationMin);
  const out: BookingSlotOption[] = [];

  for (const hm of times) {
    const local = `${input.dayKey}T${hm}`;
    const startsAt = datetimeLocalInZoneToDate(local, input.timeZone);
    if (!startsAt) continue;
    const startsAtMs = startsAt.getTime();

    if (!isWithinLeadTime(startsAtMs, nowMs)) {
      out.push({ local, hm, status: "too_soon" });
      continue;
    }

    const containing = input.occupied.find((b) => occupyContainsStart(b, startsAtMs));
    if (containing) {
      out.push({
        local,
        hm,
        status: containing.kind === "booking" ? "occupied_booking" : "occupied_match",
      });
      continue;
    }

    const candidate: OccupyInterval = {
      startsAtMs,
      durationMin: input.durationMin,
    };
    const crosses = input.occupied.some((b) => occupyRangesOverlap(candidate, b));
    if (crosses) {
      out.push({ local, hm, status: "no_fit" });
      continue;
    }

    if (input.hasTariff && !input.hasTariff(local)) {
      out.push({ local, hm, status: "no_tariff" });
      continue;
    }

    out.push({ local, hm, status: "available" });
  }

  return out;
}

export type BookingOwnerNotifyInput = {
  venueName: string;
  sportLabel: string;
  whenLabel: string;
  durationMin: number;
  finalCop: number;
  depositCop?: number;
  depositPct?: number;
  playerWhatsapp: string;
};

export function bookingOwnerNotifyMessage(input: BookingOwnerNotifyInput): string {
  const total = formatBookingMoney(input.finalCop);
  const depositPct = input.depositPct ?? 100;
  const depositCop = input.depositCop ?? input.finalCop;
  const moneyBit =
    depositPct < 100
      ? `abono ${depositPct}% ${formatBookingMoney(depositCop)} (total ${total})`
      : total;
  return (
    `Hola! Pedí una reserva en ${input.venueName} (${input.sportLabel}) ` +
    `${input.whenLabel} · ${input.durationMin} min · ${moneyBit}. ` +
    `Ya subí el comprobante en BaFut. Mi WhatsApp: ${input.playerWhatsapp}.`
  );
}

export function bookingOwnerNotifyHref(
  ownerWhatsappRaw: string | null | undefined,
  message: string,
): string | null {
  const digits = ownerWhatsappRaw ? normalizeWhatsapp(ownerWhatsappRaw) : null;
  if (!digits) return null;
  return whatsappChatHref(digits, message);
}

export function bookingPriceChangedUserMessage(
  amounts?: BookingPriceChangedAmounts | null,
): string {
  if (amounts) {
    return (
      `El precio cambió mientras pagabas. ` +
      `Ahora el abono es ${formatBookingMoney(amounts.depositCop)} ` +
      `(total ${formatBookingMoney(amounts.finalCop)}). ` +
      `Revisá el monto antes de enviar el comprobante.`
    );
  }
  return (
    "El precio cambió mientras pagabas. Revisá el nuevo monto antes de enviar el comprobante."
  );
}

export function canPlayerCancelBooking(
  status: string,
  startsAtIso: string,
  nowMs: number = Date.now(),
): boolean {
  if (status === "hold" || status === "pending") return true;
  if (status === "confirmed") {
    const startsAtMs = Date.parse(startsAtIso);
    if (Number.isNaN(startsAtMs)) return false;
    return canCancelConfirmedBooking(startsAtMs, nowMs);
  }
  return false;
}

type PricingLike = {
  slots: Array<{ sport: string }>;
  defaults: Array<{ sport: string }>;
};

export function venueHasUsableBookingPricing(
  pricing: PricingLike,
  sports: string[] | null | undefined,
): boolean {
  const list = sports?.length ? sports : [];
  if (list.length === 0) {
    return pricing.slots.length > 0 || pricing.defaults.length > 0;
  }
  return list.some(
    (sport) =>
      pricing.slots.some((s) => s.sport === sport) ||
      pricing.defaults.some((d) => d.sport === sport),
  );
}

export function bookableSportsForVenue(
  pricing: PricingLike,
  sports: string[] | null | undefined,
): string[] {
  const list = sports?.length ? sports : [];
  const candidates =
    list.length > 0
      ? list
      : [
          ...new Set([
            ...pricing.slots.map((s) => s.sport),
            ...pricing.defaults.map((d) => d.sport),
          ]),
        ];
  return candidates.filter(
    (sport) =>
      pricing.slots.some((s) => s.sport === sport) ||
      pricing.defaults.some((d) => d.sport === sport),
  );
}

export function listBookingDayKeys(
  timeZone: string,
  nowMs: number = Date.now(),
  maxDaysAhead: number = BOOKING_MAX_HORIZON_DAYS,
): string[] {
  const today = localDayKey(new Date(nowMs), timeZone);
  const [y, m, d] = today.split("-").map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return [];
  const out: string[] = [];
  for (let i = 0; i <= maxDaysAhead; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    out.push(
      `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`,
    );
  }
  return out;
}

export function bookingDurationsForMin(
  minMinutes: number | null | undefined,
): BookingDurationMin[] {
  const min = minMinutes ?? 0;
  return BOOKING_DURATIONS.filter((d) => d >= min);
}
