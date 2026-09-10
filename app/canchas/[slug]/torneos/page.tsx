import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VenueTournamentsHub } from "@/components/tournaments/VenueTournamentsHub";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { tryCreateServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { listVenueTournaments } from "@/lib/tournaments/load";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
} from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = await getActiveCity();
  const venue = city ? await getVenueBySlug(city.id, slug) : null;
  const title = venue ? `Torneos y Campeonatos · ${venue.name}` : "Torneos";
  const description = venue
    ? `Consulta llaves oficiales, tablas de clasificación y fixtures de torneos en ${venue.name} (${city?.name ?? "Colombia"}).`
    : "Torneos y fixtures de la cancha.";
  const url = absoluteUrl(`/canchas/${slug}/torneos`);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: defaultOg({ title: fullTitle(title), description, url }),
    twitter: defaultTwitter({ title: fullTitle(title), description }),
  };
}

export default async function VenueTournamentsPublicPage({ params }: Props) {
  const { slug } = await params;
  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const flagOn = await isFeatureEnabled("venue_tournaments");
  const supabase = tryCreateServiceClient() ?? (await createClient());
  const tournaments = flagOn
    ? await listVenueTournaments(supabase, venue.id, { publishedOnly: true })
    : [];

  return (
    <main className="page page-tournament-hub-main" id="main">
      <VenueTournamentsHub
        tournaments={tournaments}
        venue={{
          id: venue.id,
          name: venue.name,
          slug: venue.slug,
          neighborhood: venue.neighborhood,
          address: venue.address,
          phone: venue.phone,
          sports: venue.sports,
        }}
        cityName={city.name}
      />
    </main>
  );
}
