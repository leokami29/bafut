"use client";

import { useMemo, useState } from "react";
import type { Venue } from "@/lib/types";

export function VenuePicker({
  venues,
  defaultVenueId,
}: {
  venues: Venue[];
  defaultVenueId?: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(defaultVenueId ?? "");

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

  return (
    <div className="venue-picker">
      <label>
        Cancha
        <input
          type="search"
          placeholder={`Buscar entre ${venues.length} canchas…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-controls="venue-picker-select"
        />
      </label>
      <select
        id="venue-picker-select"
        name="venue_id"
        required
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        size={Math.min(8, Math.max(4, grouped.reduce((n, [, list]) => n + list.length, 0)))}
      >
        <option value="" disabled>
          Elige dónde van a jugar
        </option>
        {grouped.map(([barrio, list]) => (
          <optgroup key={barrio} label={barrio}>
            {list.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {filtered.length === 0 ? (
        <p className="form-error" role="status">
          Ninguna cancha coincide. Borra la búsqueda.
        </p>
      ) : null}
    </div>
  );
}
