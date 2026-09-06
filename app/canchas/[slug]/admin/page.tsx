import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueAdminDashboard } from "@/components/VenueAdminDashboard";
import { requireUserId } from "@/lib/auth";
import { getVenueBySlug } from "@/lib/data";
import { getActiveCity } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Administrar cancha",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

export default async function VenueAdminPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/admin`);
  const city = await getActiveCity();

  if (!city) {
    notFound();
  }

  const venue = await getVenueBySlug(city.id, slug);

  if (!venue) {
    notFound();
  }

  // Verificar que el usuario sea el dueño o admin
  const supabase = await createClient();

  const isOwner = venue.owner_id === userId;
  const { data: isAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .single();

  if (!isOwner && !isAdmin) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos para administrar esta cancha.</p>
        </header>
        <p className="foot-link">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Administración · {city.name}</p>
        <h1>{venue.name}</h1>
        <p className="lede">
          Gestioná tu cancha, subí fotos y revisá las estadísticas de partidos.
        </p>
      </header>

      <VenueAdminDashboard
        venue={venue}
        userId={userId}
        isAdmin={!!isAdmin}
      />
    </main>
  );
}
