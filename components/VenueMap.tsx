"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Venue } from "@/lib/types";

export function VenueMap({
  venues,
  center,
  focusId,
}: {
  venues: Venue[];
  center: { lat: number; lng: number };
  focusId?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: root.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap",
          },
        },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center: [center.lng, center.lat],
      zoom: focusId ? 14 : 12,
      attributionControl: { compact: true },
    });

    const markers = venues.map((venue) => {
      const el = document.createElement("a");
      el.href = `/canchas/${venue.slug}`;
      el.className = venue.id === focusId ? "map-pin is-focus" : "map-pin";
      el.title = venue.name;
      el.setAttribute("aria-label", venue.name);
      return new maplibregl.Marker({ element: el }).setLngLat([venue.lng, venue.lat]).addTo(map);
    });

    if (focusId) {
      const focused = venues.find((v) => v.id === focusId);
      if (focused) {
        map.flyTo({ center: [focused.lng, focused.lat], zoom: 14, duration: 600 });
      }
    }

    return () => {
      markers.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [venues, center.lat, center.lng, focusId]);

  return <div ref={root} className="venue-map" />;
}
