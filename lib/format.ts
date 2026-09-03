import { zonedDateParts } from "@/lib/datetime";

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

export function formatMoney(amount: number | null, currency = "COP") {
  if (amount == null) {
    return "A convenir";
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    numberingSystem: "latn",
  })
    .format(amount)
    .replace(/[\u00a0\u202f]/g, " ");
}

export function openSlotsPhrase(count: number, positionLabel: string) {
  if (count <= 0) {
    return "Completo";
  }
  if (count === 1) {
    return `Falta 1 ${positionLabel.toLowerCase()}`;
  }
  return `Faltan ${count} (${positionLabel.toLowerCase()})`;
}
