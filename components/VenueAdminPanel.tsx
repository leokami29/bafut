"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Venue } from "@/lib/types";

type VenueWithSubscription = Venue & {
  venue_subscriptions: Array<{
    id: string;
    plan: string;
    status: string;
    expires_at: string;
  }>;
};

type VenueAdminPanelProps = {
  venues: VenueWithSubscription[];
};

type Filters = "all" | "verified" | "unverified" | "premium";

const FILTERS: Array<{ id: Filters; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "verified", label: "Verificadas" },
  { id: "unverified", label: "Sin verificar" },
  { id: "premium", label: "Premium" },
];

const SURFACE_LABEL: Record<string, string> = {
  sintetica: "Sintética",
  cesped: "Césped",
  cemento: "Cemento",
};

function shortId(id: string | null) {
  return id ? `${id.slice(0, 4)}…${id.slice(-4)}` : "Sin dueño";
}

export function VenueAdminPanel({ venues }: VenueAdminPanelProps) {
  const [filter, setFilter] = useState<Filters>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ venue: VenueWithSubscription; x: number; y: number } | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  const premiumCount = useMemo(
    () =>
      venues.filter((v) =>
        v.venue_subscriptions.some((s) => s.status === "active" && s.plan === "premium"),
      ).length,
    [venues],
  );

  const filteredVenues = useMemo(() => {
    const q = query.trim().toLowerCase();
    return venues.filter((venue) => {
      if (filter === "verified" && !venue.is_verified) return false;
      if (filter === "unverified" && venue.is_verified) return false;
      if (
        filter === "premium" &&
        !venue.venue_subscriptions.some((s) => s.status === "active" && s.plan === "premium")
      ) {
        return false;
      }
      if (q) {
        const haystack = `${venue.name} ${venue.neighborhood ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [venues, filter, query]);

  function openPreview(venue: VenueWithSubscription, e: React.MouseEvent) {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    window.clearTimeout(hideTimer.current);
    const cardWidth = 344; // min(21rem, 100vw-2rem)
    const x = Math.min(Math.max(8, e.clientX), window.innerWidth - cardWidth);
    setPreview({ venue, x, y: e.clientY });
  }

  function schedulePreviewHide() {
    hideTimer.current = window.setTimeout(() => setPreview(null), 120);
  }

  async function toggleVerification(venueId: string, currentStatus: boolean) {
    setLoading(venueId);
    const supabase = createClient();

    const { error } = await supabase
      .from("venues")
      .update({ is_verified: !currentStatus })
      .eq("id", venueId);

    if (error) {
      alert(`Error: ${error.message}`);
    }

    setLoading(null);
  }

  async function createSubscription(venueId: string, plan: "basic" | "premium") {
    setLoading(venueId);
    const supabase = createClient();

    const { error } = await supabase.rpc("create_venue_subscription", {
      p_venue_id: venueId,
      p_plan: plan,
      p_duration_days: 30,
      p_payment_method: "manual",
    });

    if (error) {
      alert(`Error: ${error.message}`);
    }

    setLoading(null);
  }

  return (
    <div className="venue-admin-panel">
      <div className="venue-admin-toolbar">
        <input
          type="search"
          className="venue-admin-search"
          placeholder="Buscar por nombre o barrio…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar cancha"
        />
        <div className="filter-chips venue-admin-filters" role="group" aria-label="Filtrar canchas">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={filter === f.id ? "is-on" : undefined}
            >
              {f.label} ({f.id === "all" ? venues.length : f.id === "verified" ? venues.filter((v) => v.is_verified).length : f.id === "unverified" ? venues.filter((v) => !v.is_verified).length : premiumCount})
            </button>
          ))}
        </div>
        <p className="venue-admin-count" role="status">
          {filteredVenues.length} de {venues.length} canchas
        </p>
      </div>

      <ul className="venue-admin-list">
        {filteredVenues.map((venue) => {
          const activeSubscription = venue.venue_subscriptions.find(
            (sub) => sub.status === "active",
          );

          return (
            <li
              key={venue.id}
              className="venue-admin-row"
              onMouseMove={(e) => openPreview(venue, e)}
              onMouseLeave={schedulePreviewHide}
            >
              <div className="venue-admin-row-main">
                <span className="venue-admin-row-name">{venue.name}</span>
                <span className="venue-admin-row-badges">
                  {venue.is_verified && <span className="badge verified">✓ Verificada</span>}
                  {activeSubscription && (
                    <span className={`badge ${activeSubscription.plan}`}>
                      {activeSubscription.plan}
                    </span>
                  )}
                </span>
              </div>
              <span className="venue-admin-row-meta">
                {venue.neighborhood ?? "Sin barrio"} · {venue.sports.join(", ")}
              </span>
              <div className="venue-admin-row-actions">
                <button
                  type="button"
                  onClick={() => toggleVerification(venue.id, venue.is_verified)}
                  disabled={loading === venue.id}
                  className="btn-ghost"
                >
                  {loading === venue.id
                    ? "…"
                    : venue.is_verified
                      ? "Quitar ✓"
                      : "Verificar"}
                </button>
                {!activeSubscription && (
                  <button
                    type="button"
                    onClick={() => createSubscription(venue.id, "premium")}
                    disabled={loading === venue.id}
                    className="btn-flood"
                  >
                    + Premium
                  </button>
                )}
                <Link href={`/canchas/${venue.slug}/admin`} className="btn-ghost">
                  Panel
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {preview && (
        <div
          className="venue-admin-preview"
          style={{ left: preview.x, top: preview.y }}
          onMouseEnter={() => window.clearTimeout(hideTimer.current)}
          onMouseLeave={schedulePreviewHide}
        >
          <p className="venue-admin-preview-name">{preview.venue.name}</p>
          <p className="venue-admin-preview-sub">
            {preview.venue.neighborhood ?? "Sin barrio"} ·{" "}
            {SURFACE_LABEL[preview.venue.surface] ?? preview.venue.surface}
          </p>
          <dl className="venue-admin-preview-data">
            <div>
              <dt>Deportes</dt>
              <dd>{preview.venue.sports.join(", ")}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>
                {preview.venue.venue_kind}
                {preview.venue.covered ? " · techada" : ""}
              </dd>
            </div>
            <div>
              <dt>Dueño</dt>
              <dd>{shortId(preview.venue.owner_id)}</dd>
            </div>
            <div>
              <dt>Rating</dt>
              <dd>{preview.venue.rating ? `${preview.venue.rating} ★` : "Sin reseñas"}</dd>
            </div>
            {(() => {
              const sub = preview.venue.venue_subscriptions.find((s) => s.status === "active");
              return sub ? (
                <div>
                  <dt>Suscripción</dt>
                  <dd>
                    {sub.plan} · vence{" "}
                    {new Date(sub.expires_at).toLocaleDateString("es-CO")}
                  </dd>
                </div>
              ) : null;
            })()}
          </dl>
        </div>
      )}
    </div>
  );
}
