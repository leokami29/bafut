import type { Metadata } from "next";
import Link from "next/link";
import { AdminClaimsPanel, type AdminVenueClaim } from "@/components/AdminClaimsPanel";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts, withQueueAges, type Aged } from "@/lib/admin-queues";
import { getActiveCity, getIsAdmin } from "@/lib/data";
import { recentReviewCutoffIso } from "@/lib/venue-claims";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reclamos de cancha pendientes",
  robots: robotsNoIndex,
};

type Props = {
  searchParams: Promise<{ vista?: string }>;
};

const CLAIM_SELECT = `id, created_at, status, reject_reason, reviewed_at, whatsapp, email, note,
  proof_facade, proof_nit, proof_call_note,
  venues ( name, slug, neighborhood ),
  profiles!venue_claims_user_id_fkey ( display_name )`;

export default async function AdminClaimsPage({ searchParams }: Props) {
  const { userId } = await requireUserId("/admin/claims");
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

  const [claimsResult, counts] = await Promise.all([
    showResolved
      ? supabase
          .from("venue_claims")
          .select(CLAIM_SELECT)
          .in("status", ["approved", "rejected"])
          .gte("reviewed_at", recentReviewCutoffIso())
          .order("reviewed_at", { ascending: false })
      : supabase
          .from("venue_claims")
          .select(CLAIM_SELECT)
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
    getAdminQueueCounts(),
  ]);
  const { data: claims, error } = claimsResult;

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />

      <header className="page-head page-head-compact">
        <p className="eyebrow">Moderación</p>
        <h1>Reclamos de cancha</h1>
        <p className="lede">
          Sin al menos una prueba verificada no se aprueba. Al aprobar, la ficha pasa a ese
          usuario con sello de verificada.
        </p>
      </header>

      <div className="admin-tabs" role="tablist" aria-label="Vista de reclamos">
        <Link
          href="/admin/claims"
          role="tab"
          aria-selected={!showResolved}
          className={!showResolved ? "is-on" : undefined}
        >
          Pendientes ({counts.pendingClaims})
        </Link>
        <Link
          href="/admin/claims?vista=resueltos"
          role="tab"
          aria-selected={showResolved}
          className={showResolved ? "is-on" : undefined}
        >
          Resueltos · 24 h ({counts.resolvedClaims24h})
        </Link>
      </div>

      {error ? (
        <p className="form-error">Error cargando reclamos: {error.message}</p>
      ) : (
        <AdminClaimsPanel
          claims={withQueueAges((claims ?? []) as Omit<AdminVenueClaim, keyof Aged>[])}
          timezone={timezone}
        />
      )}
    </main>
  );
}
