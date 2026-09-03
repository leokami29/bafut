export function formatWhen(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMoney(amount: number | null, currency = "COP") {
  if (amount == null) {
    return "A convenir";
  }
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
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
