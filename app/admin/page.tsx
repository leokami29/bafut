import type { Metadata } from "next";
import Link from "next/link";
import { getIsAdmin } from "@/lib/data";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Admin BaFut",
  robots: robotsNoIndex,
};

export default async function AdminHomePage() {
  const { userId } = await requireUserId("/admin");

  if (!(await getIsAdmin(userId))) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos de administrador.</p>
          <p className="foot-link">
            <Link href="/">Volver al inicio</Link>
          </p>
        </header>
      </main>
    );
  }

  const supabase = await createClient();
  const { count: pendingClaims } = await supabase
    .from("venue_claims")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: pendingPremium } = await supabase
    .from("venue_subscription_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: pendingRenewals } = await supabase
    .from("subscription_renewal_reminders")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const { count: totalVenues } = await supabase
    .from("venues")
    .select("id", { count: "exact", head: true });

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <p className="eyebrow">BaFut · uso interno</p>
        <h1>Panel de administración</h1>
        <p>
          Moderación de reclamos y gestión de fichas. Solo visible para editores de BaFut.
        </p>
      </header>

      <div className="profile-nav-grid">
        <Link href="/admin/claims" className="profile-nav-card">
          <span className="profile-nav-title">Reclamos pendientes</span>
          {pendingClaims ? <span className="profile-nav-badge">{pendingClaims}</span> : null}
          <span className="profile-nav-desc">
            Dueños que reclamaron su cancha. Verificá y aprobá o rechazá.
          </span>
        </Link>
        <Link href="/admin/subscriptions" className="profile-nav-card">
          <span className="profile-nav-title">Solicitudes Premium</span>
          {pendingPremium ? (
            <span className="profile-nav-badge">{pendingPremium}</span>
          ) : null}
          <span className="profile-nav-desc">
            Comprobantes Nequi/banco: aprobar activa la suscripción y genera factura.
          </span>
        </Link>
        <Link href="/admin/renewals" className="profile-nav-card">
          <span className="profile-nav-title">Renovaciones</span>
          {pendingRenewals ? (
            <span className="profile-nav-badge">{pendingRenewals}</span>
          ) : null}
          <span className="profile-nav-desc">
            Cola T-7 / T-1: avisá por WhatsApp a dueños con Premium por vencer.
          </span>
        </Link>
        <Link href="/admin/venues" className="profile-nav-card">
          <span className="profile-nav-title">Gestión de canchas</span>
          <span className="profile-nav-desc">
            {totalVenues ?? 0} fichas: verificación, suscripciones y estado de cada cancha.
          </span>
        </Link>
        <Link href="/admin/venues/nuevo" className="profile-nav-card">
          <span className="profile-nav-title">Crear cancha</span>
          <span className="profile-nav-desc">
            Alta de una ficha nueva en el directorio (nombre, coords, deportes).
          </span>
        </Link>
      </div>

      <p className="foot-link">
        <Link href="/">← Volver al sitio</Link>
      </p>
    </main>
  );
}
