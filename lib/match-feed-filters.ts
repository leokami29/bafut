import { slotIsOpen, type MatchDetail } from "@/lib/types";

/** Cupo abierto compatible: nivel `any` o igual al del perfil. */
export function matchFitsProfileLevel(
  match: Pick<MatchDetail, "match_slots">,
  profileLevel: string,
): boolean {
  return match.match_slots.some(
    (slot) => slotIsOpen(slot) && (slot.level === "any" || slot.level === profileLevel),
  );
}

type TimeFilter = "3h" | "hoy" | "noche";

/**
 * Partidos fuera del filtro temporal actual (mañana / más adelante).
 * Se muestran aunque “hoy” / “3 h” ya tengan resultados.
 */
export function selectUpcomingOutsideFilter<T extends { id: string }>(
  open: T[],
  inTimeWindow: T[],
  timeFilter: TimeFilter,
  limit = 5,
): T[] {
  if (timeFilter !== "hoy" && timeFilter !== "3h") return [];
  const inWindowIds = new Set(inTimeWindow.map((m) => m.id));
  return open.filter((match) => !inWindowIds.has(match.id)).slice(0, limit);
}

/** Filtra partidos por modalidad: todos, completar cupos, retos a rivales, o rotación en banca. */
export function filterMatchesByMode<
  T extends {
    match_mode?: string | null;
    match_slots: MatchDetail["match_slots"];
  },
>(matches: T[], mode: "all" | "pickup" | "challenge" | "bench"): T[] {
  if (mode === "all") return matches;
  if (mode === "challenge") {
    return matches.filter((m) => m.match_mode === "challenge");
  }
  if (mode === "bench") {
    return matches.filter((m) =>
      m.match_slots.some((s) => s.slot_role === "bench" && slotIsOpen(s)),
    );
  }
  return matches.filter((m) => m.match_mode !== "challenge");
}

