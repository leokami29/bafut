import type { Metadata } from "next";
import Link from "next/link";
import { AdminClaimsPanel, type AdminVenueClaim } from "@/components/AdminClaimsPanel";
import { requireUserId } from "@/lib/auth";
import { getActiveCity } from "@/lib/data";
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

  const { data: claims, error } = await supabase
    .from("venue_claims")
    .select(
      `id, created_at, whatsapp, email, note,
       venues ( name, slug, neighborhood ),
       profiles!venue_claims_user_id_fkey ( display_name )`,
    )
    .eq("status", "pending")
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
          Verificá cada reclamo antes de aprobar: llamá a la recepción, chequeá el grupo de
          WhatsApp o el contacto declarado. Al aprobar, la cancha pasa a ese usuario con sello
          de verificada.
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
