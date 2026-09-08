/**
 * Constantes, tipos y helpers de reserva de cancha (alquiler de horario).
 * Reglas espejo del RPC submit/cancel (hold 4h, lead 2h, horizonte 14d, cancel confirmed 12h).
 */

import { datetimeLocalInZoneToDate, zonedDateParts } from "@/lib/datetime";
import { formatMoney, formatWhen } from "@/lib/format";
import { normalizeWhatsapp, whatsappChatHref } from "@/lib/whatsapp-contact";

export const BOOKING_HOLD_HOURS = 4;
/** Soft hold al entrar al pago (espejo SQL start_venue_booking_hold). */
export const BOOKING_SOFT_HOLD_MINUTES = 8;
export const BOOKING_MIN_LEAD_HOURS = 2;
export const BOOKING_MAX_HORIZON_DAYS = 14;
export const BOOKING_CANCEL_CONFIRMED_LEAD_HOURS = 12;

/** Ventana civil de grilla (hora local de la ciudad). Fin exclusivo del último inicio posible. */
export const BOOKING_GRID_START_HOUR = 6;
export const BOOKING_GRID_END_HOUR = 23;
export const BOOKING_SLOT_STEP_MIN = 30;

export const BOOKING_DURATIONS = [30, 60, 90] as const;
export type BookingDurationMin = (typeof BOOKING_DURATIONS)[number];

export const BOOKING_STATUSES = [
  "hold",
  "pending",
  "confirmed",
  "rejected",
  "cancelled",
  "expired",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Código cuando el soft hold venció o no coincide con la franja. */
export const BOOKING_HOLD_EXPIRED_CODE = "BOOKING_HOLD_EXPIRED";

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

export const BOOKING_PAYMENT_METHODS = ["nequi", "bank_transfer"] as const;
export type BookingPaymentMethod = (typeof BOOKING_PAYMENT_METHODS)[number];

/** Abono al reservar (% del alquiler). 100 = pago completo (comportamiento histórico). */
export const BOOKING_DEPOSIT_PCTS = [30, 50, 70, 100] as const;
export type BookingDepositPct = (typeof BOOKING_DEPOSIT_PCTS)[number];

/** WhatsApp CO móvil: 573XXXXXXXXX */
export const BOOKING_WHATSAPP_RE = /^573[0-9]{9}$/;

export type OccupyInterval = {
  startsAtMs: number;
  durationMin: number;
  /** Origen del bloqueo cuando viene de `list_venue_day_occupancy`. */
  kind?: "match" | "booking";
};

export type BookingSlotStatus =
  | "available"
  | "occupied_match"
  | "occupied_booking"
  /** Inicio libre, pero la duración elegida cruzaría una ocupación. */
  | "no_fit"
  | "too_soon"
  | "no_tariff";

export type BookingSlotOption = {
  /** datetime-local `YYYY-MM-DDTHH:mm` en TZ de la ciudad. */
  local: string;
  hm: string;
  status: BookingSlotStatus;
};

export function isBookingDuration(value: number): value is BookingDurationMin {
  return (BOOKING_DURATIONS as readonly number[]).includes(value);
}

export function isBookingPaymentMethod(value: string): value is BookingPaymentMethod {
  return (BOOKING_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function isBookingDepositPct(value: number): value is BookingDepositPct {
  return (BOOKING_DEPOSIT_PCTS as readonly number[]).includes(value);
}

/**
 * Abono desde el % del venue. Mismo redondeo que el RPC:
 * `round(final_cop * deposit_pct / 100)`.
 */
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

/** Rangos half-open [start, end) — pegados no solapan. */
export function occupyRangesOverlap(a: OccupyInterval, b: OccupyInterval): boolean {
  const aEnd = occupyEndMs(a);
  const bEnd = occupyEndMs(b);
  return a.startsAtMs < bEnd && aEnd > b.startsAtMs;
}

/** El instante de inicio cae dentro del intervalo ocupado [start, end). */
export function occupyContainsStart(interval: OccupyInterval, startMs: number): boolean {
  return startMs >= interval.startsAtMs && startMs < occupyEndMs(interval);
}

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

/** Normaliza y valida WA obligatorio del jugador (mismo check que el RPC). */
export function normalizeBookingWhatsapp(raw: string): string | null {
  const normalized = normalizeWhatsapp(raw);
  if (!normalized || !BOOKING_WHATSAPP_RE.test(normalized)) return null;
  return normalized;
}

export function bookingStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmado";
    case "rejected":
      return "Rechazado";
    case "cancelled":
      return "Cancelado";
    case "expired":
      return "Expirado";
    default:
      return status;
  }
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

/** Clave civil YYYY-MM-DD en TZ de la ciudad. */
export function localDayKey(instant: Date, timeZone: string): string {
  const { year, month, day } = zonedDateParts(instant, timeZone);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/**
 * Inicios candidatos HH:mm cada 30 min en [06:00, 23:00) que caben con la duración
 * antes de las 23:00 locales.
 */
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
  /** No ofrecer 30 si la cancha exige min ≥ 60, etc. */
  minMinutes?: number;
};

/**
 * Franjas libres del día (datetime-local) respetando lead, horizonte, grilla y ocupación.
 */
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
  /**
   * Si se provee y retorna false, el slot libre se marca `no_tariff`
   * (no bookable hasta que el dueño configure precio).
   */
  hasTariff?: (local: string) => boolean;
};

/**
 * Grilla completa del día (06–23) con estado: libre, ocupado (partido/reserva),
 * no cabe (duración cruzaría ocupación), lead insuficiente o sin tarifa.
 * Respeta horizonte y duración mínima.
 *
 * Un inicio se marca `occupied_*` solo si cae dentro de [start, end) de la ocupación.
 * Si el inicio está libre pero la duración elegida solapa, se marca `no_fit`.
 */
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

export function bookingSlotStatusLabel(status: BookingSlotStatus): string {
  switch (status) {
    case "available":
      return "Libre";
    case "occupied_match":
      return "Partido";
    case "occupied_booking":
      return "Ocupado";
    case "no_fit":
      return "No cabe";
    case "too_soon":
      return "Lead";
    case "no_tariff":
      return "Sin tarifa";
    default:
      return status;
  }
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

/** Texto prearmado para avisar al dueño tras submit (CTA WhatsApp). */
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

/** Código estable del RPC cuando tarifa/promo/% abono cambió entre preview y submit. */
export const BOOKING_PRICE_CHANGED_PREFIX = "BOOKING_PRICE_CHANGED:";

export type BookingPriceChangedAmounts = {
  finalCop: number;
  depositCop: number;
};

/** Parsea `BOOKING_PRICE_CHANGED:final:deposit` del RPC. */
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

/** Cancel jugador: pending siempre; confirmed solo si ≥12h antes del inicio. */
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

/** Hay tarifa usable (slots o defaults) para al menos un deporte de la cancha. */
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

/** Deportes de la cancha con al menos un slot o default. */
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

/** Días civiles YYYY-MM-DD desde hoy hasta horizonte (incl.). */
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

/** Duraciones ofrecidas respetando mínimo de la cancha. */
export function bookingDurationsForMin(
  minMinutes: number | null | undefined,
): BookingDurationMin[] {
  const min = minMinutes ?? 0;
  return BOOKING_DURATIONS.filter((d) => d >= min);
}
