import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MatchFeed } from "@/components/MatchFeed";
import { RosterSkeleton } from "@/components/RosterSkeleton";
import { getActiveCity, getUpcomingMatches } from "@/lib/data";
import {
  RADAR_DESCRIPTION,
  RADAR_TITLE,
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
} from "@/lib/seo";

const partidosUrl = absoluteUrl("/partidos");

export const metadata: Metadata = {
  title: RADAR_TITLE,
  description: RADAR_DESCRIPTION,
  alternates: { canonical: partidosUrl },
  openGraph: defaultOg({
    title: fullTitle(RADAR_TITLE),
    description: RADAR_DESCRIPTION,
    url: partidosUrl,
  }),
  twitter: defaultTwitter({
    title: fullTitle(RADAR_TITLE),
    description: RADAR_DESCRIPTION,
  }),
};

export default async function PartidosPage() {
  const city = await getActiveCity();
  if (!city) {
    return (
      <main className="page" id="main">
        <h1>No hay ciudad activa</h1>
      </main>
    );
  }

  const matches = await getUpcomingMatches(city.id);

  return (
    <main className="page page-partidos" id="main">
      <header className="page-head page-head-row">
        <div>
          <p className="eyebrow">Radar · {city.name}</p>
          <h1>Huecos abiertos</h1>
          <p className="lede">
            Entrá a una pateada de hoy o publicá tu hueco. Compartí el link en tu grupo de WhatsApp.
          </p>
        </div>
        <Link className="btn-flood page-head-cta" href="/partidos/nuevo">
          Publicar hueco
        </Link>
      </header>

      <Suspense fallback={<RosterSkeleton rows={5} />}>
        <MatchFeed matches={matches} timezone={city.timezone} cityName={city.name} />
      </Suspense>
    </main>
  );
}
