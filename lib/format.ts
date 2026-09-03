import { APP_LOCALE, zonedDateParts } from "@/lib/datetime";
import { POSITIONS, type Position } from "@/lib/constants";
import { positionCountLabel } from "@/lib/labels";

const WEEKDAYS_ES = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;
const MONTHS_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
] as const;

/** Fecha/hora de partido en es-CO, estable entre SSR y cliente (timeZone IANA obligatorio). */
export function formatWhen(iso: string, timeZone: string) {
  const { weekday, day, month, hour, minute } = zonedDateParts(new Date(iso), timeZone);
  const hour12 = hour % 12 || 12;
  const period = hour < 12 ? "a. m." : "p. m.";
  const mm = String(minute).padStart(2, "0");
  return `${WEEKDAYS_ES[weekday]}, ${day} de ${MONTHS_ES[month - 1]}, ${hour12}:${mm} ${period}`;
}

/** Solo la hora civil (para chips de ocupación del día). */
export function formatTimeOfDay(iso: string, timeZone: string) {
  const { hour, minute } = zonedDateParts(new Date(iso), timeZone);
  const hour12 = hour % 12 || 12;
  const period = hour < 12 ? "a. m." : "p. m.";
  const mm = String(minute).padStart(2, "0");
  return `${hour12}:${mm} ${period}`;
}

export function formatMoney(amount: number | null, currency = "COP") {
  if (amount == null) {
    return "A convenir";
  }
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    numberingSystem: "latn",
  })
    .format(amount)
    .replace(/[\u00a0\u202f]/g, " ");
}

const POSITION_ORDER = new Map<string, number>(
  POSITIONS.map((pos, index) => [pos, index]),
);

const MAX_LISTED_POSITIONS = 3;

function joinEs(parts: string[]) {
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

function groupOpenPositions(openPositions: readonly string[]) {
  const counts = new Map<string, number>();
  for (const raw of openPositions) {
    const key = raw || "any";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => {
    const orderA = POSITION_ORDER.get(a[0]) ?? Number.MAX_SAFE_INTEGER;
    const orderB = POSITION_ORDER.get(b[0]) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a[0].localeCompare(b[0]);
  });
}

/**
 * Frase de cupos abiertos agrupada por posición.
 * Ej: “Falta 1 arquero”, “Faltan 1 arquero y 1 defensa”, “Faltan 2”.
 * Con 4+ roles distintos: “Faltan N en varias posiciones”.
 */
export function openSlotsPhrase(openPositions: readonly string[]) {
  const total = openPositions.length;
  if (total <= 0) {
    return "Completo";
  }

  const groups = groupOpenPositions(openPositions);
  const allAny = groups.every(([pos]) => pos === "any");
  if (allAny) {
    return total === 1 ? "Falta 1" : `Faltan ${total}`;
  }

  if (groups.length > MAX_LISTED_POSITIONS) {
    return `Faltan ${total} en varias posiciones`;
  }

  const parts = groups.map(([pos, count]) => positionCountLabel(pos as Position, count));
  const list = joinEs(parts);
  return total === 1 ? `Falta ${list}` : `Faltan ${list}`;
}
