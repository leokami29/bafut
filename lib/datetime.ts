/** Próxima hora en punto para datetime-local (hora local del navegador). */
export function defaultStartsAtLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type MatchTimePeriod = "manana" | "tarde" | "noche";

/** Locale de producto (copy). Los campos de calendario se extraen con en-US + timeZone. */
export const APP_LOCALE = "es-CO";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
};

/**
 * Campos civiles en un IANA timeZone. Usa locale fijo `en-US` + `hourCycle: h23`
 * para que Node (SSR) y el navegador den los mismos números, no el mismo `format()`.
 */
export function zonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour,
    minute: Number(get("minute")),
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
  };
}

function matchHour(iso: string, timezone: string): number {
  return zonedDateParts(new Date(iso), timezone).hour;
}

/** Partido empieza esta noche (18:00–05:59). */
export function isTonightMatch(iso: string, timezone: string): boolean {
  const hour = matchHour(iso, timezone);
  return hour >= 18 || hour < 6;
}

/** Franja horaria del partido para agrupar la lista. */
export function getMatchTimePeriod(iso: string, timezone: string): MatchTimePeriod {
  const hour = matchHour(iso, timezone);
  if (hour >= 6 && hour < 12) return "manana";
  if (hour >= 12 && hour < 18) return "tarde";
  return "noche";
}

function cityCalendarDayKey(date: Date, timezone: string): string {
  const { year, month, day } = zonedDateParts(date, timezone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Mismo día civil en el timezone de la ciudad. */
export function isSameCityDay(iso: string, timezone: string, now = new Date()): boolean {
  return cityCalendarDayKey(new Date(iso), timezone) === cityCalendarDayKey(now, timezone);
}

/** Empieza entre ahora y ahora + hours (inclusive del borde final). */
export function isWithinNextHours(iso: string, hours: number, now = new Date()): boolean {
  const start = new Date(iso).getTime();
  const t = now.getTime();
  if (Number.isNaN(start) || hours <= 0) return false;
  return start >= t && start <= t + hours * 60 * 60 * 1000;
}
