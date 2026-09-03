/** Próxima hora en punto para datetime-local (hora local del navegador). */
export function defaultStartsAtLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type MatchTimePeriod = "manana" | "tarde" | "noche";

function matchHour(iso: string, timezone: string): number {
  return Number(
    new Intl.DateTimeFormat("es-CO", { hour: "numeric", hour12: false, timeZone: timezone }).format(
      new Date(iso),
    ),
  );
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
