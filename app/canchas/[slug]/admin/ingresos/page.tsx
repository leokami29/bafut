import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RevenueDashboard } from "@/components/RevenueDashboard";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Ingresos estimados",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

export default async function VenueRevenuePage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/admin/ingresos`);
  const city = await getActiveCity();

  if (!city) {
    notFound();
  }

  const venue = await getVenueBySlug(city.id, slug);

  if (!venue) {
    notFound();
  }

  const supabase = await createClient();

  const isOwner = venue.owner_id === userId;
  const { data: isAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!isOwner && !isAdmin) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos para ver los ingresos de esta cancha.</p>
        </header>
        <p className="foot-link">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
      </main>
    );
  }

  // Cargar partidos del mes actual con pricing
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id,
      starts_at,
      duration_min,
      status,
      match_slots (id),
      matches_pricing_snapshot (final_cop, base_cop, discount_cop, promo_id)
    `,
    )
    .eq("venue_id", venue.id)
    .gte("starts_at", startOfMonth)
    .lte("starts_at", endOfMonth)
    .order("starts_at", { ascending: true });

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}/admin`}>← Volver al panel</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Administración · {city.name}</p>
        <h1>Ingresos estimados · {venue.name}</h1>
        <p className="lede">
          Partidos publicados este mes con sus precios. Los montos son estimados basados en los
          snapshots de pricing al momento de crear cada partido.
        </p>
      </header>

      <RevenueDashboard
        venueId={venue.id}
        venueName={venue.name}
        matches={matches ?? []}
        month={now.getMonth()}
        year={now.getFullYear()}
      />
    </main>
  );
}
