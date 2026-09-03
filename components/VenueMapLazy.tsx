"use client";

import dynamic from "next/dynamic";

export const VenueMapLazy = dynamic(
  () => import("@/components/VenueMap").then((mod) => mod.VenueMap),
  {
    ssr: false,
    loading: () => (
      <div className="venue-map venue-map-loading" role="status" aria-label="Cargando mapa de canchas">
        Cargando mapa…
      </div>
    ),
  },
);
