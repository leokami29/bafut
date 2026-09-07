import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceDashboard } from "@/components/PriceDashboard";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Precios de la cancha",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

export default async function VenuePricingPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/admin/precios`);
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
          <p>No tenés permisos para administrar los precios de esta cancha.</p>
        </header>
        <p className="foot-link">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
      </main>
    );
  }

  // Cargar configuración de pricing
  const [{ data: slots }, { data: minData }, { data: defaults }, { data: promotions }] = await Promise.all([
    supabase.from("venue_price_slots").select("*").eq("venue_id", venue.id).order("day_of_week").order("start_time"),
    supabase.from("venue_pricing_min").select("*").eq("venue_id", venue.id),
    supabase.from("venue_pricing_default").select("*").eq("venue_id", venue.id),
    supabase.from("venue_promotions").select("*").eq("venue_id", venue.id).eq("active", true).order("created_at", { ascending: false }),
  ]);

  const typedPromotions = (promotions ?? []).map((p) => ({
    ...p,
    kind: p.kind as "override_slot" | "discount_pct",
  }));

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}/admin`}>← Volver al panel</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Administración · {city.name}</p>
        <h1>Precios de {venue.name}</h1>
        <p className="lede">
          Configurá las franjas horarias, duración mínima y promociones para cada deporte.
        </p>
      </header>

      <PriceDashboard
        venueId={venue.id}
        venueName={venue.name}
        sports={venue.sports ?? ["futbol"]}
        initialSlots={slots ?? []}
        initialMin={minData?.[0]?.min_minutes ?? 60}
        initialDefaults={defaults ?? []}
        initialPromotions={typedPromotions}
      />
    </main>
  );
}
