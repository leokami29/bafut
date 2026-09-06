import { FORMATS, LEVELS, SPORTS, type Format, type Level, type Sport } from "@/lib/constants";

export type MatchAlertCriteria = {
  city_id: string;
  sport: string | null;
  format: string | null;
  level: string | null;
  neighborhood: string | null;
};

export type MatchForAlert = {
  id: string;
  city_id: string;
  sport: string;
  format: string;
  status: string;
  share_code: string;
  starts_at: string;
  venues?: { neighborhood?: string | null; name?: string | null } | null;
  match_slots?: Array<{ level: string }> | null;
};

/** ¿El partido matchea la alerta? Nivel: any en alerta o slot, o slot.level = alerta.level. */
export function matchMatchesAlert(match: MatchForAlert, alert: MatchAlertCriteria): boolean {
  if (match.city_id !== alert.city_id) return false;
  if (match.status !== "open") return false;
  if (alert.sport && match.sport !== alert.sport) return false;
  if (alert.format && match.format !== alert.format) return false;

  if (alert.neighborhood) {
    const n = match.venues?.neighborhood?.trim().toLowerCase() ?? "";
    if (n !== alert.neighborhood.trim().toLowerCase()) return false;
  }

  if (alert.level && alert.level !== "any") {
    const slots = match.match_slots ?? [];
    if (slots.length === 0) return true;
    const ok = slots.some(
      (slot) => slot.level === "any" || slot.level === alert.level,
    );
    if (!ok) return false;
  }

  return true;
}

export function parseAlertSport(raw: FormDataEntryValue | null): Sport | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v || v === "any") return null;
  return (SPORTS as readonly string[]).includes(v) ? (v as Sport) : null;
}

export function parseAlertFormat(raw: FormDataEntryValue | null): Format | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v || v === "any") return null;
  return (FORMATS as readonly string[]).includes(v) ? (v as Format) : null;
}

export function parseAlertLevel(raw: FormDataEntryValue | null): Level | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v || v === "any") return null;
  return (LEVELS as readonly string[]).includes(v) ? (v as Level) : null;
}

export function parseAlertNeighborhood(raw: FormDataEntryValue | null): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  return v.slice(0, 80);
}

/** Payload mínimo de notificación (sin PII). */
export function buildPushPayload(match: {
  share_code: string;
  sport: string;
  format: string;
  starts_at: string;
  venues?: { name?: string | null; neighborhood?: string | null } | null;
}) {
  const place =
    match.venues?.name ??
    match.venues?.neighborhood ??
    "una cancha";
  const when = new Date(match.starts_at).toLocaleString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return {
    title: "Partido nuevo en BaFut",
    body: `${match.format} · ${place} · ${when}`,
    url: `/p/${match.share_code}`,
  };
}
