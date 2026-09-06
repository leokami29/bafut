import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VenueClaimForm } from "@/components/VenueClaimForm";
import { requireUserId } from "@/lib/auth";
import { getVenueBySlug } from "@/lib/data";
import { getActiveCity } from "@/lib/data";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reclamar cancha",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string }> };

export default async function VenueClaimPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/reclamar`);
  const city = await getActiveCity();

  if (!city) {
    notFound();
  }

  const venue = await getVenueBySlug(city.id, slug);

  if (!venue) {
    notFound();
  }

  // Si ya tiene dueño y no es el usuario actual, no permitir reclamar
  if (venue.owner_id && venue.owner_id !== userId) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Cancha ya reclamada</h1>
          <p>Esta cancha ya tiene un dueño registrado.</p>
        </header>
        <p className="foot-link">
          <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page page-narrow" id="main">
      <p className="venue-back">
        <Link href={`/canchas/${slug}`}>← Volver a la cancha</Link>
      </p>
      <header className="page-head">
        <p className="eyebrow">Reclamar cancha</p>
        <h1>{venue.name}</h1>
        <p className="lede">
          ¿Sos el dueño o administrador de esta cancha? Reclamala para acceder al panel de administración.
        </p>
      </header>

      <VenueClaimForm venueId={venue.id} venueName={venue.name} slug={slug} />
    </main>
  );
}
