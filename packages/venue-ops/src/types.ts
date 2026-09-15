/** Constantes y tipos de reserva / ocupación (dominio puro). */

export const BOOKING_HOLD_HOURS = 4;
export const BOOKING_SOFT_HOLD_MINUTES = 8;
export const BOOKING_MIN_LEAD_HOURS = 2;
export const BOOKING_MAX_HORIZON_DAYS = 14;
export const BOOKING_CANCEL_CONFIRMED_LEAD_HOURS = 12;

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

/** Origen de la fila en venue_bookings. */
export const BOOKING_SOURCES = ["player", "owner", "block"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const BOOKING_HOLD_EXPIRED_CODE = "BOOKING_HOLD_EXPIRED";
export const BOOKING_PRICE_CHANGED_PREFIX = "BOOKING_PRICE_CHANGED:";

export const BOOKING_PAYMENT_METHODS = ["nequi", "bank_transfer"] as const;
export type BookingPaymentMethod = (typeof BOOKING_PAYMENT_METHODS)[number];

export const BOOKING_DEPOSIT_PCTS = [30, 50, 70, 100] as const;
export type BookingDepositPct = (typeof BOOKING_DEPOSIT_PCTS)[number];

export const BOOKING_WHATSAPP_RE = /^573[0-9]{9}$/;

export type OccupancyBlockKind = "match" | "booking";

/** Vista admin del día: granularidad para la agenda. */
export type AdminOccupancyKind =
  | "match"
  | "booking_hold"
  | "booking_pending"
  | "booking_confirmed"
  | "block";

export type OccupyInterval = {
  startsAtMs: number;
  durationMin: number;
  kind?: OccupancyBlockKind;
};

export type BookingSlotStatus =
  | "available"
  | "occupied_match"
  | "occupied_booking"
  | "no_fit"
  | "too_soon"
  | "no_tariff";

export type BookingSlotOption = {
  local: string;
  hm: string;
  status: BookingSlotStatus;
};

export type VenueDayOccupancy = {
  match_id: string | null;
  share_code: string | null;
  starts_at: string;
  duration_min: number;
  sport: string;
  format: string | null;
  open_slot_count: number;
  has_side_b: boolean;
  block_kind: OccupancyBlockKind;
  booking_id: string | null;
};

export type OccupancyReason = "join" | "open_b" | "blocked" | "own";

export type OccupancyHit = {
  match_id: string | null;
  share_code: string | null;
  host_id: string | null;
  starts_at: string;
  duration_min: number;
  venue_id: string;
  venue_name: string;
  away_opened_by: string | null;
  open_slot_count: number;
  has_side_b: boolean;
  sport: string;
  format: string | null;
  block_kind: OccupancyBlockKind;
  booking_id: string | null;
};

export type OccupancyConflict = OccupancyHit & { reason: OccupancyReason };

export type AdminDayBlock = {
  id: string;
  kind: AdminOccupancyKind;
  startsAt: string;
  durationMin: number;
  sport: string;
  label: string;
  href?: string;
  holdExpiresAt?: string | null;
  source?: BookingSource;
};

export type BookingPriceChangedAmounts = {
  finalCop: number;
  depositCop: number;
};
