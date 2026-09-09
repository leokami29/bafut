/** Próxima hora en punto para datetime-local (hora local del navegador). */
export function defaultStartsAtLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return toDatetimeLocalValue(d);
}

/** Hora civil del partido en el timezone de la ciudad, para datetime-local. */
export function isoToDatetimeLocalInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return defaultStartsAtLocal();
  const { year, month, day, hour, minute } = zonedDateParts(d, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Interpreta `datetime-local` como hora civil de `timeZone` y devuelve el instante UTC.
 */
export function datetimeLocalInZoneToDate(local: string, timeZone: string): Date | null {
  const match = DATETIME_LOCAL_RE.exec(local.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

  let utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 4; i++) {
    const parts = zonedDateParts(new Date(utc), timeZone);
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, 0);
    const want = Date.UTC(year, month - 1, day, hour, minute, 0);
    const delta = want - got;
    if (delta === 0) break;
    utc += delta;
  }

  const parts = zonedDateParts(new Date(utc), timeZone);
  if (parts.year !== year || parts.month !== month || parts.day !== day || parts.hour !== hour || parts.minute !== minute) {
    return null;
  }
  return new Date(utc);
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

/**
 * Límites UTC del día civil de `local` (datetime-local o ISO) en `timeZone`.
 * dayEnd es exclusivo.
 */
export function cityDayBoundsFromLocal(
  localOrIso: string,
  timeZone: string,
): { dayStart: Date; dayEnd: Date; dayKey: string } | null {
  const trimmed = localOrIso.trim();
  let year: number;
  let month: number;
  let day: number;
  const localMatch = DATETIME_LOCAL_RE.exec(trimmed);
  if (localMatch) {
    year = Number(localMatch[1]);
    month = Number(localMatch[2]);
    day = Number(localMatch[3]);
  } else {
    const instant = new Date(trimmed);
    if (Number.isNaN(instant.getTime())) return null;
    const parts = zonedDateParts(instant, timeZone);
    year = parts.year;
    month = parts.month;
    day = parts.day;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const dayKey = `${year}-${pad(month)}-${pad(day)}`;
  const dayStart = datetimeLocalInZoneToDate(`${dayKey}T00:00`, timeZone);
  if (!dayStart) return null;
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextKey = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  const dayEnd = datetimeLocalInZoneToDate(`${nextKey}T00:00`, timeZone);
  if (!dayEnd) return null;
  return { dayStart, dayEnd, dayKey };
}

/** Empieza entre ahora y ahora + hours (inclusive del borde final). */
export function isWithinNextHours(iso: string, hours: number, now = new Date()): boolean {
  const start = new Date(iso).getTime();
  const t = now.getTime();
  if (Number.isNaN(start) || hours <= 0) return false;
  return start >= t && start <= t + hours * 60 * 60 * 1000;
}

/** Zona civil de la consola admin / billing (Colombia). */
export const ADMIN_CIVIL_TZ = "America/Bogota";

const DATE_INPUT_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` del instante en un IANA timeZone (SSR y browser iguales). */
export function toDateInputValueInZone(
  dateOrIso: Date | string,
  timeZone: string = ADMIN_CIVIL_TZ,
): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (Number.isNaN(d.getTime())) return "";
  return cityCalendarDayKey(d, timeZone);
}

/**
 * Suma días de calendario a un `YYYY-MM-DD` o ISO, devolviendo `YYYY-MM-DD`
 * (aritmética UTC sobre Y-M-D; no depende del TZ del runtime).
 */
export function addCalendarDaysToDateInput(
  dateInputOrIso: string,
  days: number,
  timeZone: string = ADMIN_CIVIL_TZ,
): string {
  const trimmed = dateInputOrIso.trim();
  const ymd = DATE_INPUT_RE.test(trimmed)
    ? trimmed
    : toDateInputValueInZone(trimmed, timeZone);
  const match = DATE_INPUT_RE.exec(ymd);
  if (!match) return "";
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`;
}

/**
 * Interpreta `YYYY-MM-DD` como inicio (00:00) o fin (23:59:59) civil en `timeZone`.
 */
export function parseDateInputInZone(
  raw: string,
  kind: "start" | "end",
  timeZone: string = ADMIN_CIVIL_TZ,
): Date | null {
  const match = DATE_INPUT_RE.exec(raw.trim());
  if (!match) return null;
  const dayKey = `${match[1]}-${match[2]}-${match[3]}`;
  if (kind === "start") {
    return datetimeLocalInZoneToDate(`${dayKey}T00:00`, timeZone);
  }
  const nextKey = addCalendarDaysToDateInput(dayKey, 1, timeZone);
  const nextStart = datetimeLocalInZoneToDate(`${nextKey}T00:00`, timeZone);
  if (!nextStart) return null;
  return new Date(nextStart.getTime() - 1000);
}

/** Fecha corta es-CO en zona civil (p. ej. vencimientos Premium). */
export function formatCivilDate(
  dateOrIso: Date | string,
  timeZone: string = ADMIN_CIVIL_TZ,
): string {
  const d = typeof dateOrIso === "string" ? new Date(dateOrIso) : dateOrIso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Default de “nueva fecha de fin” al extender Premium:
 * día civil del `expires_at` + N días (mínimo 1), en zona admin.
 */
export function defaultExtendDateInput(
  expiresAtIso: string,
  durationDays: number,
  timeZone: string = ADMIN_CIVIL_TZ,
): string {
  const base = toDateInputValueInZone(expiresAtIso, timeZone);
  const n = Number(durationDays);
  const days = Math.max(1, Number.isFinite(n) ? n : 30);
  return addCalendarDaysToDateInput(base, days, timeZone);
}
