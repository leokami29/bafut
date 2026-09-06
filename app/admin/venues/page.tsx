import type { Metadata } from "next";
import Link from "next/link";
import { VenueAdminPanel } from "@/components/VenueAdminPanel";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Administrar canchas",
  robots: robotsNoIndex,
};

export default async function AdminVenuesPage() {
  const { userId } = await requireUserId("/admin/venues");

  const supabase = await createClient();

  // Verificar que el usuario sea admin
  const { data: adminData } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (!adminData) {
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

  // Cola de moderación de reclamos (dueños que reclaman su cancha).
  const { count: pendingClaims } = await supabase
    .from("venue_claims")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  return (
    <main className="page page-nuevo-partido" id="main">
      <header className="page-head match-compose-head">
        <p className="eyebrow">Panel de administración</p>
        <h1>Gestión de canchas</h1>
        <p className="lede">
          Administrá las canchas, suscripciones y verificaciones de BaFut.{" "}
          <Link href="/admin/claims">
            Reclamos pendientes
            {pendingClaims ? ` (${pendingClaims})` : ""}
          </Link>
        </p>
      </header>

      <VenueAdminPanel venues={venues || []} />
    </main>
  );
}
