import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PriceDashboard, type PriceSectionTab } from "@/components/PriceDashboard";
import { VenueAdminNav } from "@/components/VenueAdminNav";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Precios de la cancha",
  robots: robotsNoIndex,
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; crear?: string }>;
};

function parsePriceTab(raw: string | undefined): PriceSectionTab {
  if (raw === "minimo" || raw === "promos" || raw === "semana") return raw;
  return "semana";
}

export default async function VenuePricingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { tab: tabRaw, crear } = await searchParams;
  const initialTab = parsePriceTab(tabRaw);
  const openCreatePromo = crear === "1";
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

  const [{ data: slots }, { data: mins }, { data: defaults }, { data: promotions }, { data: photos }, { count: pendingTurnosCount }] =
    await Promise.all([
      supabase
        .from("venue_price_slots")
        .select("*")
        .eq("venue_id", venue.id)
        .order("day_of_week")
        .order("start_time"),
      supabase.from("venue_pricing_min").select("sport, min_minutes").eq("venue_id", venue.id),
      supabase.from("venue_pricing_default").select("*").eq("venue_id", venue.id),
      supabase
        .from("venue_promotions")
        .select("*")
        .eq("venue_id", venue.id)
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabase.from("venue_photos").select("id").eq("venue_id", venue.id),
      supabase
        .from("venue_bookings")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", venue.id)
        .eq("status", "pending"),
    ]);

  const { data: pendingReq } = await supabase
    .from("venue_subscription_requests")
    .select("id")
    .eq("venue_id", venue.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  const typedPromotions = (promotions ?? []).map((p) => ({
    ...p,
    kind: p.kind as "override_slot" | "discount_pct",
  }));

  const lede =
    initialTab === "promos"
      ? "Creá descuentos o precios cerrados para horarios valle. Se aplican al publicar un partido."
      : initialTab === "minimo"
        ? "Definí el bloque mínimo con el que se factura cada partido."
        : "Franjas por día, duración mínima y promociones. Configurar precios no activa Reservar: eso se hace en Mesa.";

  return (
    <main className="page page-venue-admin" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}/admin`}>← Volver al panel</Link>
      </p>
      <header className="page-head page-head-compact">
        <p className="eyebrow">Precios · {city.name}</p>
        <h1>Precios de {venue.name}</h1>
        <p className="lede">{lede}</p>
      </header>

      <Suspense fallback={<div className="venue-admin-board admin-board" aria-hidden="true" />}>
        <VenueAdminNav
          venueSlug={slug}
          counts={{
            photos: photos?.length ?? 0,
            pendingPremium: pendingReq ? 1 : 0,
            promotions: typedPromotions.length,
            pendingTurnos: pendingTurnosCount ?? 0,
          }}
        />
      </Suspense>

      <Suspense fallback={<p className="field-help">Cargando precios…</p>}>
        <PriceDashboard
          venueId={venue.id}
          venueSlug={slug}
          sports={venue.sports ?? ["futbol"]}
          initialSlots={slots ?? []}
          initialMins={mins ?? []}
          initialDefaults={defaults ?? []}
          initialPromotions={typedPromotions}
          initialTab={initialTab}
          openCreatePromo={openCreatePromo}
        />
      </Suspense>
    </main>
  );
}
