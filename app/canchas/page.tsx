import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, venueDirectoryJsonLd } from "@/components/JsonLd";
import { VenueDirectory } from "@/components/VenueDirectory";
import { getActiveCity, getUpcomingMatches, getVenuesByCity } from "@/lib/data";
import {
  DIRECTORY_DESCRIPTION,
  DIRECTORY_TITLE,
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
} from "@/lib/seo";
import { aggregateVenueDemand } from "@/lib/venue-demand";

const canchasUrl = absoluteUrl("/canchas");

export const metadata: Metadata = {
  title: DIRECTORY_TITLE,
  description: DIRECTORY_DESCRIPTION,
  alternates: { canonical: canchasUrl },
  openGraph: defaultOg({
    title: fullTitle(DIRECTORY_TITLE),
    description: DIRECTORY_DESCRIPTION,
    url: canchasUrl,
  }),
  twitter: defaultTwitter({
    title: fullTitle(DIRECTORY_TITLE),
    description: DIRECTORY_DESCRIPTION,
  }),
};

export default async function CanchasPage() {
  const city = await getActiveCity();
  if (!city) {
    return (
      <main className="page" id="main">
        <h1>No hay ciudad activa</h1>
      </main>
    );
  }
  const [venues, matches] = await Promise.all([
    getVenuesByCity(city.id),
    getUpcomingMatches(city.id),
  ]);
  const demandByVenueId = aggregateVenueDemand(matches, city.timezone);
  const withDemand = Object.values(demandByVenueId).filter((d) => d.matchCount > 0).length;

  return (
    <main className="page page-canchas" id="main">
      <JsonLd data={venueDirectoryJsonLd(venues, city.name)} />
      <header className="page-head page-head-compact">
        <p className="eyebrow">Dónde se está armando · {city.name}</p>
        <h1>Canchas sintéticas en {city.name}</h1>
        <p className="lede">
          {withDemand > 0
            ? `${venues.length} canchas en ${city.name} · ${withDemand} con huecos abiertos para partidos de fútbol 5/7. `
            : `${venues.length} canchas en ${city.name} para armar pateadas de fútbol. BaFut no reserva: marcas el punto y armas el partido. `}
          <Link href="/partidos">Ver partidos y huecos abiertos</Link>.
        </p>
      </header>
      <VenueDirectory
        venues={venues}
        center={{ lat: city.lat, lng: city.lng }}
        demandByVenueId={demandByVenueId}
      />
    </main>
  );
}
