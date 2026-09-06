"use client";

import { useState } from "react";
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

export function VenueAdminPanel({ venues }: VenueAdminPanelProps) {
  const [filter, setFilter] = useState<"all" | "verified" | "unverified" | "premium">("all");
  const [loading, setLoading] = useState<string | null>(null);

  const filteredVenues = venues.filter((venue) => {
    if (filter === "verified") return venue.is_verified;
    if (filter === "unverified") return !venue.is_verified;
    if (filter === "premium") {
      return venue.venue_subscriptions.some(
        (sub) => sub.status === "active" && sub.plan === "premium"
      );
    }
    return true;
  });

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
    } else {
      alert(`Suscripción ${plan} creada exitosamente`);
    }

    setLoading(null);
  }

  return (
    <div className="venue-admin-panel">
      <div className="venue-admin-filters">
        <button
          onClick={() => setFilter("all")}
          className={filter === "all" ? "active" : ""}
        >
          Todas ({venues.length})
        </button>
        <button
          onClick={() => setFilter("verified")}
          className={filter === "verified" ? "active" : ""}
        >
          Verificadas ({venues.filter((v) => v.is_verified).length})
        </button>
        <button
          onClick={() => setFilter("unverified")}
          className={filter === "unverified" ? "active" : ""}
        >
          Sin verificar ({venues.filter((v) => !v.is_verified).length})
        </button>
        <button
          onClick={() => setFilter("premium")}
          className={filter === "premium" ? "active" : ""}
        >
          Premium ({venues.filter((v) =>
            v.venue_subscriptions.some((s) => s.status === "active" && s.plan === "premium")
          ).length})
        </button>
      </div>

      <div className="venue-admin-list">
        {filteredVenues.map((venue) => {
          const activeSubscription = venue.venue_subscriptions.find(
            (sub) => sub.status === "active"
          );

          return (
            <div key={venue.id} className="venue-admin-item">
              <div className="venue-admin-item-header">
                <h3>{venue.name}</h3>
                <div className="venue-admin-item-badges">
                  {venue.is_verified && <span className="badge verified">✓ Verificada</span>}
                  {activeSubscription && (
                    <span className={`badge ${activeSubscription.plan}`}>
                      {activeSubscription.plan.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              <div className="venue-admin-item-info">
                <p><strong>Barrio:</strong> {venue.neighborhood || "Sin barrio"}</p>
                <p><strong>Deportes:</strong> {venue.sports.join(", ")}</p>
                {venue.owner_id && <p><strong>Dueño:</strong> {venue.owner_id}</p>}
                {activeSubscription && (
                  <p><strong>Vence:</strong> {new Date(activeSubscription.expires_at).toLocaleDateString()}</p>
                )}
              </div>

              <div className="venue-admin-item-actions">
                <button
                  onClick={() => toggleVerification(venue.id, venue.is_verified)}
                  disabled={loading === venue.id}
                  className="btn-ghost"
                >
                  {loading === venue.id
                    ? "..."
                    : venue.is_verified
                    ? "Quitar verificación"
                    : "Verificar"}
                </button>

                {!activeSubscription && (
                  <>
                    <button
                      onClick={() => createSubscription(venue.id, "basic")}
                      disabled={loading === venue.id}
                      className="btn-ghost"
                    >
                      Crear plan Basic
                    </button>
                    <button
                      onClick={() => createSubscription(venue.id, "premium")}
                      disabled={loading === venue.id}
                      className="btn-flood"
                    >
                      Crear plan Premium
                    </button>
                  </>
                )}

                <a
                  href={`/canchas/${venue.slug}/admin`}
                  className="btn-ghost"
                >
                  Ver panel
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
