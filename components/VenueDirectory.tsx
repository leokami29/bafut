"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Sport } from "@/lib/constants";
import type { VenueWithPremium } from "@/lib/types";
import { sportLabel, venueKindLabel } from "@/lib/labels";
import { venueDemandLabel, venueDemandScore, type VenueDemand } from "@/lib/venue-demand";
import { trackEvent } from "@/lib/analytics";
import { VenueMapLazy } from "@/components/VenueMapLazy";

type KindFilter = "all" | "alquiler" | "publica" | "club";
type SportFilter = "all" | Sport;
type MobileView = "both" | "list" | "map";
type SortMode = "relevancia" | "az";
type StatusFilter = "all" | "verified" | "premium";

function formatSports(sports: string[] | undefined) {
  if (!sports?.length) return "";
  return sports.map((s) => sportLabel[s as Sport] ?? s).join(" · ");
}

function sortVenues(
  list: VenueWithPremium[],
  sort: SortMode,
  demandByVenueId: Record<string, VenueDemand>,
  premiumBoost: boolean,
) {
  return [...list].sort((a, b) => {
    if (premiumBoost) {
      const premiumDiff = Number(b.is_premium) - Number(a.is_premium);
      if (premiumDiff !== 0) return premiumDiff;
    }
    if (sort === "relevancia") {
      return venueDemandScore(demandByVenueId[b.id]) - venueDemandScore(demandByVenueId[a.id]);
    }
    return a.name.localeCompare(b.name, "es");
  });
}

function VenueListLink({
  venue,
  demand,
  onActivate,
}: {
  venue: VenueWithPremium;
  demand?: VenueDemand;
  onActivate?: () => void;
}) {
  const meta = [formatSports(venue.sports), venue.venue_kind ? venueKindLabel[venue.venue_kind] ?? venue.venue_kind : ""]
    .filter(Boolean)
    .join(" · ");
  const demandText = demand ? venueDemandLabel(demand) : null;
  const showPublishCta = demand && demand.matchCount > 0;

  return (
    <div className={`venue-list-row${venue.is_premium ? " is-premium" : ""}`}>
      <Link
        href={`/canchas/${venue.slug}`}
        className="venue-list-link"
        onMouseEnter={onActivate}
        onFocus={onActivate}
      >
        <span className="venue-list-main">
          <strong className="venue-list-name">
            {venue.name}
            <span className="venue-list-badges">
              {venue.is_premium ? (
                <span className="venue-list-premium" title="Cancha con plan Premium activo">
                  Premium
                </span>
              ) : null}
              {venue.is_verified ? (
                <span className="venue-list-verified" title="Cancha verificada por su dueño">
                  Verificada
                </span>
              ) : null}
            </span>
          </strong>
          {demandText ? <span className="venue-list-demand">{demandText}</span> : null}
        </span>
        {meta ? <span className="venue-list-meta">{meta}</span> : null}
      </Link>
      {showPublishCta ? (
        <Link
          href={`/partidos/nuevo?venue=${venue.slug}`}
          className="btn-ghost venue-publish-cta"
          onClick={() => trackEvent("canchas_venue_publish_cta_clicked", { venue_slug: venue.slug })}
        >
          Publicar aquí
        </Link>
      ) : null}
    </div>
  );
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
  demandByVenueId = {},
  premiumBoost = true,
}: {
  venues: VenueWithPremium[];
  center: { lat: number; lng: number };
  demandByVenueId?: Record<string, VenueDemand>;
  /** Feature flag directory_premium_boost — kill-switch de orden premium. */
  premiumBoost?: boolean;
}) {
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sport, setSport] = useState<SportFilter>("all");
  const [neighborhood, setNeighborhood] = useState<string>("all");
  const [mobileView, setMobileView] = useState<MobileView>("both");
  const [focusId, setFocusId] = useState<string | undefined>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const hasDemand = useMemo(
    () => Object.values(demandByVenueId).some((d) => d.matchCount > 0),
    [demandByVenueId],
  );
  const [sort, setSort] = useState<SortMode>(hasDemand ? "relevancia" : "az");

  const handleSortChange = (mode: SortMode) => {
    setSort(mode);
    trackEvent("canchas_sort_applied", { sort: mode });
  };

  const verifiedCount = useMemo(
    () => venues.filter((v) => v.is_verified).length,
    [venues],
  );
  const premiumCount = useMemo(
    () => venues.filter((v) => v.is_premium).length,
    [venues],
  );

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
      if (statusFilter === "verified" && !venue.is_verified) return false;
      if (statusFilter === "premium" && !venue.is_premium) return false;
      if (kind !== "all" && venue.venue_kind !== kind) return false;
      if (sport !== "all" && !venue.sports?.includes(sport)) return false;
      if (neighborhood !== "all" && venue.neighborhood !== neighborhood) return false;
      if (!q) return true;
      const hay = `${venue.name} ${venue.neighborhood ?? ""} ${venue.address ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [venues, query, kind, sport, neighborhood, statusFilter]);

  const premiumRail = useMemo(() => {
    if (!premiumBoost || statusFilter === "premium" || premiumCount === 0) return [];
    const q = query.trim().toLowerCase();
    return sortVenues(
      venues.filter((venue) => {
        if (!venue.is_premium) return false;
        if (kind !== "all" && venue.venue_kind !== kind) return false;
        if (sport !== "all" && !venue.sports?.includes(sport)) return false;
        if (neighborhood !== "all" && venue.neighborhood !== neighborhood) return false;
        if (!q) return true;
        const hay = `${venue.name} ${venue.neighborhood ?? ""} ${venue.address ?? ""}`.toLowerCase();
        return hay.includes(q);
      }),
      sort,
      demandByVenueId,
      premiumBoost,
    );
  }, [
    venues,
    statusFilter,
    premiumCount,
    kind,
    sport,
    neighborhood,
    query,
    sort,
    demandByVenueId,
    premiumBoost,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<string, VenueWithPremium[]>();
    for (const venue of filtered) {
      const key = venue.neighborhood ?? "Sin barrio";
      const list = map.get(key) ?? [];
      list.push(venue);
      map.set(key, list);
    }
    const entries = [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));
    for (const [, list] of entries) {
      list.sort((a, b) => {
        if (premiumBoost) {
          const premiumDiff = Number(b.is_premium) - Number(a.is_premium);
          if (premiumDiff !== 0) return premiumDiff;
        }
        if (sort === "relevancia") {
          return venueDemandScore(demandByVenueId[b.id]) - venueDemandScore(demandByVenueId[a.id]);
        }
        return a.name.localeCompare(b.name, "es");
      });
    }
    return entries;
  }, [filtered, sort, demandByVenueId, premiumBoost]);

  const showMap = isDesktop || mobileView !== "list";
  const showList = isDesktop || mobileView !== "map";
  const hasActiveFilter =
    query.trim() !== "" ||
    kind !== "all" ||
    sport !== "all" ||
    neighborhood !== "all" ||
    statusFilter !== "all";
  const activeFilterCount =
    (kind !== "all" ? 1 : 0) +
    (sport !== "all" ? 1 : 0) +
    (neighborhood !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0);

  const groupDefaultOpen = (barrio: string) =>
    isDesktop || neighborhood === barrio || (hasActiveFilter && grouped.length <= 4);

  const filterControls = (
    <div className="venue-toolbar-filters">
      <div className="venue-filter-row">
        <span className="venue-filter-label" id="venue-filter-kind-label">
          Tipo
        </span>
        <div
          className="filter-chips"
          role="group"
          aria-labelledby="venue-filter-kind-label"
        >
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
      </div>

      {verifiedCount > 0 || premiumCount > 0 ? (
        <div className="venue-filter-row">
          <span className="venue-filter-label" id="venue-filter-state-label">
            Estado
          </span>
          <div className="filter-chips" role="group" aria-labelledby="venue-filter-state-label">
            <button
              type="button"
              className={statusFilter === "all" ? "is-on" : undefined}
              aria-pressed={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            >
              Todas
            </button>
            {verifiedCount > 0 ? (
              <button
                type="button"
                className={statusFilter === "verified" ? "is-on" : undefined}
                aria-pressed={statusFilter === "verified"}
                onClick={() => setStatusFilter("verified")}
              >
                Verificadas ({verifiedCount})
              </button>
            ) : null}
            {premiumCount > 0 ? (
              <button
                type="button"
                className={statusFilter === "premium" ? "is-on" : undefined}
                aria-pressed={statusFilter === "premium"}
                onClick={() => setStatusFilter("premium")}
              >
                Solo premium ({premiumCount})
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {availableSports.length > 1 ? (
        <div className="venue-filter-row">
          <span className="venue-filter-label" id="venue-filter-sport-label">
            Deporte
          </span>
          <div
            className="filter-chips filter-chips-sport"
            role="group"
            aria-labelledby="venue-filter-sport-label"
          >
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
        </div>
      ) : null}

      {neighborhoods.length > 1 ? (
        <div className="venue-filter-row venue-filter-row-select">
          <label className="venue-filter-label" htmlFor="venue-neighborhood">
            Barrio
          </label>
          <div className="venue-filter-select">
            <select
              id="venue-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              autoComplete="off"
            >
              <option value="all">Todos los barrios</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="venue-directory">
      <div className="venue-toolbar">
        <label className="venue-search">
          <span className="venue-filter-label" id="venue-search-label">
            Buscar
          </span>
          <input
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            placeholder="Nombre, barrio o dirección…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-labelledby="venue-search-label"
            aria-controls="venue-list"
          />
        </label>

        <div className="venue-filter-row venue-sort-row">
          <span className="venue-filter-label" id="venue-sort-label">Orden</span>
          <div className="filter-chips" role="group" aria-labelledby="venue-sort-label">
            {([["relevancia", "Relevancia"], ["az", "A-Z"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={sort === value ? "is-on" : undefined}
                aria-pressed={sort === value}
                onClick={() => handleSortChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isDesktop ? filterControls : null}

        <div className="venue-toolbar-meta">
          <p className="venue-count" aria-live="polite">
            <span className="venue-count-num">{filtered.length}</span>
            <span className="venue-count-sep"> de </span>
            <span className="venue-count-total">{venues.length}</span>
            <span className="venue-count-unit"> canchas</span>
          </p>

          {!isDesktop ? (
            <>
              <button
                type="button"
                className="btn-ghost venue-filters-trigger"
                aria-expanded={filtersOpen}
                aria-haspopup="dialog"
                onClick={() => setFiltersOpen(true)}
              >
                Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
              </button>
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
            </>
          ) : null}
        </div>
      </div>

      {!isDesktop && filtersOpen ? (
        <div
          className="venue-filters-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros de canchas"
        >
          <div className="venue-filters-sheet">
            <div className="venue-filters-sheet-head">
              <h2>Filtros</h2>
              <button type="button" className="btn-ghost" onClick={() => setFiltersOpen(false)}>
                Cerrar
              </button>
            </div>
            {filterControls}
            <p className="venue-count venue-count-drawer" aria-live="polite">
              {filtered.length} de {venues.length} canchas
            </p>
            <button type="button" className="btn-flood" onClick={() => setFiltersOpen(false)}>
              Ver {filtered.length} canchas
            </button>
          </div>
        </div>
      ) : null}

      <div className={`venue-layout${showMap && showList ? " has-both" : ""}`}>
        {showList ? (
          <div className="venue-panel-list">
            {premiumRail.length > 0 ? (
              <section className="venue-premium-rail" aria-labelledby="venue-premium-rail-title">
                <h2 className="venue-premium-rail-title" id="venue-premium-rail-title">
                  Premium
                  <span className="venue-group-count">{premiumRail.length}</span>
                </h2>
                <ul className="venue-premium-rail-list">
                  {premiumRail.map((venue) => (
                    <li key={venue.id}>
                      <VenueListLink
                        venue={venue}
                        demand={demandByVenueId[venue.id]}
                        onActivate={() => setFocusId(venue.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

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
                            <VenueListLink
                              venue={venue}
                              demand={demandByVenueId[venue.id]}
                              onActivate={() => setFocusId(venue.id)}
                            />
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
                            <VenueListLink
                              venue={venue}
                              demand={demandByVenueId[venue.id]}
                              onActivate={() => setFocusId(venue.id)}
                            />
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
