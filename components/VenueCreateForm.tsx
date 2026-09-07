"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sportLabel } from "@/lib/labels";
import { SPORTS, type Sport } from "@/lib/sport-rules";
import { VenueLocationPicker } from "@/components/VenueLocationPicker";
import {
  KIND_OPTIONS,
  SURFACE_OPTIONS,
  parseCoordinate,
  validateVenueFields,
} from "@/lib/venue-edit";

type VenueCreateFormProps = {
  cityId: string;
  cityName: string;
  cityCenter: { lat: number; lng: number };
};

export function VenueCreateForm({ cityId, cityName, cityCenter }: VenueCreateFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [sports, setSports] = useState<Sport[]>(["futbol"]);
  const [surface, setSurface] = useState("sintetica");
  const [covered, setCovered] = useState<"" | "true" | "false">("");
  const [kind, setKind] = useState("alquiler");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const latN = parseCoordinate(lat);
    const lngN = parseCoordinate(lng);
    if (latN == null || lngN == null) {
      setError("Faltan las coordenadas (lat, long). Copialas desde Google Maps.");
      return;
    }
    const check = validateVenueFields({ name, phone: "", website: "", notes, lat: latN, lng: lngN, sports });
    if ("error" in check) {
      setError(check.error);
      return;
    }
    if (name.trim().length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { data: createdId, error: rpcError } = await supabase.rpc("create_venue", {
      p_city_id: cityId,
      p_name: name.trim(),
      p_neighborhood: neighborhood.trim() || undefined,
      p_address: address.trim() || undefined,
      p_lat: latN,
      p_lng: lngN,
      p_sports: sports,
      p_surface: surface,
      p_covered: covered === "true" ? true : covered === "false" ? false : null,
      p_venue_kind: kind,
      p_notes: notes.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }

    // El slug real (con sufijo anti-colisión) lo genera la BD: se lo pedimos por id.
    let slug: string | null = null;
    if (createdId) {
      const { data: row } = await supabase.from("venues").select("slug").eq("id", createdId).maybeSingle();
      slug = row?.slug ?? null;
    }
    setCreatedSlug(
      slug ??
        name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, ""),
    );
    setPending(false);
    router.refresh();
  }

  if (createdSlug) {
    return (
      <div className="venue-claim-pending" role="status">
        <h3 className="subhead">Cancha creada</h3>
        <p>
          <strong>{name}</strong> ya está en el directorio de {cityName}.
        </p>
        <div className="empty-home-actions">
          <Link href={`/canchas/${createdSlug}`} className="btn-flood">
            Ver la ficha
          </Link>
          <button
            type="button"
            className="btn-ghost empty-home-ghost"
            onClick={() => {
              setCreatedSlug(null);
              setName("");
              setNeighborhood("");
              setAddress("");
              setLat("");
              setLng("");
              setNotes("");
            }}
          >
            Crear otra
          </button>
        </div>
        <p className="field-help">
          Si el link no abre, buscala en el directorio: el slug puede tener un sufijo por
          duplicados.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack-form venue-claim-form">
      <div className="venue-edit-grid">
        <label className="venue-edit-field">
          <span>Nombre *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
        </label>
        <label className="venue-edit-field">
          <span>Barrio</span>
          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={120} />
        </label>
        <label className="venue-edit-field venue-edit-wide">
          <span>Dirección</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={240} />
        </label>
        <div className="venue-edit-field venue-edit-wide">
          <span>Ubicación de la cancha *</span>
          <VenueLocationPicker
            latStr={lat}
            lngStr={lng}
            onCoordsChange={(nextLat, nextLng) => {
              setLat(nextLat);
              setLng(nextLng);
            }}
            center={cityCenter}
          />
        </div>
        <fieldset className="venue-edit-field venue-edit-wide">
          <legend>Deportes *</legend>
          <div className="venue-edit-chips">
            {SPORTS.map((sport) => (
              <label key={sport} className="venue-edit-chip">
                <input
                  type="checkbox"
                  checked={sports.includes(sport)}
                  onChange={() =>
                    setSports((prev) =>
                      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
                    )
                  }
                />
                {sportLabel[sport]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="venue-edit-field">
          <span>Superficie</span>
          <select value={surface} onChange={(e) => setSurface(e.target.value)}>
            {SURFACE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="venue-edit-field">
          <span>Tipo</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="venue-edit-field">
          <span>¿Techada?</span>
          <select value={covered} onChange={(e) => setCovered(e.target.value as "" | "true" | "false")}>
            <option value="">Sin dato</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
        <label className="venue-edit-field venue-edit-wide">
          <span>Nota (máx. 500)</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </label>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="venue-edit-actions">
        <button type="submit" className="btn-flood" disabled={pending} aria-busy={pending}>
          {pending ? "Creando…" : "Crear cancha"}
        </button>
        <Link href="/admin/venues" className="btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
