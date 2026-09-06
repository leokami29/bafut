"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Venue } from "@/lib/types";

type VenueAdminDashboardProps = {
  venue: Venue;
  userId: string;
  isAdmin: boolean;
};

type VenueStats = {
  total_matches: number;
  total_slots: number;
  filled_slots: number;
  occupancy_rate: number;
};

export function VenueAdminDashboard({
  venue,
  userId,
  isAdmin,
}: VenueAdminDashboardProps) {
  const [stats, setStats] = useState<VenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_venue_stats", {
        p_venue_id: venue.id,
      });

      if (error) {
        setError(error.message);
      } else if (data && data.length > 0) {
        setStats(data[0]);
      }
      setLoading(false);
    }

    loadStats();
  }, [venue.id]);

  return (
    <div className="venue-admin-dashboard">
      {/* Información de la cancha */}
      <section className="venue-admin-section">
        <h2 className="subhead">Información de la cancha</h2>
        <div className="venue-admin-info-grid">
          <div>
            <span className="venue-admin-label">Estado:</span>
            {venue.is_verified ? (
              <span className="venue-admin-verified">✓ Verificada</span>
            ) : (
              <span className="venue-admin-not-verified">Sin verificar</span>
            )}
          </div>
          <div>
            <span className="venue-admin-label">Dueño:</span>
            <span>{venue.owner_id === userId ? "Vos" : "Otro usuario"}</span>
          </div>
          {venue.contact_whatsapp && (
            <div>
              <span className="venue-admin-label">WhatsApp:</span>
              <span>{venue.contact_whatsapp}</span>
            </div>
          )}
          {venue.contact_email && (
            <div>
              <span className="venue-admin-label">Email:</span>
              <span>{venue.contact_email}</span>
            </div>
          )}
        </div>
      </section>

      {/* Estadísticas del mes */}
      <section className="venue-admin-section">
        <h2 className="subhead">Estadísticas del mes</h2>
        {loading ? (
          <p>Cargando estadísticas...</p>
        ) : error ? (
          <p className="form-error">Error: {error}</p>
        ) : stats ? (
          <div className="venue-admin-stats-grid">
            <div className="venue-admin-stat-card">
              <span className="venue-admin-stat-value">{stats.total_matches}</span>
              <span className="venue-admin-stat-label">Partidos</span>
            </div>
            <div className="venue-admin-stat-card">
              <span className="venue-admin-stat-value">{stats.total_slots}</span>
              <span className="venue-admin-stat-label">Cupos totales</span>
            </div>
            <div className="venue-admin-stat-card">
              <span className="venue-admin-stat-value">{stats.filled_slots}</span>
              <span className="venue-admin-stat-label">Cupos ocupados</span>
            </div>
            <div className="venue-admin-stat-card">
              <span className="venue-admin-stat-value">{stats.occupancy_rate}%</span>
              <span className="venue-admin-stat-label">Tasa de ocupación</span>
            </div>
          </div>
        ) : (
          <p>Sin datos este mes.</p>
        )}
      </section>

      {/* Acciones para admin */}
      {isAdmin && (
        <section className="venue-admin-section">
          <h2 className="subhead">Acciones de administrador</h2>
          <div className="venue-admin-actions">
            <button className="btn-flood" type="button">
              Crear suscripción premium
            </button>
            <button className="btn-ghost" type="button">
              Editar información
            </button>
          </div>
        </section>
      )}

      {/* Fotos de la cancha */}
      <section className="venue-admin-section">
        <h2 className="subhead">Fotos de la cancha</h2>
        <p className="field-help">
          Próximamente: subí fotos de tu cancha para atraer más jugadores.
        </p>
      </section>
    </div>
  );
}
