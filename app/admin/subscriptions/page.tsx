import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminSubscriptionRequestsPanel,
  type AdminSubscriptionRequest,
} from "@/components/AdminSubscriptionRequestsPanel";
import { requireUserId } from "@/lib/auth";
import { getActiveCity } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Solicitudes Premium",
  robots: robotsNoIndex,
};

/** Ventana de solicitudes resueltas visibles (mismo criterio que claims). */
function recentReviewCutoffIso(hours = 48) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export default async function AdminSubscriptionsPage() {
  const { userId } = await requireUserId("/admin/subscriptions");
  const city = await getActiveCity();
  const timezone = city?.timezone ?? "America/Bogota";

  const supabase = await createClient();

  const { data: adminData } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!adminData) {
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

  const { data: requests, error } = await supabase
    .from("venue_subscription_requests")
    .select(
      `id, venue_id, created_at, status, plan, payment_method, amount_cop,
       payment_reference, proof_path, reject_reason, reviewed_at,
       invoice_number, subscription_id, duration_days,
       venues ( name, slug, neighborhood ),
       profiles!venue_subscription_requests_user_id_fkey ( display_name )`,
    )
    .or(
      `status.eq.pending,and(status.in.(approved,rejected),reviewed_at.gte.${recentReviewCutoffIso()})`,
    )
    .order("created_at", { ascending: true });

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/admin">← Admin</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Moderación · pagos</p>
        <h1>Solicitudes Premium</h1>
        <p className="lede">
          Revisá el comprobante Nequi o transferencia. Al aprobar se activa la suscripción,
          se verifica la cancha y se genera la factura.
        </p>
      </header>

      {error ? (
        <p className="form-error">Error cargando solicitudes: {error.message}</p>
      ) : (
        <AdminSubscriptionRequestsPanel
          requests={(requests ?? []) as AdminSubscriptionRequest[]}
          timezone={timezone}
        />
      )}
    </main>
  );
}
