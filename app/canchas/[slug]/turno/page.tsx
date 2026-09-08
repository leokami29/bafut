import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueBookingForm } from "@/components/VenueBookingForm";
import { requireUserId } from "@/lib/auth";
import {
  bookableSportsForVenue,
  BOOKING_HOLD_HOURS,
  venueHasUsableBookingPricing,
} from "@/lib/booking";
import { getActiveCity, getVenueBySlug, getVenuePublicPricing } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Pedir turno",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

export default async function VenueBookingPage({ params }: Props) {
  const { slug } = await params;

  if (!(await isFeatureEnabled("venue_booking"))) {
    notFound();
  }

  await requireUserId(`/canchas/${slug}/turno`);

  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  if (!venue.owner_id || !venue.booking_enabled) {
    notFound();
  }

  const pricing = await getVenuePublicPricing(venue.id);
  const sports = bookableSportsForVenue(pricing, venue.sports ?? undefined);

  if (!venueHasUsableBookingPricing(pricing, venue.sports ?? undefined) || sports.length === 0) {
    return (
      <main className="page page-narrow page-venue-booking" id="main">
        <p className="venue-back">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
        <header className="page-head">
          <p className="eyebrow">Pedir turno</p>
          <h1>{venue.name}</h1>
        </header>
        <p role="status">
          Esta cancha aún no tiene precios publicados para alquilar un horario. Probá más tarde o
          publicá un hueco.
        </p>
        <div className="empty-home-actions">
          <Link href={`/partidos/nuevo?venue=${slug}`} className="btn-flood">
            Publicar hueco
          </Link>
        </div>
      </main>
    );
  }

  const minBySport = Object.fromEntries(
    pricing.mins.map((m) => [m.sport, m.min_minutes]),
  );

  return (
    <main className="page page-nuevo-partido page-venue-booking" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Alquilar horario</p>
        <h1>Pedir turno · {venue.name}</h1>
        <p className="lede">
          Elegí deporte, día y franja libre. Pagás el monto completo, subís el comprobante y el
          dueño confirma (hold {BOOKING_HOLD_HOURS} h). No es pedir cupo en un partido.
        </p>
      </header>
      <VenueBookingForm
        venueId={venue.id}
        venueSlug={venue.slug}
        venueName={venue.name}
        timeZone={city.timezone}
        sports={sports}
        minBySport={minBySport}
      />
    </main>
  );
}
