import type { Metadata } from "next";
import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { getOwnedVenues, getUserVenueClaims } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mis canchas",
  robots: robotsNoIndex,
};

const CLAIM_STATUS_LABEL: Record<string, string> = {
  pending: "En revisión",
  approved: "Aprobado",
  rejected: "Rechazado",
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function MyVenuesPage() {
  const { userId } = await requireUserId("/perfil/canchas");
  const [venues, claims, supabase] = await Promise.all([
    getOwnedVenues(userId),
    getUserVenueClaims(userId),
    createClient(),
  ]);

  const { data: adminRow } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const pendingClaims = claims.filter((claim) => claim.status === "pending");
  const pastClaims = claims.filter((claim) => claim.status !== "pending");

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/perfil">← Volver a tu ficha</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Para dueños de cancha</p>
        <h1>Mis canchas</h1>
        <p className="lede">
          Las fichas que reclamaste y el estado de tus reclamos. Si un editor confirma la
          titularidad, la cancha pasa a tu nombre con sello de verificada.
        </p>
      </header>

      {adminRow ? (
        <p className="owner-admin-note">
          Sos editor de BaFut ·{" "}
          <Link href="/admin/claims">cola de reclamos pendientes</Link> ·{" "}
          <Link href="/admin/venues">gestión de canchas</Link>
        </p>
      ) : null}

      <section aria-labelledby="owner-venues-heading">
        <h2 className="subhead" id="owner-venues-heading">
          Tus canchas ({venues.length})
        </h2>
        {venues.length === 0 ? (
          <div className="owner-empty">
            <p>
              Todavía no tenés ninguna cancha a tu nombre. Buscala en el radar y mandá el
              reclamo — es gratis y sin comisión.
            </p>
            <Link href="/canchas" className="btn-flood">
              Buscar mi cancha
            </Link>
          </div>
        ) : (
          <ul className="venue-admin-list">
            {venues.map((venue) => (
              <li key={venue.id} className="venue-admin-row">
                <div className="venue-admin-row-main">
                  <Link href={`/canchas/${venue.slug}`} className="venue-admin-row-name">
                    {venue.name}
                  </Link>
                  <span className="venue-admin-row-badges">
                    {venue.is_verified && (
                      <span className="badge verified">✓ Verificada</span>
                    )}
                    {venue.activePlan && (
                      <span className={`badge ${venue.activePlan}`}>{venue.activePlan}</span>
                    )}
                  </span>
                </div>
                <span className="venue-admin-row-meta">
                  {venue.neighborhood ?? "Sin barrio"} · {venue.sports.join(", ")}
                  {venue.subscriptionExpiresAt
                    ? ` · plan hasta ${formatDate(venue.subscriptionExpiresAt)}`
                    : ""}
                </span>
                <div className="venue-admin-row-actions">
                  <Link href={`/canchas/${venue.slug}`} className="btn-ghost">
                    Ficha
                  </Link>
                  <Link href={`/canchas/${venue.slug}/admin`} className="btn-flood">
                    Panel
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingClaims.length > 0 ? (
        <section aria-labelledby="owner-claims-heading">
          <h2 className="subhead" id="owner-claims-heading">
            Reclamos en revisión ({pendingClaims.length})
          </h2>
          <ul className="venue-admin-list">
            {pendingClaims.map((claim) => (
              <li key={claim.id} className="venue-admin-row" data-status={claim.status}>
                <div className="venue-admin-row-main">
                  <span className="venue-admin-row-name">
                    {claim.venue ? claim.venue.name : "Cancha eliminada"}
                  </span>
                  <span className="venue-admin-row-badges">
                    <span className="badge is-pending">En revisión</span>
                  </span>
                </div>
                <span className="venue-admin-row-meta">
                  Enviado el {formatDate(claim.created_at)} · te avisamos por WhatsApp
                </span>
                <div className="venue-admin-row-actions">
                  {claim.venue ? (
                    <Link href={`/canchas/${claim.venue.slug}`} className="btn-ghost">
                      Ver cancha
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {pastClaims.length > 0 ? (
        <section aria-labelledby="owner-history-heading">
          <h2 className="subhead" id="owner-history-heading">
            Historial de reclamos
          </h2>
          <ul className="venue-admin-list">
            {pastClaims.map((claim) => (
              <li key={claim.id} className="venue-admin-row" data-status={claim.status}>
                <div className="venue-admin-row-main">
                  <span className="venue-admin-row-name">
                    {claim.venue ? claim.venue.name : "Cancha eliminada"}
                  </span>
                  <span className="venue-admin-row-badges">
                    <span className={`badge is-${claim.status}`}>
                      {CLAIM_STATUS_LABEL[claim.status] ?? claim.status}
                    </span>
                  </span>
                </div>
                <span className="venue-admin-row-meta">
                  {claim.status === "rejected" && claim.reject_reason
                    ? `Motivo: ${claim.reject_reason}`
                    : claim.status === "approved" && claim.venue
                      ? "La ficha quedó a tu nombre"
                      : `Resuelto el ${formatDate(claim.reviewed_at) ?? "—"}`}
                </span>
                <div className="venue-admin-row-actions">
                  {claim.status === "approved" && claim.venue ? (
                    <Link href={`/canchas/${claim.venue.slug}/admin`} className="btn-flood">
                      Panel
                    </Link>
                  ) : null}
                  {claim.status === "rejected" && claim.venue ? (
                    <Link href={`/canchas/${claim.venue.slug}/reclamar`} className="btn-ghost">
                      Reintentar
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
