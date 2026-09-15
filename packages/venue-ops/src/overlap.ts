import type {
  BookingDepositPct,
  BookingDurationMin,
  BookingPaymentMethod,
  BookingPriceChangedAmounts,
  BookingSource,
  OccupyInterval,
} from "./types";
import {
  BOOKING_DEPOSIT_PCTS,
  BOOKING_DURATIONS,
  BOOKING_HOLD_EXPIRED_CODE,
  BOOKING_PAYMENT_METHODS,
  BOOKING_PRICE_CHANGED_PREFIX,
  BOOKING_SOURCES,
} from "./types";

export function isBookingDuration(value: number): value is BookingDurationMin {
  return (BOOKING_DURATIONS as readonly number[]).includes(value);
}

export function isBookingPaymentMethod(value: string): value is BookingPaymentMethod {
  return (BOOKING_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isBookingDepositPct(value: number): value is BookingDepositPct {
  return (BOOKING_DEPOSIT_PCTS as readonly number[]).includes(value);
}

export function isBookingSource(value: string): value is BookingSource {
  return (BOOKING_SOURCES as readonly string[]).includes(value);
}

export function computeBookingDeposit(
  finalCop: number,
  depositPct: number,
): { depositCop: number; remainderCop: number } {
  const pct = isBookingDepositPct(depositPct) ? depositPct : 100;
  const depositCop = Math.round((finalCop * pct) / 100);
  return { depositCop, remainderCop: finalCop - depositCop };
}

export function normalizeBookingDepositPct(
  value: number | null | undefined,
): BookingDepositPct {
  if (value != null && isBookingDepositPct(value)) return value;
  return 100;
}

export function occupyEndMs(interval: OccupyInterval): number {
  return interval.startsAtMs + interval.durationMin * 60_000;
}

export function occupyRangesOverlap(a: OccupyInterval, b: OccupyInterval): boolean {
  const aEnd = occupyEndMs(a);
  const bEnd = occupyEndMs(b);
  return a.startsAtMs < bEnd && aEnd > b.startsAtMs;
}

export function occupyContainsStart(interval: OccupyInterval, startMs: number): boolean {
  return startMs >= interval.startsAtMs && startMs < occupyEndMs(interval);
}

export function isBookingHoldExpiredError(msg: string | undefined | null): boolean {
  const raw = (msg ?? "").trim();
  if (!raw) return false;
  if (raw === BOOKING_HOLD_EXPIRED_CODE) return true;
  const lower = raw.toLowerCase();
  return (
    lower.includes("apartamento venció") ||
    lower.includes("apartamento vencio") ||
    lower.includes("tiempo para pagar") ||
    lower.includes("hold expired")
  );
}

export function bookingHoldExpiredUserMessage(): string {
  return "Se acabó el tiempo para pagar (8 min). Elegí de nuevo el horario.";
}

export function parseBookingPriceChanged(
  msg: string | undefined | null,
): BookingPriceChangedAmounts | null {
  const raw = (msg ?? "").trim();
  if (!raw.startsWith(BOOKING_PRICE_CHANGED_PREFIX)) return null;
  const rest = raw.slice(BOOKING_PRICE_CHANGED_PREFIX.length);
  const [finalRaw, depositRaw] = rest.split(":");
  const finalCop = Number(finalRaw);
  const depositCop = Number(depositRaw);
  if (!Number.isFinite(finalCop) || !Number.isFinite(depositCop)) return null;
  if (finalCop < 0 || depositCop < 0) return null;
  return { finalCop, depositCop };
}

export function isBookingPriceChangedError(msg: string | undefined | null): boolean {
  if (parseBookingPriceChanged(msg)) return true;
  const lower = (msg ?? "").toLowerCase();
  return (
    lower.includes("precio cambió") ||
    lower.includes("precio cambio") ||
    lower.includes("monto cambió") ||
    lower.includes("monto cambio")
  );
}
