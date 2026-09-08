import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  VenueBookingInbox,
  type VenueBookingInboxRow,
} from "@/components/VenueBookingInbox";
import { VenueAdminNav } from "@/components/VenueAdminNav";
import { withQueueAges } from "@/lib/admin-queues";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reservas de la cancha",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

const BOOKING_SELECT = `
  id, venue_id, status, sport, starts_at, duration_min, final_cop,
  deposit_pct, deposit_cop, amount_cop,
  payment_method, contact_whatsapp, proof_path, note, hold_expires_at,
  reject_reason, created_at, decided_at
`;

export default async function VenueTurnosAdminPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/admin/turnos`);
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
          <p>No tenés permisos para revisar las reservas de esta cancha.</p>
        </header>
        <p className="foot-link">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
      </main>
    );
  }

  const [{ data: bookings }, { data: photos }, { count: promoCount }, { data: pendingReq }] =
    await Promise.all([
      supabase
        .from("venue_bookings")
        .select(BOOKING_SELECT)
        .eq("venue_id", venue.id)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase.from("venue_photos").select("id").eq("venue_id", venue.id),
      supabase
        .from("venue_promotions")
        .select("id", { count: "exact", head: true })
        .eq("venue_id", venue.id)
        .eq("active", true),
      supabase
        .from("venue_subscription_requests")
        .select("id")
        .eq("venue_id", venue.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle(),
    ]);

  const rows = (bookings ?? []) as VenueBookingInboxRow[];
  const pendingRows = withQueueAges(rows.filter((b) => b.status === "pending"));
  const historyRows = withQueueAges(
    rows.filter((b) => b.status !== "pending" && b.status !== "hold"),
  );

  return (
    <main className="page page-venue-admin" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}/admin`}>← Volver al panel</Link>
      </p>
      <header className="page-head page-head-compact">
        <p className="eyebrow">Administración · {city.name}</p>
        <h1>Reservas · {venue.name}</h1>
        <p className="lede">
          Revisá comprobantes, confirmá o rechazá pedidos. El hold de un pendiente es de 4 horas.
        </p>
      </header>

      <Suspense fallback={<div className="venue-admin-board admin-board" aria-hidden="true" />}>
        <VenueAdminNav
          venueSlug={slug}
          counts={{
            photos: photos?.length ?? 0,
            pendingPremium: pendingReq ? 1 : 0,
            promotions: promoCount ?? 0,
            pendingTurnos: pendingRows.length,
          }}
        />
      </Suspense>

      {!venue.booking_enabled ? (
        <p className="field-help venue-booking-flag-hint">
          Esta cancha todavía no acepta reservas. Activalo en{" "}
          <Link href={`/canchas/${slug}/admin`}>Mesa</Link>.
        </p>
      ) : null}

      <VenueBookingInbox
        slug={slug}
        venueId={venue.id}
        venueName={venue.name}
        timezone={city.timezone}
        pending={pendingRows}
        history={historyRows}
      />
    </main>
  );
}
