import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminSubscriptionRequestsPanel,
  type AdminSubscriptionRequest,
} from "@/components/AdminSubscriptionRequestsPanel";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts, withQueueAges, type Aged } from "@/lib/admin-queues";
import { getActiveCity, getIsAdmin } from "@/lib/data";
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

type Props = {
  searchParams: Promise<{ vista?: string }>;
};

const REQUEST_SELECT = `id, venue_id, created_at, status, plan, payment_method, amount_cop,
  payment_reference, proof_path, reject_reason, reviewed_at,
  invoice_number, subscription_id, duration_days,
  venues ( name, slug, neighborhood ),
  profiles!venue_subscription_requests_user_id_fkey ( display_name )`;

export default async function AdminSubscriptionsPage({ searchParams }: Props) {
  const { userId } = await requireUserId("/admin/subscriptions");
  const { vista } = await searchParams;
  const showResolved = vista === "resueltos";

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

  const city = await getActiveCity();
  const timezone = city?.timezone ?? "America/Bogota";
  const supabase = await createClient();

  const [requestsResult, counts] = await Promise.all([
    showResolved
      ? supabase
          .from("venue_subscription_requests")
          .select(REQUEST_SELECT)
          .in("status", ["approved", "rejected"])
          .gte("reviewed_at", recentReviewCutoffIso())
          .order("reviewed_at", { ascending: false })
      : supabase
          .from("venue_subscription_requests")
          .select(REQUEST_SELECT)
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
    getAdminQueueCounts(),
  ]);
  const { data: requests, error } = requestsResult;

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />

      <header className="page-head page-head-compact">
        <p className="eyebrow">Moderación · pagos</p>
        <h1>Solicitudes Premium</h1>
        <p className="lede">
          Confrontá el comprobante con la referencia declarada. Al aprobar se activa la
          suscripción, se verifica la cancha y queda la factura.
        </p>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Vista de solicitudes">
        <Link
          href="/admin/subscriptions"
          role="tab"
          aria-selected={!showResolved}
          className={!showResolved ? "is-on" : undefined}
        >
          Por revisar ({counts.pendingSubRequests})
        </Link>
        <Link
          href="/admin/subscriptions?vista=resueltos"
          role="tab"
          aria-selected={showResolved}
          className={showResolved ? "is-on" : undefined}
        >
          Resueltos · 48 h
        </Link>
      </div>

      {error ? (
        <p className="form-error">Error cargando solicitudes: {error.message}</p>
      ) : (
        <AdminSubscriptionRequestsPanel
          requests={withQueueAges(
            (requests ?? []) as Omit<AdminSubscriptionRequest, keyof Aged>[],
          )}
          timezone={timezone}
        />
      )}
    </main>
  );
}
