import type { Metadata } from "next";
import Link from "next/link";
import { VenueAdminPanel } from "@/components/VenueAdminPanel";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts } from "@/lib/admin-queues";
import { getIsAdmin } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Administrar canchas",
  robots: robotsNoIndex,
};

export default async function AdminVenuesPage() {
  const { userId } = await requireUserId("/admin/venues");

  if (!(await getIsAdmin(userId))) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos de administrador.</p>
        </header>
        <p className="foot-link">
          <Link href="/">← Volver al inicio</Link>
        </p>
      </main>
    );
  }

  const supabase = await createClient();

  // Obtener todas las canchas con información de suscripción
  const { data: venues, error } = await supabase
    .from("venues")
    .select(`
      *,
      venue_subscriptions (
        id,
        plan,
        status,
        expires_at
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Error cargando canchas</h1>
          <p>{error.message}</p>
        </header>
      </main>
    );
  }

  const counts = await getAdminQueueCounts();

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />

      <header className="page-head page-head-compact">
        <p className="eyebrow">Directorio</p>
        <h1>Gestión de canchas</h1>
        <p className="lede">
          {counts.totalVenues} fichas: verificación, suscripciones y estado. Pasá el cursor por
          una fila para ver la ficha completa.
        </p>
      </header>

      <VenueAdminPanel venues={venues || []} />
    </main>
  );
}
