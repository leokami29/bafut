"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchRow } from "@/components/MatchRow";
import { SPORTS, type Sport } from "@/lib/constants";
import {
  getMatchTimePeriod,
  isSameCityDay,
  isTonightMatch,
  isWithinNextHours,
  type MatchTimePeriod,
} from "@/lib/datetime";
import { formatDistance, haversineDistance } from "@/lib/geo";
import { levelLabel, sportLabel, timePeriodLabel } from "@/lib/labels";
import { isDeclaredLevel, type DeclaredLevel } from "@/lib/level-trust";
import { matchFitsProfileLevel, selectUpcomingOutsideFilter } from "@/lib/match-feed-filters";
import {
  clearNearMePreference,
  getNearMeServerSnapshot,
  readNearMePreference,
  subscribeNearMe,
  writeNearMePreference,
} from "@/lib/near-me-preference";
import { openSlotCount, type MatchDetail } from "@/lib/types";
import { aggregateVenueDemand, venuesWithDemandCount } from "@/lib/venue-demand";

const PERIOD_ORDER: MatchTimePeriod[] = ["manana", "tarde", "noche"];

type TimeFilter = "3h" | "hoy" | "noche";

function hasOpenSlot(match: MatchDetail) {
  return openSlotCount(match) > 0;
}

function parseTimeFilter(raw: string | null): TimeFilter {
  if (raw === "3h" || raw === "noche") return raw;
  return "hoy";
}

function partidosCountLabel(count: number, timeFilter: TimeFilter, sport: Sport | "all") {
  const noun = count === 1 ? "partido" : "partidos";
  const parts: string[] = [`${count} ${noun}`];

  if (timeFilter === "3h") parts.push("en 3 h");
  else if (timeFilter === "noche") parts.push("esta noche");
  else if (sport === "all") parts.push("hoy");

  if (sport !== "all") parts.push(sportLabel[sport]);

  return parts.join(" · ");
}

function emptyCopy(
  timeFilter: TimeFilter,
  sportFilter: Sport | "all",
  myLevelOnly: boolean,
  profileLevel: DeclaredLevel | null,
) {
  if (myLevelOnly && profileLevel) {
    const nivel = levelLabel[profileLevel].toLowerCase();
    if (timeFilter === "3h") {
      return `No hay cupos de tu nivel (${nivel}) o abiertos a cualquiera en las próximas 3 horas.`;
    }
    if (timeFilter === "noche") {
      return `No hay cupos de tu nivel (${nivel}) o abiertos a cualquiera para esta noche.`;
    }
    if (sportFilter !== "all") {
      return `No hay ${sportLabel[sportFilter]} con cupos de tu nivel (${nivel}) o abiertos a cualquiera hoy.`;
    }
    return `No hay cupos de tu nivel (${nivel}) o abiertos a cualquiera hoy.`;
  }
  if (timeFilter === "3h") {
    return sportFilter !== "all"
      ? `No hay ${sportLabel[sportFilter]} con cupos en las próximas 3 horas.`
      : "No hay huecos en las próximas 3 horas. Mirá el resto del día o publicá uno.";
  }
  if (timeFilter === "noche") {
    return "Nadie publicó huecos para esta noche. Sé el primero y armá la pateada.";
  }
  if (sportFilter !== "all") {
    return `No hay partidos de ${sportLabel[sportFilter]} con cupos abiertos hoy.`;
  }
  return "Nadie publicó huecos para hoy todavía. Armá la pateada y abrí la lista.";
}

function groupByPeriod(matches: MatchDetail[], timezone: string) {
  const groups = new Map<MatchTimePeriod, MatchDetail[]>();
  for (const match of matches) {
    const period = getMatchTimePeriod(match.starts_at, timezone);
    const list = groups.get(period) ?? [];
    list.push(match);
    groups.set(period, list);
  }
  return PERIOD_ORDER.filter((period) => groups.has(period)).map((period) => ({
    period,
    matches: groups.get(period)!,
  }));
}

function MatchList({ matches, label }: { matches: MatchDetail[]; label: string }) {
  return (
    <ul className="roster" aria-label={label}>
      {matches.map((match) => (
        <li key={match.id}>
          <MatchRow match={match} />
        </li>
      ))}
    </ul>
  );
}

export function MatchFeed({
  matches,
  timezone,
  cityName,
  profileLevel = null,
}: {
  matches: MatchDetail[];
  timezone: string;
  cityName: string;
  profileLevel?: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const timeFilter = parseTimeFilter(params.get("filtro"));
  const resolvedLevel = isDeclaredLevel(profileLevel) ? profileLevel : null;
  const [sportFilter, setSportFilter] = useState<Sport | "all">("all");
  const [myLevelOnly, setMyLevelOnly] = useState(false);
  const nearMe = useSyncExternalStore(subscribeNearMe, readNearMePreference, getNearMeServerSnapshot);
  const userLocation = useMemo(
    () => (nearMe ? { lat: nearMe.lat, lng: nearMe.lng } : null),
    [nearMe],
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (!readNearMePreference() || !navigator.geolocation) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        writeNearMePreference(position.coords.latitude, position.coords.longitude);
      },
      () => {
        /* Mantener coords guardadas si el refresh falla. */
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        writeNearMePreference(position.coords.latitude, position.coords.longitude);
        setGeoLoading(false);
      },
      (error) => {
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? "No pudimos acceder a tu ubicación. Revisá los permisos."
            : "No se pudo obtener tu ubicación.",
        );
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }, []);

  const clearLocation = useCallback(() => {
    setGeoError(null);
    clearNearMePreference();
  }, []);

  const open = useMemo(() => matches.filter(hasOpenSlot), [matches]);
  const canchasConHuecos = useMemo(
    () => venuesWithDemandCount(aggregateVenueDemand(matches, timezone)),
    [matches, timezone],
  );

  const timeFiltered = useMemo(() => {
    if (timeFilter === "3h") {
      return open.filter((match) => isWithinNextHours(match.starts_at, 3));
    }
    if (timeFilter === "noche") {
      return open.filter((match) => isTonightMatch(match.starts_at, timezone));
    }
    return open.filter((match) => isSameCityDay(match.starts_at, timezone));
  }, [open, timeFilter, timezone]);

  const levelFiltered = useMemo(() => {
    if (!myLevelOnly || !resolvedLevel) return timeFiltered;
    return timeFiltered.filter((match) => matchFitsProfileLevel(match, resolvedLevel));
  }, [timeFiltered, myLevelOnly, resolvedLevel]);

  const availableSports = useMemo(() => {
    const set = new Set<Sport>();
    for (const match of levelFiltered) {
      if (SPORTS.includes(match.sport as Sport)) set.add(match.sport as Sport);
    }
    return SPORTS.filter((sport) => set.has(sport));
  }, [levelFiltered]);

  const shown = useMemo(() => {
    const filtered =
      sportFilter === "all"
        ? levelFiltered
        : levelFiltered.filter((match) => match.sport === sportFilter);
    if (!userLocation) return filtered;
    return [...filtered].sort((a, b) => {
      const distA = haversineDistance(userLocation.lat, userLocation.lng, a.venues.lat, a.venues.lng);
      const distB = haversineDistance(userLocation.lat, userLocation.lng, b.venues.lat, b.venues.lng);
      return distA - distB;
    });
  }, [levelFiltered, sportFilter, userLocation]);

  const upcomingFallback = useMemo(() => {
    const outside = selectUpcomingOutsideFilter(open, timeFiltered, timeFilter);
    const byLevel =
      myLevelOnly && resolvedLevel
        ? outside.filter((match) => matchFitsProfileLevel(match, resolvedLevel))
        : outside;
    return sportFilter === "all"
      ? byLevel
      : byLevel.filter((match) => match.sport === sportFilter);
  }, [open, timeFiltered, timeFilter, myLevelOnly, resolvedLevel, sportFilter]);

  const groups = useMemo(() => {
    if (timeFilter !== "hoy" || shown.length < 2) return null;
    const grouped = groupByPeriod(shown, timezone);
    return grouped.length > 1 ? grouped : null;
  }, [shown, timeFilter, timezone]);

  function setTimeFilter(next: TimeFilter) {
    setSportFilter("all");
    const url = next === "hoy" ? "/partidos?filtro=hoy" : `/partidos?filtro=${next}`;
    router.push(url);
  }

  const countLabel = partidosCountLabel(shown.length, timeFilter, sportFilter);
  const showSportFilters = availableSports.length > 1;

  return (
    <>
      <div className="partidos-toolbar">
        <div className="partidos-toolbar-filters">
          <div className="filter-chips" role="group" aria-label="Cuándo jugar">
            <button
              type="button"
              className={timeFilter === "3h" ? "is-on" : undefined}
              aria-pressed={timeFilter === "3h"}
              onClick={() => setTimeFilter("3h")}
            >
              En 3 h
            </button>
            <button
              type="button"
              className={timeFilter === "hoy" ? "is-on" : undefined}
              aria-pressed={timeFilter === "hoy"}
              onClick={() => setTimeFilter("hoy")}
            >
              Hoy
            </button>
            <button
              type="button"
              className={timeFilter === "noche" ? "is-on" : undefined}
              aria-pressed={timeFilter === "noche"}
              onClick={() => setTimeFilter("noche")}
            >
              Esta noche
            </button>
          </div>

          {showSportFilters ? (
            <div className="filter-chips filter-chips-sport" role="group" aria-label="Deporte">
              <button
                type="button"
                className={sportFilter === "all" ? "is-on" : undefined}
                aria-pressed={sportFilter === "all"}
                onClick={() => setSportFilter("all")}
              >
                Todos
              </button>
              {availableSports.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  className={sportFilter === sport ? "is-on" : undefined}
                  aria-pressed={sportFilter === sport}
                  onClick={() => setSportFilter(sport)}
                >
                  {sportLabel[sport]}
                </button>
              ))}
            </div>
          ) : null}

          <div className="filter-chips filter-chips-location" role="group" aria-label="Cercanía y nivel">
            {userLocation ? (
              <button
                type="button"
                className="is-on"
                aria-pressed={true}
                onClick={clearLocation}
                title="Desactivar cercanía"
              >
                Cerca de ti ✕
              </button>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                disabled={geoLoading}
                title="Ordenar por distancia. La ubicación queda en este dispositivo."
              >
                {geoLoading ? "Buscando…" : "Cerca de mí"}
              </button>
            )}
            {resolvedLevel ? (
              <button
                type="button"
                className={myLevelOnly ? "is-on" : undefined}
                aria-pressed={myLevelOnly}
                onClick={() => setMyLevelOnly((on) => !on)}
                title={`Cupos abiertos a cualquiera o nivel ${levelLabel[resolvedLevel].toLowerCase()}`}
              >
                Mi nivel
              </button>
            ) : null}
          </div>
        </div>

        {geoError ? (
          <p className="partidos-geo-error">{geoError}</p>
        ) : null}
        {userLocation && !geoError ? (
          <p className="partidos-geo-hint">
            Ubicación guardada solo en este dispositivo para ordenar por cercanía.
          </p>
        ) : null}

        <p className="partidos-count" aria-live="polite">
          {countLabel}
          {myLevelOnly && resolvedLevel ? (
            <span className="partidos-count-level">
              {" · "}
              Mi nivel ({levelLabel[resolvedLevel].toLowerCase()})
            </span>
          ) : null}
          {userLocation && shown.length > 0 ? (
            <span className="partidos-count-distance">
              {" · "}
              Más cercano: {formatDistance(
                haversineDistance(
                  userLocation.lat,
                  userLocation.lng,
                  shown[0].venues.lat,
                  shown[0].venues.lng,
                ),
              )}
            </span>
          ) : null}
        </p>
      </div>

      {shown.length > 0 ? (
        groups ? (
          <div className="match-groups">
            {groups.map(({ period, matches: periodMatches }) => (
              <section key={period} className="match-group" aria-labelledby={`period-${period}`}>
                <h2 className="match-group-title" id={`period-${period}`}>
                  {timePeriodLabel[period]}
                  <span className="match-group-count">{periodMatches.length}</span>
                </h2>
                <MatchList
                  matches={periodMatches}
                  label={`${periodMatches.length} partidos ${timePeriodLabel[period].toLowerCase()}`}
                />
              </section>
            ))}
          </div>
        ) : (
          <MatchList matches={shown} label={countLabel} />
        )
      ) : (
        <div className="empty empty-partidos">
          <p className="empty-title">No hay cupos abiertos</p>
          <p>{emptyCopy(timeFilter, sportFilter, myLevelOnly, resolvedLevel)}</p>
          <div className="empty-actions">
            <Link className="btn-flood" href="/partidos/nuevo">
              Publicar hueco
            </Link>
            <Link className="text-link" href="/canchas">
              {canchasConHuecos > 0
                ? `${canchasConHuecos} canchas sintéticas con huecos`
                : `Canchas sintéticas en ${cityName}`}
            </Link>
          </div>
        </div>
      )}

      {upcomingFallback.length > 0 ? (
        <section className="match-group match-group-proximos" aria-labelledby="proximos-heading">
          <h2 className="match-group-title" id="proximos-heading">
            Próximos
            <span className="match-group-count">{upcomingFallback.length}</span>
          </h2>
          <p className="match-group-lede">Huecos más adelante, fuera de este filtro.</p>
          <MatchList matches={upcomingFallback} label={`${upcomingFallback.length} partidos próximos`} />
        </section>
      ) : null}
    </>
  );
}
