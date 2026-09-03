"use client";

import { useId, useMemo, useState } from "react";
import type { Venue } from "@/lib/types";

export function VenuePicker({
  venues,
  defaultVenueId,
  emptyHint = "Ninguna cancha coincide. Borra la búsqueda.",
  invalid = false,
  onVenueChange,
}: {
  venues: Venue[];
  defaultVenueId?: string;
  emptyHint?: string;
  invalid?: boolean;
  onVenueChange?: (venueId: string) => void;
}) {
  const searchId = useId();
  const listId = useId();
  const helpId = useId();
  const errorId = useId();

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(() =>
    defaultVenueId && venues.some((v) => v.id === defaultVenueId) ? defaultVenueId : "",
  );

  const effectiveSelected =
    selected && venues.some((v) => v.id === selected)
      ? selected
      : defaultVenueId && venues.some((v) => v.id === defaultVenueId)
        ? defaultVenueId
        : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter((v) => {
      const hay = `${v.name} ${v.neighborhood ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [venues, query]);

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

  const selectedVenue = venues.find((v) => v.id === effectiveSelected);
  const showEmpty = venues.length === 0 || filtered.length === 0;
  const emptyMessage = venues.length === 0 ? emptyHint : "Ninguna cancha coincide. Borra la búsqueda.";

  function selectVenue(id: string) {
    setSelected(id);
    onVenueChange?.(id);
  }

  return (
    <div className={`venue-picker${invalid ? " is-invalid" : ""}`}>
      <div className="venue-picker-head">
        <label htmlFor={searchId}>
          Cancha <span className="req-mark" aria-hidden="true">
            *
          </span>
        </label>
        <p className="field-help" id={helpId}>
          Busca por nombre o barrio y elige dónde se juega.
        </p>
        <input
          id={searchId}
          type="search"
          placeholder={venues.length ? `Buscar entre ${venues.length} canchas…` : "Sin canchas para este deporte"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-controls={listId}
          aria-describedby={`${helpId}${showEmpty || invalid ? ` ${errorId}` : ""}`}
          disabled={venues.length === 0}
          autoComplete="off"
        />
      </div>

      {selectedVenue ? (
        <p className="venue-picker-chosen" aria-live="polite">
          Seleccionada: <strong>{selectedVenue.name}</strong>
          {selectedVenue.neighborhood ? (
            <span className="venue-picker-chosen-meta"> · {selectedVenue.neighborhood}</span>
          ) : null}
        </p>
      ) : null}

      <div
        id={listId}
        className="venue-picker-list"
        role="radiogroup"
        aria-label="Canchas disponibles"
        aria-required="true"
        aria-invalid={invalid || undefined}
      >
        {grouped.map(([barrio, list]) => (
          <div key={barrio} className="venue-picker-group">
            <p className="venue-picker-group-label">{barrio}</p>
            <ul className="venue-picker-options">
              {list.map((venue) => {
                const isOn = venue.id === effectiveSelected;
                const optionId = `${listId}-${venue.id}`;
                return (
                  <li key={venue.id}>
                    <label
                      htmlFor={optionId}
                      className={isOn ? "venue-picker-option is-on" : "venue-picker-option"}
                    >
                      <input
                        id={optionId}
                        type="radio"
                        name="venue_id"
                        value={venue.id}
                        checked={isOn}
                        required={!effectiveSelected}
                        disabled={venues.length === 0}
                        onChange={() => selectVenue(venue.id)}
                      />
                      <span className="venue-picker-option-text">
                        <span className="venue-picker-option-name">{venue.name}</span>
                        {venue.neighborhood ? (
                          <span className="venue-picker-option-meta">{venue.neighborhood}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Keep venue_id when the selected cancha is filtered out of the list */}
      {effectiveSelected && !filtered.some((v) => v.id === effectiveSelected) ? (
        <input
          className="venue-picker-native"
          type="radio"
          name="venue_id"
          value={effectiveSelected}
          checked
          readOnly
          required
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}

      {showEmpty || invalid ? (
        <p className="form-error" role="status" id={errorId}>
          {showEmpty ? emptyMessage : "Elige una cancha para continuar."}
        </p>
      ) : null}
    </div>
  );
}
