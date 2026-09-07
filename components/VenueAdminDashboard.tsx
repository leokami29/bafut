"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sportLabel } from "@/lib/labels";
import { SPORTS, type Sport } from "@/lib/sport-rules";
import {
  KIND_OPTIONS,
  SURFACE_OPTIONS,
  diffVenueFields,
  validateVenueFields,
  type VenueEditableFields,
} from "@/lib/venue-edit";
import {
  MAX_VENUE_PHOTOS,
  VENUE_PHOTOS_BUCKET,
  validateVenuePhotoUpload,
  venuePhotoObjectPath,
  venuePhotoPublicUrl,
} from "@/lib/venue-photos";
import { isRateLimitError } from "@/lib/rate-limit";
import { VenueLocationPicker } from "@/components/VenueLocationPicker";
import type { Venue } from "@/lib/types";
import {
  VenuePremiumPaywall,
  type VenueSubRequestSummary,
} from "@/components/VenuePremiumPaywall";

type VenuePhotoRow = { id: string; url: string; caption: string | null; sort_order: number };

type ActiveSubscription = {
  id: string;
  plan: string;
  expires_at: string;
  status: string;
} | null;

export type VenueAdminTab = "mesa" | "ficha" | "premium" | "fotos" | "cuenta";

type VenueAdminDashboardProps = {
  venue: Venue;
  photos: VenuePhotoRow[];
  userId: string;
  isAdmin: boolean;
  isOwner: boolean;
  activeSubscription?: ActiveSubscription;
  pendingRequest?: VenueSubRequestSummary | null;
  latestRequest?: VenueSubRequestSummary | null;
  /** Feature flag premium_paywall. */
  premiumPaywallEnabled?: boolean;
  /** Centro de la ciudad activa para el picker de ubicación (fallback: coords actuales). */
  cityCenter?: { lat: number; lng: number };
  /** Sección activa vía ?tab= (default mesa). */
  tab?: VenueAdminTab;
};

type FormState = {
  name: string;
  neighborhood: string;
  address: string;
  phone: string;
  website: string;
  notes: string;
  lat: string;
  lng: string;
  sports: Sport[];
  surface: string;
  covered: "" | "true" | "false";
  venue_kind: string;
};

function toFormState(venue: Venue): FormState {
  return {
    name: venue.name ?? "",
    neighborhood: venue.neighborhood ?? "",
    address: venue.address ?? "",
    phone: venue.phone ?? "",
    website: venue.website ?? "",
    notes: venue.notes ?? "",
    lat: String(venue.lat ?? ""),
    lng: String(venue.lng ?? ""),
    sports: (venue.sports ?? []) as Sport[],
    surface: venue.surface ?? "sintetica",
    covered: venue.covered == null ? "" : venue.covered ? "true" : "false",
    venue_kind: venue.venue_kind ?? "alquiler",
  };
}

function toEditable(state: FormState): VenueEditableFields {
  return {
    name: state.name,
    neighborhood: state.neighborhood,
    address: state.address,
    phone: state.phone,
    website: state.website,
    notes: state.notes,
    lat: Number.parseFloat(state.lat),
    lng: Number.parseFloat(state.lng),
  };
}

function toggleSport(list: Sport[], sport: Sport): Sport[] {
  return list.includes(sport) ? list.filter((s) => s !== sport) : [...list, sport];
}

export function VenueAdminDashboard({
  venue,
  photos: initialPhotos,
  userId,
  isAdmin,
  isOwner,
  activeSubscription = null,
  pendingRequest = null,
  latestRequest = null,
  premiumPaywallEnabled = true,
  cityCenter,
  tab = "mesa",
}: VenueAdminDashboardProps) {
  const router = useRouter();
  const original = useMemo(() => toFormState(venue), [venue]);
  const [form, setForm] = useState<FormState>(original);
  const [photos, setPhotos] = useState<VenuePhotoRow[]>(initialPhotos);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [stats, setStats] = useState<{
    total_matches: number;
    total_slots: number;
    filled_slots: number;
    occupancy_rate: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      const supabase = createClient();
      const { data } = await supabase.rpc("get_venue_stats", { p_venue_id: venue.id });
      if (!cancelled) setStats(data?.[0] ?? null);
    }
    void loadStats();
    return () => {
      cancelled = true;
    };
  }, [venue.id]);

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaveMessage(null);
    setSaveError(null);
  }

  async function submitEdit() {
    setSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    const check = validateVenueFields({ ...toEditable(form), sports: form.sports });
    if ("error" in check) {
      setSaveError(check.error);
      setSaving(false);
      return;
    }

    const supabase = createClient();
    const origEditable = toEditable(original);
    const nextEditable = toEditable(form);
    const changed = new Set(Object.keys(diffVenueFields(origEditable, nextEditable)));
    const hasCoord = !Number.isNaN(nextEditable.lat) && !Number.isNaN(nextEditable.lng);

    const { error } = await supabase.rpc("update_venue", {
      p_venue_id: venue.id,
      p_name: changed.has("name") ? form.name.trim() : undefined,
      p_neighborhood: changed.has("neighborhood") ? form.neighborhood.trim() : undefined,
      p_address: changed.has("address") ? form.address.trim() : undefined,
      p_phone: changed.has("phone") ? form.phone.trim() : undefined,
      p_website: changed.has("website") ? form.website.trim() : undefined,
      p_notes: changed.has("notes") ? form.notes.trim() : undefined,
      p_lat: changed.has("lat") && hasCoord ? nextEditable.lat : undefined,
      p_lng: changed.has("lng") && hasCoord ? nextEditable.lng : undefined,
      p_sports:
        form.sports.join(",") !== original.sports.join(",") && form.sports.length > 0
          ? form.sports
          : undefined,
      p_surface: form.surface !== original.surface ? form.surface : undefined,
      p_venue_kind: form.venue_kind !== original.venue_kind ? form.venue_kind : undefined,
      p_covered:
        form.covered !== original.covered
          ? form.covered === "true"
            ? true
            : form.covered === "false"
              ? false
              : null
          : undefined,
    });
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveMessage("Ficha actualizada.");
      router.refresh();
    }
    setSaving(false);
  }

  async function uploadPhoto(file: File) {
    setPhotoError(null);
    const check = validateVenuePhotoUpload(file, photos.length);
    if ("error" in check) {
      setPhotoError(check.error);
      return;
    }

    const supabase = createClient();
    const path = venuePhotoObjectPath(venue.id, file.name);
    const { error: uploadError } = await supabase.storage
      .from(VENUE_PHOTOS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setPhotoError(
        isRateLimitError(uploadError.message)
          ? uploadError.message
          : `No se pudo subir "${file.name}": ${uploadError.message}`,
      );
      return;
    }

    const { data: row, error: rowError } = await supabase
      .from("venue_photos")
      .insert({ venue_id: venue.id, url: path, uploaded_by: userId })
      .select("id, url, caption, sort_order")
      .single();

    if (rowError || !row) {
      setPhotoError(
        isRateLimitError(rowError?.message)
          ? (rowError?.message ?? "Demasiadas fotos. Esperá un rato.")
          : `La foto se subió pero no se registró: ${rowError?.message ?? "error"}`,
      );
      return;
    }
    setPhotos((prev) => [...prev, row as VenuePhotoRow]);
  }

  async function removePhoto(photo: VenuePhotoRow) {
    if (!confirm("¿Eliminar esta foto de la ficha?")) return;
    setPhotoError(null);
    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from(VENUE_PHOTOS_BUCKET)
      .remove([photo.url]);
    const { error } = await supabase.from("venue_photos").delete().eq("id", photo.id);
    if (error) {
      setPhotoError(error.message);
      return;
    }
    if (storageError) {
      setPhotoError("La foto se desvinculó pero no se pudo borrar del storage. Avisanos.");
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  async function unclaimVenue() {
    const warn = activeSubscription
      ? "¿Liberar esta cancha? Perderás la verificada, el acceso al panel y el tiempo Premium activo que no hayas usado (queda cancelado; cualquier rembolso lo resuelve un admin de BaFut)."
      : "¿Liberar esta cancha? Perderás el sello de verificada y el acceso al panel.";
    if (!confirm(warn)) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("unclaim_venue", { p_venue_id: venue.id });
    if (error) {
      alert(error.message);
      return;
    }
    router.push(`/canchas/${venue.slug}`);
    router.refresh();
  }

  async function deleteVenue() {
    if (
      !confirm(
        "¿Ocultar esta cancha del directorio? Soft-delete: se retiene en DB (claims/subs). No es hard-delete.",
      )
    ) {
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.rpc("delete_venue", { p_venue_id: venue.id });
    if (error) {
      alert(error.message);
      return;
    }
    router.push("/admin/venues");
    router.refresh();
  }

  const base = `/canchas/${venue.slug}/admin`;
  const showMesa = tab === "mesa";
  const showFicha = tab === "ficha";
  const showPremium = tab === "premium";
  const showFotos = tab === "fotos";
  const showCuenta = tab === "cuenta";

  return (
    <div className="venue-admin-dashboard">
      {showMesa ? (
        <section className="venue-admin-section">
          <h2 className="subhead">Actividad del mes</h2>
          {stats ? (
            <div className="venue-admin-stats-grid">
              <div className="venue-admin-stat-card">
                <span className="venue-admin-stat-value">{stats.total_matches}</span>
                <span className="venue-admin-stat-label">Partidos publicados</span>
              </div>
              <div className="venue-admin-stat-card">
                <span className="venue-admin-stat-value">{stats.total_slots}</span>
                <span className="venue-admin-stat-label">Cupos totales</span>
              </div>
              <div className="venue-admin-stat-card">
                <span className="venue-admin-stat-value">{stats.filled_slots}</span>
                <span className="venue-admin-stat-label">Cupos confirmados</span>
              </div>
              <div className="venue-admin-stat-card">
                <span className="venue-admin-stat-value">{stats.occupancy_rate}%</span>
                <span className="venue-admin-stat-label">Ocupación</span>
              </div>
            </div>
          ) : (
            <p className="field-help">Cargando actividad…</p>
          )}

          <ul className="venue-admin-shortcuts" aria-label="Atajos del panel">
            <li>
              <Link href={`${base}?tab=ficha`} className="venue-admin-shortcut">
                <span className="venue-admin-shortcut-label">Ficha</span>
                <span className="venue-admin-shortcut-hint">Nombre, barrio, deportes, mapa</span>
              </Link>
            </li>
            {premiumPaywallEnabled ? (
              <li>
                <Link
                  href={`${base}?tab=premium`}
                  className={`venue-admin-shortcut${pendingRequest ? " is-hot" : ""}`}
                >
                  <span className="venue-admin-shortcut-label">Premium</span>
                  <span className="venue-admin-shortcut-hint">
                    {pendingRequest
                      ? "Solicitud en revisión"
                      : activeSubscription
                        ? "Plan activo"
                        : "Destacá la cancha"}
                  </span>
                </Link>
              </li>
            ) : null}
            <li>
              <Link href={`${base}?tab=fotos`} className="venue-admin-shortcut">
                <span className="venue-admin-shortcut-label">Fotos</span>
                <span className="venue-admin-shortcut-hint">
                  {photos.length}/{MAX_VENUE_PHOTOS} cargadas
                </span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/precios`} className="venue-admin-shortcut">
                <span className="venue-admin-shortcut-label">Precios</span>
                <span className="venue-admin-shortcut-hint">Franjas, mínimos y promociones</span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/precios?tab=promos&crear=1`} className="venue-admin-shortcut">
                <span className="venue-admin-shortcut-label">Crear promoción</span>
                <span className="venue-admin-shortcut-hint">Descuento o precio cerrado</span>
              </Link>
            </li>
            <li>
              <Link href={`${base}/ingresos`} className="venue-admin-shortcut">
                <span className="venue-admin-shortcut-label">Ingresos</span>
                <span className="venue-admin-shortcut-hint">Estimado del mes</span>
              </Link>
            </li>
            {(isOwner || isAdmin) && venue.owner_id ? (
              <li>
                <Link href={`${base}?tab=cuenta`} className="venue-admin-shortcut">
                  <span className="venue-admin-shortcut-label">Cuenta</span>
                  <span className="venue-admin-shortcut-hint">Dueño y zona de peligro</span>
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {showFicha ? (
      <section className="venue-admin-section">
        <h2 className="subhead">Editar información</h2>
        <p className="field-help">
          {isOwner && !isAdmin
            ? "Sos el dueño: estos datos son los que ve todo el mundo en la ficha."
            : "Como admin de BaFut podés corregir cualquier ficha."}
        </p>
        <div className="venue-edit-grid">
          <label className="venue-edit-field">
            <span>Nombre *</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />
          </label>
          <label className="venue-edit-field">
            <span>Barrio</span>
            <input
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              maxLength={120}
            />
          </label>
          <label className="venue-edit-field venue-edit-wide">
            <span>Dirección</span>
            <input value={form.address} onChange={(e) => set("address", e.target.value)} maxLength={240} />
          </label>
          <label className="venue-edit-field">
            <span>Teléfono público</span>
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="3014258786 o (605) 1234567"
              inputMode="tel"
            />
          </label>
          <label className="venue-edit-field">
            <span>Sitio web</span>
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://…"
              inputMode="url"
            />
          </label>
          <div className="venue-edit-field venue-edit-wide">
            <span>Ubicación de la cancha *</span>
            <VenueLocationPicker
              latStr={form.lat}
              lngStr={form.lng}
              onCoordsChange={(nextLat, nextLng) => {
                set("lat", nextLat);
                set("lng", nextLng);
              }}
              center={cityCenter ?? { lat: venue.lat, lng: venue.lng }}
            />
          </div>
          <fieldset className="venue-edit-field venue-edit-wide">
            <legend>Deportes *</legend>
            <div className="venue-edit-chips">
              {SPORTS.map((sport) => (
                <label key={sport} className="venue-edit-chip">
                  <input
                    type="checkbox"
                    checked={form.sports.includes(sport)}
                    onChange={() => set("sports", toggleSport(form.sports, sport))}
                  />
                  {sportLabel[sport]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="venue-edit-field">
            <span>Superficie</span>
            <select value={form.surface} onChange={(e) => set("surface", e.target.value)}>
              {SURFACE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="venue-edit-field">
            <span>Tipo</span>
            <select value={form.venue_kind} onChange={(e) => set("venue_kind", e.target.value)}>
              {KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="venue-edit-field">
            <span>¿Techada?</span>
            <select
              value={form.covered}
              onChange={(e) => set("covered", e.target.value as FormState["covered"])}
            >
              <option value="">Sin dato</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <label className="venue-edit-field venue-edit-wide">
            <span>Nota para jugadores (máx. 500)</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={500}
            />
          </label>
        </div>
        {saveError ? <p className="form-error">{saveError}</p> : null}
        {saveMessage ? <p className="form-ok">{saveMessage}</p> : null}
        <div className="venue-edit-actions">
          <button
            type="button"
            className="btn-flood"
            disabled={!dirty || saving}
            onClick={() => void submitEdit()}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {dirty ? (
            <button type="button" className="btn-ghost" onClick={() => setForm(original)}>
              Descartar
            </button>
          ) : null}
        </div>
      </section>
      ) : null}

      {showPremium && premiumPaywallEnabled ? (
        <VenuePremiumPaywall
          venueId={venue.id}
          venueSlug={venue.slug}
          isOwner={isOwner}
          activeSubscription={activeSubscription}
          pendingRequest={pendingRequest}
          latestRequest={latestRequest}
        />
      ) : null}

      {showPremium && !premiumPaywallEnabled ? (
        <section className="venue-admin-section">
          <h2 className="subhead">Plan Premium</h2>
          <p className="field-help">El paywall Premium no está activo en este momento.</p>
        </section>
      ) : null}

      {showFotos ? (
      <section className="venue-admin-section">
        <h2 className="subhead">
          Fotos ({photos.length}/{MAX_VENUE_PHOTOS})
        </h2>
        <p className="field-help">
          JPG, PNG o WEBP de hasta 5 MB. Máximo {MAX_VENUE_PHOTOS} por cancha. Lo primero que ve el
          jugador en la ficha.
        </p>
        {photos.length > 0 ? (
          <ul className="venue-admin-photo-grid">
            {photos.map((photo) => (
              <li key={photo.id} className="venue-admin-photo">
                <Image
                  src={venuePhotoPublicUrl(photo.url)}
                  alt="Foto de la cancha"
                  width={280}
                  height={210}
                  className="venue-photo"
                  unoptimized
                />
                <button type="button" className="venue-admin-photo-del" onClick={() => void removePhoto(photo)}>
                  Eliminar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="venue-info-empty">Todavía no hay fotos propias. Las de Google Maps se muestran mientras.</p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="venue-photo-input"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length === 0) return;
            setUploading(true);
            for (const file of files) await uploadPhoto(file);
            setUploading(false);
            e.target.value = "";
          }}
        />
        <div className="venue-edit-actions">
          <button
            type="button"
            className="btn-ghost"
            disabled={uploading || photos.length >= MAX_VENUE_PHOTOS}
            onClick={() => fileInput.current?.click()}
          >
            {uploading
              ? "Subiendo…"
              : photos.length >= MAX_VENUE_PHOTOS
                ? "Máximo de fotos"
                : "Subir fotos"}
          </button>
        </div>
        {photoError ? <p className="form-error">{photoError}</p> : null}
      </section>
      ) : null}

      {showCuenta ? (
        <>
      {(isOwner || isAdmin) && (venue.owner_id || venue.contact_whatsapp) ? (
        <section className="venue-admin-section">
          <h2 className="subhead">Dueño</h2>
          <div className="venue-admin-info-grid">
            <div>
              <span className="venue-admin-label">Reclamada por</span>
              <span>{isOwner ? "Vos" : "Otro usuario"}</span>
            </div>
            {venue.contact_whatsapp ? (
              <div>
                <span className="venue-admin-label">WhatsApp de contacto</span>
                <span>{venue.contact_whatsapp}</span>
              </div>
            ) : null}
            {venue.contact_email ? (
              <div>
                <span className="venue-admin-label">Correo de contacto</span>
                <span>{venue.contact_email}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {(isOwner || isAdmin) && venue.owner_id ? (
        <section className="venue-admin-section venue-admin-danger">
          <h2 className="subhead">Zona de peligro</h2>
          <div className="venue-admin-actions">
            <button type="button" className="btn-ghost" onClick={() => void unclaimVenue()}>
              {activeSubscription
                ? "Liberar cancha (pierde verificada y Premium)"
                : "Liberar esta cancha (pierde la verificada)"}
            </button>
            {isAdmin ? (
              <button type="button" className="btn-bib" onClick={() => void deleteVenue()}>
                Ocultar cancha del directorio
              </button>
            ) : null}
          </div>
          {isAdmin ? (
            <p className="field-help">
              <Link href="/admin/venues">← Gestión general de canchas</Link>
            </p>
          ) : null}
        </section>
      ) : (
        <section className="venue-admin-section">
          <p className="field-help">No hay acciones de cuenta disponibles.</p>
        </section>
      )}
        </>
      ) : null}
    </div>
  );
}
