"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Venue } from "@/lib/types";

type FeatureProps = { id: string; slug: string; name: string };

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
  const router = useRouter();

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
      zoom: focusId ? 14 : 11.5,
      attributionControl: { compact: true },
    });

    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point, FeatureProps> = {
      type: "FeatureCollection",
      features: venues.map((venue) => ({
        type: "Feature",
        properties: { id: venue.id, slug: venue.slug, name: venue.name },
        geometry: { type: "Point", coordinates: [venue.lng, venue.lat] },
      })),
    };

    map.on("load", () => {
      map.addSource("venues", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "venues",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#0C6B4C",
          "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 25, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#F4F7F2",
        },
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "venues",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 13,
        },
        paint: {
          "text-color": "#F4F7F2",
        },
      });

      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "venues",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "id"], focusId ?? ""],
            "#E8F56A",
            "#F4F7F2",
          ],
          "circle-radius": ["case", ["==", ["get", "id"], focusId ?? ""], 9, 7],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#0C6B4C",
        },
      });

      map.on("click", "clusters", (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
        const clusterId = features[0]?.properties?.cluster_id as number | undefined;
        const source = map.getSource("venues") as maplibregl.GeoJSONSource;
        if (clusterId == null) return;
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          const coords = (features[0]?.geometry as GeoJSON.Point).coordinates as [number, number];
          map.easeTo({ center: coords, zoom });
        });
      });

      map.on("click", "unclustered", (e) => {
        const slug = e.features?.[0]?.properties?.slug;
        if (typeof slug === "string") {
          router.push(`/canchas/${slug}`);
        }
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    if (focusId) {
      const focused = venues.find((v) => v.id === focusId);
      if (focused) {
        map.flyTo({ center: [focused.lng, focused.lat], zoom: 14, duration: 600 });
      }
    }

    return () => {
      map.remove();
    };
  }, [venues, center.lat, center.lng, focusId, router]);

  return <div ref={root} className="venue-map" />;
}
