"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type PickerCoords = { lat: number; lng: number } | null;

type VenueLocationMapProps = {
  center: { lat: number; lng: number };
  coords: PickerCoords;
  onPick: (lat: number, lng: number) => void;
};

function sameCoords(a: PickerCoords, lat: number, lng: number) {
  return a != null && Math.abs(a.lat - lat) < 1e-6 && Math.abs(a.lng - lng) < 1e-6;
}

/**
 * Mapa interactivo para ubicar una cancha: click para soltar el pin,
 * arrastrarlo para afinar. Solo cliente (MapLibre), se carga vía dynamic().
 */
export function VenueLocationMap({ center, coords, onPick }: VenueLocationMapProps) {
  const root = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const coordsRef = useRef<PickerCoords>(coords);
  const onPickRef = useRef(onPick);

  useEffect(() => {
    coordsRef.current = coords;
    onPickRef.current = onPick;
  }, [coords, onPick]);

  useEffect(() => {
    if (!root.current) return;

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
      center: coords
        ? [coords.lng, coords.lat]
        : [center.lng, center.lat],
      zoom: coords ? 16 : 13,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "top-right");

    map.on("load", () => {
      const marker = new maplibregl.Marker({ draggable: true, anchor: "bottom" })
        .setLngLat(coordsRef.current ? [coordsRef.current.lng, coordsRef.current.lat] : [center.lng, center.lat])
        .addTo(map);
      if (!coordsRef.current) {
        marker.getElement().style.opacity = "0.55";
      }
      markerRef.current = marker;

      marker.on("dragend", () => {
        const { lng, lat } = marker.getLngLat();
        marker.getElement().style.opacity = "1";
        onPickRef.current(Number(lat.toFixed(6)), Number(lng.toFixed(6)));
      });
    });

    map.on("click", (e) => {
      const marker = markerRef.current;
      if (!marker) return;
      marker.setLngLat(e.lngLat);
      marker.getElement().style.opacity = "1";
      onPickRef.current(Number(e.lngLat.lat.toFixed(6)), Number(e.lngLat.lng.toFixed(6)));
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // center/coords iniciales intencionales: las actualizaciones van por el otro effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng]);

  // Sincronizar pin desde el formulario (tecleo, geolocalización o paste).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !coords) return;
    const { lng, lat } = marker.getLngLat();
    if (sameCoords({ lat, lng }, coords.lat, coords.lng)) return;
    marker.setLngLat([coords.lng, coords.lat]);
    marker.getElement().style.opacity = "1";
    // Volar al pin solo cuando la coordenada cambió lejos de la vista actual.
    const centerOfMap = map.getCenter();
    if (
      Math.abs(centerOfMap.lat - coords.lat) > 0.02 ||
      Math.abs(centerOfMap.lng - coords.lng) > 0.02
    ) {
      map.easeTo({ center: [coords.lng, coords.lat], zoom: Math.max(map.getZoom(), 14) });
    }
  }, [coords]);

  return (
    <div
      ref={root}
      className="venue-loc-map"
      role="application"
      aria-label="Mapa para ubicar la cancha: tocá o arrastrá el marcador"
    />
  );
}
