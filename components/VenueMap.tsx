"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Venue, VenueWithPremium } from "@/lib/types";

function isPremium(venue: Venue | VenueWithPremium) {
  return "is_premium" in venue && venue.is_premium;
}

function placeMarkers(
  map: maplibregl.Map,
  venues: Array<Venue | VenueWithPremium>,
  focusId: string | undefined,
  onOpen: (slug: string) => void,
) {
  const markers: maplibregl.Marker[] = [];
  for (const venue of venues) {
    if (!Number.isFinite(venue.lng) || !Number.isFinite(venue.lat)) continue;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "venue-map-dot";
    if (isPremium(venue)) el.classList.add("is-premium");
    else if (venue.is_verified) el.classList.add("is-verified");
    if (focusId === venue.id) el.classList.add("is-focus");
    el.setAttribute("aria-label", venue.name);
    el.dataset.venueId = venue.id;
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      onOpen(venue.slug);
    });
    markers.push(
      new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map),
    );
  }
  return markers;
}

export function VenueMap({
  venues,
  center,
  focusId,
  navigateOnClick = true,
}: {
  venues: Array<Venue | VenueWithPremium>;
  center: { lat: number; lng: number };
  focusId?: string;
  navigateOnClick?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const loadedRef = useRef(false);
  const venuesRef = useRef(venues);
  const focusRef = useRef(focusId);
  const navigateRef = useRef(navigateOnClick);
  const router = useRouter();
  const routerRef = useRef(router);

  venuesRef.current = venues;
  focusRef.current = focusId;
  navigateRef.current = navigateOnClick;
  routerRef.current = router;

  useEffect(() => {
    const container = root.current;
    if (!container) {
      return;
    }

    const map = new maplibregl.Map({
      container,
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
      zoom: focusRef.current ? 14 : 11.5,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    const refreshMarkers = () => {
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = placeMarkers(map, venuesRef.current, focusRef.current, (slug) => {
        if (!navigateRef.current) return;
        routerRef.current.push(`/canchas/${slug}`);
      });
    };

    const ro = new ResizeObserver(() => {
      if (!loadedRef.current) return;
      if (container.clientWidth < 2 || container.clientHeight < 2) return;
      window.requestAnimationFrame(() => {
        if (loadedRef.current) map.resize();
      });
    });

    const start = () => {
      if (loadedRef.current || !map.isStyleLoaded()) return;
      loadedRef.current = true;
      refreshMarkers();
      ro.observe(container);
    };
    map.on("load", start);
    map.on("idle", start);

    return () => {
      loadedRef.current = false;
      ro.disconnect();
      for (const marker of markersRef.current) marker.remove();
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [center.lat, center.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    for (const marker of markersRef.current) marker.remove();
    markersRef.current = placeMarkers(map, venues, focusId, (slug) => {
      if (!navigateRef.current) return;
      routerRef.current.push(`/canchas/${slug}`);
    });
  }, [venues]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loadedRef.current) return;
    for (const marker of markersRef.current) {
      const el = marker.getElement();
      el.classList.toggle("is-focus", el.dataset.venueId === focusId);
    }
    if (!focusId) return;
    const focused = venues.find((venue) => venue.id === focusId);
    if (focused) {
      map.easeTo({ center: [focused.lng, focused.lat], zoom: Math.max(map.getZoom(), 13), duration: 450 });
    }
  }, [focusId, venues]);

  return <div ref={root} className="venue-map" />;
}
