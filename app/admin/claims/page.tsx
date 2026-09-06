import type { Metadata } from "next";
import Link from "next/link";
import { AdminClaimsPanel, type AdminVenueClaim } from "@/components/AdminClaimsPanel";
import { requireUserId } from "@/lib/auth";
import { getActiveCity } from "@/lib/data";
import { recentReviewCutoffIso } from "@/lib/venue-claims";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reclamos de cancha pendientes",
  robots: robotsNoIndex,
};

export default async function AdminClaimsPage() {
  const { userId } = await requireUserId("/admin/claims");
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

  // Pendientes + resueltos en las últimas 24 h (para avisar al dueño tras aprobar/rechazar).
  const { data: claims, error } = await supabase
    .from("venue_claims")
    .select(
      `id, created_at, status, reject_reason, reviewed_at, whatsapp, email, note,
       proof_facade, proof_nit, proof_call_note,
       venues ( name, slug, neighborhood ),
       profiles!venue_claims_user_id_fkey ( display_name )`,
    )
    .or(
      `status.eq.pending,and(status.in.(approved,rejected),reviewed_at.gte.${recentReviewCutoffIso()})`,
    )
    .order("created_at", { ascending: true });

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/admin/venues">← Canchas</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Moderación</p>
        <h1>Reclamos pendientes</h1>
        <p className="lede">
          Verificá cada reclamo antes de aprobar: foto de fachada, NIT/razón social o nota de
          llamada. Sin al menos una prueba no se puede aprobar. Al aprobar, la cancha pasa a
          ese usuario con sello de verificada.
        </p>
      </header>

      {error ? (
        <p className="form-error">Error cargando reclamos: {error.message}</p>
      ) : (
        <AdminClaimsPanel claims={(claims ?? []) as AdminVenueClaim[]} timezone={timezone} />
      )}
    </main>
  );
}
