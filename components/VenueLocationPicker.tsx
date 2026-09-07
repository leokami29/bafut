"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { parseCoordinate, parsePastedCoords } from "@/lib/venue-edit";
import type { PickerCoords } from "@/components/VenueLocationMap";

const VenueLocationMap = dynamic(
  () => import("@/components/VenueLocationMap").then((m) => m.VenueLocationMap),
  {
    ssr: false,
    loading: () => (
      <div className="venue-loc-map venue-loc-map-loading" role="status">
        Cargando mapa…
      </div>
    ),
  },
);

function toCoords(latStr: string, lngStr: string): PickerCoords {
  const lat = parseCoordinate(latStr);
  const lng = parseCoordinate(lngStr);
  if (lat == null || lng == null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

type VenueLocationPickerProps = {
  latStr: string;
  lngStr: string;
  onCoordsChange: (latStr: string, lngStr: string) => void;
  center: { lat: number; lng: number };
  labelId?: string;
};

export function VenueLocationPicker({
  latStr,
  lngStr,
  onCoordsChange,
  center,
  labelId,
}: VenueLocationPickerProps) {
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const coords = toCoords(latStr, lngStr);

  function applyPaste() {
    const parsed = parsePastedCoords(paste);
    if (!parsed) {
      setPasteError("Pegá algo como “10.96854, -74.78132”.");
      return;
    }
    setPasteError(null);
    onCoordsChange(String(parsed.lat), String(parsed.lng));
  }

  function useMyLocation() {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoordsChange(
          pos.coords.latitude.toFixed(6),
          pos.coords.longitude.toFixed(6),
        );
        setGeoBusy(false);
      },
      () => {
        setGeoError("No pudimos leer tu ubicación. Revisá los permisos del navegador.");
        setGeoBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="venue-loc-picker" id={labelId ? `${labelId}-picker` : undefined}>
      <p className="venue-loc-hint">
        {coords
          ? "Tocá el mapa o arrastrá el pin para ajustar. Las coordenadas se actualizan solas."
          : "Tocá el mapa donde está la cancha — o usá alguno de los atajos de abajo."}
      </p>
      <VenueLocationMap
        center={coords ?? center}
        coords={coords}
        onPick={(lat, lng) => onCoordsChange(String(lat), String(lng))}
      />
      <div className="venue-loc-tools">
        <button
          type="button"
          className="btn-ghost venue-loc-btn"
          onClick={useMyLocation}
          disabled={geoBusy}
        >
          {geoBusy ? "Leyendo GPS…" : "Usar mi ubicación"}
        </button>
        <span className="venue-loc-paste" aria-label="Pegar coordenadas copiadas de Google Maps">
          <input
            type="text"
            inputMode="decimal"
            placeholder="Pegar: 10.96854, -74.78132"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyPaste();
              }
            }}
          />
          <button type="button" className="btn-ghost venue-loc-btn" onClick={applyPaste}>
            Aplicar
          </button>
        </span>
      </div>
      {geoError ? <p className="form-error">{geoError}</p> : null}
      {pasteError ? <p className="form-error">{pasteError}</p> : null}
      <div className="venue-loc-fine">
        <label>
          <span>Latitud</span>
          <input
            value={latStr}
            onChange={(e) => onCoordsChange(e.target.value, lngStr)}
            inputMode="decimal"
            placeholder="10.96854"
            aria-invalid={coords == null && latStr.trim() !== "" ? "true" : undefined}
          />
        </label>
        <label>
          <span>Longitud</span>
          <input
            value={lngStr}
            onChange={(e) => onCoordsChange(latStr, e.target.value)}
            inputMode="decimal"
            placeholder="-74.78132"
            aria-invalid={coords == null && lngStr.trim() !== "" ? "true" : undefined}
          />
        </label>
      </div>
    </div>
  );
}
