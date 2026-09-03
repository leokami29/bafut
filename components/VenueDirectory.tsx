"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Sport } from "@/lib/constants";
import type { Venue } from "@/lib/types";
import { sportLabel, venueKindLabel } from "@/lib/labels";
import { VenueMapLazy } from "@/components/VenueMapLazy";

type KindFilter = "all" | "alquiler" | "publica" | "club";
type SportFilter = "all" | Sport;
type MobileView = "both" | "list" | "map";

function formatSports(sports: string[] | undefined) {
  if (!sports?.length) return "";
  return sports.map((s) => sportLabel[s as Sport] ?? s).join(" · ");
}

function useIsDesktop(breakpoint = 900) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isDesktop;
}

export function VenueDirectory({
  venues,
  center,
}: {
  venues: Venue[];
  center: { lat: number; lng: number };
}) {
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sport, setSport] = useState<SportFilter>("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");
  const [mobileView, setMobileView] = useState<MobileView>("both");
  const [focusId, setFocusId] = useState<string | undefined>();

  const availableSports = useMemo(() => {
    const set = new Set<Sport>();
    for (const v of venues) {
      for (const s of v.sports ?? []) {
        if (s in sportLabel) set.add(s as Sport);
      }
    }
    return [...set].sort(
      (a, b) =>
        ["futbol", "futbol_sala", "basquet", "voleibol", "padel"].indexOf(a) -
        ["futbol", "futbol_sala", "basquet", "voleibol", "padel"].indexOf(b),
    );
  }, [venues]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const v of venues) {
      if (v.neighborhood) set.add(v.neighborhood);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [venues]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((venue) => {
      if (kind !== "all" && venue.venue_kind !== kind) return false;
      if (sport !== "all" && !venue.sports?.includes(sport)) return false;
      if (neighborhood !== "all" && venue.neighborhood !== neighborhood) return false;
      if (!q) return true;
      const hay = `${venue.name} ${venue.neighborhood ?? ""} ${venue.address ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [venues, query, kind, sport, neighborhood]);

  const grouped = useMemo(() => {
    const map = new Map<string, Venue[]>();
    for (const venue of filtered) {
      const key = venue.neighborhood ?? "Sin barrio";
      const list = map.get(key) ?? [];
      list.push(venue);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
  }, [filtered]);

  const showMap = isDesktop || mobileView !== "list";
  const showList = isDesktop || mobileView !== "map";
  const hasActiveFilter =
    query.trim() !== "" || kind !== "all" || sport !== "all" || neighborhood !== "all";

  const groupDefaultOpen = (barrio: string) =>
    isDesktop || neighborhood === barrio || (hasActiveFilter && grouped.length <= 4);

  return (
    <div className="venue-directory">
      <div className="venue-toolbar">
        <label className="venue-search">
          <span className="sr-only">Buscar cancha</span>
          <input
            type="search"
            placeholder="Buscar por nombre o barrio…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-controls="venue-list"
          />
        </label>

        <div className="venue-toolbar-filters">
          <div className="filter-chips" role="group" aria-label="Tipo de cancha">
            {(
              [
                ["all", "Todas"],
                ["alquiler", "Alquiler"],
                ["publica", "Pública"],
                ["club", "Club"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={kind === value ? "is-on" : undefined}
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {availableSports.length > 1 ? (
            <div className="filter-chips filter-chips-sport" role="group" aria-label="Deporte">
              <button
                type="button"
                className={sport === "all" ? "is-on" : undefined}
                aria-pressed={sport === "all"}
                onClick={() => setSport("all")}
              >
                Todos
              </button>
              {availableSports.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={sport === value ? "is-on" : undefined}
                  aria-pressed={sport === value}
                  onClick={() => setSport(value)}
                >
                  {sportLabel[value]}
                </button>
              ))}
            </div>
          ) : null}

          {neighborhoods.length > 1 ? (
            <label className="venue-filter-select">
              <span className="sr-only">Barrio</span>
              <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)}>
                <option value="all">Todos los barrios</option>
                {neighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <div className="venue-toolbar-meta">
          <p className="venue-count" aria-live="polite">
            {filtered.length} de {venues.length} canchas
          </p>

          {!isDesktop ? (
            <div className="view-toggle view-toggle-mobile" role="group" aria-label="Vista">
              {(
                [
                  ["both", "Mapa y lista"],
                  ["map", "Solo mapa"],
                  ["list", "Solo lista"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={mobileView === value ? "is-on" : undefined}
                  aria-pressed={mobileView === value}
                  onClick={() => setMobileView(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={`venue-layout${showMap && showList ? " has-both" : ""}`}>
        {showList ? (
          <div className="venue-panel-list">
            {filtered.length > 0 ? (
              <div id="venue-list" className="venue-groups">
                {grouped.map(([barrio, list]) =>
                  isDesktop ? (
                    <section key={barrio} aria-labelledby={`barrio-${barrio}`} className="venue-group">
                      <h2 className="venue-group-title" id={`barrio-${barrio}`}>
                        {barrio}
                        <span className="venue-group-count">{list.length}</span>
                      </h2>
                      <ul className="venue-list venue-list-compact">
                        {list.map((venue) => (
                          <li key={venue.id}>
                            <Link
                              href={`/canchas/${venue.slug}`}
                              onMouseEnter={() => setFocusId(venue.id)}
                              onFocus={() => setFocusId(venue.id)}
                            >
                              <strong>{venue.name}</strong>
                              <span className="venue-list-meta">
                                {[formatSports(venue.sports), venue.venue_kind
                                  ? venueKindLabel[venue.venue_kind] ?? venue.venue_kind
                                  : ""]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : (
                    <details
                      key={barrio}
                      className="venue-group"
                      open={groupDefaultOpen(barrio) || undefined}
                    >
                      <summary className="venue-group-title">
                        {barrio}
                        <span className="venue-group-count">{list.length}</span>
                      </summary>
                      <ul className="venue-list venue-list-compact">
                        {list.map((venue) => (
                          <li key={venue.id}>
                            <Link
                              href={`/canchas/${venue.slug}`}
                              onFocus={() => setFocusId(venue.id)}
                            >
                              <strong>{venue.name}</strong>
                              <span className="venue-list-meta">
                                {[formatSports(venue.sports), venue.venue_kind
                                  ? venueKindLabel[venue.venue_kind] ?? venue.venue_kind
                                  : ""]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ),
                )}
              </div>
            ) : (
              <p className="empty">Ninguna cancha coincide. Prueba otro barrio, deporte o nombre.</p>
            )}
          </div>
        ) : null}

        {showMap ? (
          <div className="venue-panel-map">
            <p className="venue-map-label">Mapa de canchas</p>
            <VenueMapLazy venues={filtered} center={center} focusId={focusId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
