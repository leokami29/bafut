import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueBookingForm } from "@/components/VenueBookingForm";
import { requireUserId } from "@/lib/auth";
import {
  bookableSportsForVenue,
  BOOKING_HOLD_HOURS,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_MIN_LEAD_HOURS,
  localDayKey,
  venueHasUsableBookingPricing,
} from "@/lib/booking";
import { getActiveCity, getVenueBySlug, getVenuePublicPricing } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reservar",
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
  const todayYmd = localDayKey(new Date(), city.timezone);

  if (!venueHasUsableBookingPricing(pricing, venue.sports ?? undefined) || sports.length === 0) {
    return (
      <main className="page page-narrow page-venue-booking" id="main">
        <p className="venue-back">
          <Link href={`/canchas/${slug}`}>← Volver a la ficha</Link>
        </p>
        <header className="page-head venue-booking-head">
          <h1>{venue.name}</h1>
          <p className="venue-booking-product">Reservar · Alquilar horario</p>
          <p className="lede">
            Pagás la franja al dueño con comprobante. No es publicar un hueco para juntar gente.
          </p>
        </header>
        <div className="venue-booking-empty" role="status">
          <p>
            Esta cancha aún no tiene tarifas publicadas para alquilar un horario. Probá más
            tarde o pedile al dueño que configure precios.
          </p>
        </div>
        <div className="venue-booking-alt">
          <p className="venue-booking-alt-copy">¿Preferís juntar gente?</p>
          <Link href={`/partidos/nuevo?venue=${slug}`} className="btn-ghost">
            Publicar hueco
          </Link>
        </div>
      </main>
    );
  }

  const minBySport = Object.fromEntries(
    pricing.mins.map((m) => [m.sport, m.min_minutes]),
  );

  const promotions = pricing.promotions.filter(
    (p) => !p.date_end || p.date_end >= todayYmd,
  );

  return (
    <main className="page page-nuevo-partido page-venue-booking" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}`}>← Volver a la ficha</Link>
      </p>
      <header className="page-head venue-booking-head">
        <h1>{venue.name}</h1>
        <p className="venue-booking-product">Reservar · Alquilar horario</p>
        <p className="lede">
          Pagás la franja al dueño con comprobante (hold {BOOKING_HOLD_HOURS} h). No es
          publicar un hueco para juntar gente.
        </p>
        <p className="venue-booking-rules field-help">
          Lead {BOOKING_MIN_LEAD_HOURS} h · hasta {BOOKING_MAX_HORIZON_DAYS} días · grilla
          06–23
        </p>
      </header>
      <VenueBookingForm
        venueId={venue.id}
        venueSlug={venue.slug}
        venueName={venue.name}
        timeZone={city.timezone}
        sports={sports}
        minBySport={minBySport}
        promotions={promotions}
        pricingSlots={pricing.slots}
        pricingDefaults={pricing.defaults}
        todayYmd={todayYmd}
        ownerWhatsapp={venue.contact_whatsapp}
      />
      <div className="venue-booking-alt">
        <p className="venue-booking-alt-copy">¿Preferís juntar gente?</p>
        <Link href={`/partidos/nuevo?venue=${slug}`} className="btn-ghost">
          Publicar hueco
        </Link>
      </div>
    </main>
  );
}
