"use client";

import { useMemo } from "react";
import { formatWhen } from "@/lib/format";

type MatchWithPricing = {
  id: string;
  starts_at: string;
  duration_min: number;
  status: string;
  match_slots: Array<{ id: string }>;
  matches_pricing_snapshot: {
    final_cop: number;
    base_cop: number;
    discount_cop: number;
    promo_id: string | null;
  } | null;
};

type RevenueDashboardProps = {
  venueId: string;
  venueName: string;
  matches: MatchWithPricing[];
  month: number;
  year: number;
};

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function RevenueDashboard({
  venueName,
  matches,
  month,
  year,
}: RevenueDashboardProps) {
  const stats = useMemo(() => {
    const totalMatches = matches.length;
    const totalRevenue = matches.reduce((sum, match) => {
      const snapshot = match.matches_pricing_snapshot;
      return sum + (snapshot?.final_cop ?? 0);
    }, 0);
    const totalDiscount = matches.reduce((sum, match) => {
      const snapshot = match.matches_pricing_snapshot;
      return sum + (snapshot?.discount_cop ?? 0);
    }, 0);
    const avgPrice = totalMatches > 0 ? totalRevenue / totalMatches : 0;

    return { totalMatches, totalRevenue, totalDiscount, avgPrice };
  }, [matches]);

  const matchesByStatus = useMemo(() => {
    const grouped: Record<string, MatchWithPricing[]> = {};
    matches.forEach((match) => {
      if (!grouped[match.status]) {
        grouped[match.status] = [];
      }
      grouped[match.status].push(match);
    });
    return grouped;
  }, [matches]);

  return (
    <div className="revenue-dashboard">
      {/* Resumen */}
      <section className="revenue-summary">
        <div className="revenue-summary-card">
          <span className="revenue-summary-label">Partidos</span>
          <strong className="revenue-summary-value">{stats.totalMatches}</strong>
        </div>
        <div className="revenue-summary-card">
          <span className="revenue-summary-label">Ingreso total</span>
          <strong className="revenue-summary-value revenue-summary-revenue">
            ${stats.totalRevenue.toLocaleString()}
          </strong>
        </div>
        <div className="revenue-summary-card">
          <span className="revenue-summary-label">Descuentos</span>
          <strong className="revenue-summary-value revenue-summary-discount">
            ${stats.totalDiscount.toLocaleString()}
          </strong>
        </div>
        <div className="revenue-summary-card">
          <span className="revenue-summary-label">Precio promedio</span>
          <strong className="revenue-summary-value">
            ${Math.round(stats.avgPrice).toLocaleString()}
          </strong>
        </div>
      </section>

      {/* Lista de partidos */}
      <section className="revenue-matches">
        <h2 className="subhead">
          Partidos de {MONTHS[month]} {year}
        </h2>
        {matches.length === 0 ? (
          <p className="field-help">
            No hay partidos publicados este mes.
          </p>
        ) : (
          <ul className="revenue-matches-list">
            {matches.map((match) => {
              const snapshot = match.matches_pricing_snapshot;
              return (
                <li key={match.id} className="revenue-match-item">
                  <div className="revenue-match-info">
                    <span className="revenue-match-date">
                      {formatWhen(match.starts_at, "America/Bogota")}
                    </span>
                    <span className="revenue-match-duration">
                      {match.duration_min} min
                    </span>
                    <span className={`revenue-match-status status-${match.status}`}>
                      {match.status === "open" ? "Abierto" : match.status === "full" ? "Completo" : match.status}
                    </span>
                  </div>
                  <div className="revenue-match-price">
                    {snapshot ? (
                      <>
                        <span className="revenue-match-final">
                          ${snapshot.final_cop.toLocaleString()}
                        </span>
                        {snapshot.discount_cop > 0 && (
                          <span className="revenue-match-discount">
                            -${snapshot.discount_cop.toLocaleString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="revenue-match-no-price">Sin precio</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
