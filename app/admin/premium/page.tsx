import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminPremiumConsole,
  type AdminPremiumSubRow,
} from "@/components/AdminPremiumConsole";
import {
  AdminSubscriptionRequestsPanel,
  type AdminSubscriptionRequest,
} from "@/components/AdminSubscriptionRequestsPanel";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { getAdminRole, isBillingAdmin } from "@/lib/admin-auth";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts, withQueueAges, type Aged } from "@/lib/admin-queues";
import { getActiveCity, getIsAdmin } from "@/lib/data";
import { getPremiumPlanConfig } from "@/lib/premium-config";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Consola Premium",
  robots: robotsNoIndex,
};

type Props = {
  searchParams: Promise<{ tab?: string; venue?: string; vista?: string }>;
};

const TABS = ["subs", "otorgar", "solicitudes", "config"] as const;
type Tab = (typeof TABS)[number];

function parseTab(raw: string | undefined): Tab {
  if (raw && (TABS as readonly string[]).includes(raw)) return raw as Tab;
  return "subs";
}

function recentReviewCutoffIso(hours = 48) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

const REQUEST_SELECT = `id, venue_id, created_at, status, plan, payment_method, amount_cop,
  payment_reference, proof_path, reject_reason, reviewed_at,
  invoice_number, subscription_id, duration_days,
  venues ( name, slug, neighborhood ),
  profiles!venue_subscription_requests_user_id_fkey ( display_name )`;

const SUB_SELECT = `id, venue_id, plan, status, started_at, expires_at, amount_cop, payment_method,
  venues ( name, slug, neighborhood )`;

export default async function AdminPremiumPage({ searchParams }: Props) {
  const { userId } = await requireUserId("/admin/premium");
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const showResolved = params.vista === "resueltos";

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

  const role = await getAdminRole(userId);
  const canEdit = isBillingAdmin(role);
  const counts = await getAdminQueueCounts();
  const city = await getActiveCity();
  const timezone = city?.timezone ?? "America/Bogota";
  const config = await getPremiumPlanConfig();
  const supabase = await createClient();

  const [{ data: subs }, { data: venues }, requestsResult] = await Promise.all([
    supabase
      .from("venue_subscriptions")
      .select(SUB_SELECT)
      .eq("plan", "premium")
      .order("expires_at", { ascending: false })
      .limit(200),
    supabase
      .from("venues")
      .select("id, name, slug, neighborhood")
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(500),
    tab === "solicitudes"
      ? showResolved
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
            .order("created_at", { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ]);

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />

      <header className="page-head page-head-compact">
        <p className="eyebrow">Billing · Premium</p>
        <h1>Consola Premium</h1>
        <p className="lede">
          Otorgá, extendé o cancelá suscripciones con fechas y monto. Las solicitudes con
          comprobante siguen en la pestaña Solicitudes. Torneos también requieren{" "}
          <Link href="/admin/flags">flag venue_tournaments</Link>.
        </p>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Consola Premium">
        {(
          [
            ["subs", "Suscripciones"],
            ["otorgar", "Otorgar"],
            ["solicitudes", `Solicitudes (${counts.pendingSubRequests})`],
            ["config", "Config"],
          ] as const
        ).map(([id, label]) => (
          <Link
            key={id}
            href={`/admin/premium?tab=${id}`}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "is-on" : undefined}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "solicitudes" ? (
        <>
          <div className="admin-tabs" role="tablist" aria-label="Vista de solicitudes">
            <Link
              href="/admin/premium?tab=solicitudes"
              role="tab"
              aria-selected={!showResolved}
              className={!showResolved ? "is-on" : undefined}
            >
              Por revisar ({counts.pendingSubRequests})
            </Link>
            <Link
              href="/admin/premium?tab=solicitudes&vista=resueltos"
              role="tab"
              aria-selected={showResolved}
              className={showResolved ? "is-on" : undefined}
            >
              Resueltos · 48 h
            </Link>
          </div>
          {requestsResult.error ? (
            <p className="form-error">
              Error cargando solicitudes: {requestsResult.error.message}
            </p>
          ) : (
            <AdminSubscriptionRequestsPanel
              requests={withQueueAges(
                (requestsResult.data ?? []) as Omit<AdminSubscriptionRequest, keyof Aged>[],
              )}
              timezone={timezone}
            />
          )}
        </>
      ) : (
        <AdminPremiumConsole
          tab={tab}
          subs={(subs ?? []) as AdminPremiumSubRow[]}
          venues={venues ?? []}
          config={{
            dailyRateCop: config.dailyRateCop,
            defaultDurationDays: config.defaultDurationDays,
            listPriceCop: config.listPriceCop,
            fromDb: config.fromDb,
          }}
          canEdit={canEdit}
          preselectVenueId={params.venue ?? null}
        />
      )}
    </main>
  );
}
