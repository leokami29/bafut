import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JsonLd, matchRadarJsonLd } from "@/components/JsonLd";
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
      <JsonLd data={matchRadarJsonLd(matches, city.name)} />
      <header className="page-head page-head-row">
        <div>
          <p className="eyebrow">Radar · {city.name}</p>
          <h1>Partidos y huecos abiertos</h1>
          <p className="lede">
            Pateadas de fútbol 5 y 7 con cupos en canchas sintéticas de {city.name}. Entrá a una de
            hoy o{" "}
            <Link href="/partidos/nuevo">publicá tu hueco</Link>
            {" · "}
            <Link href="/canchas">ver canchas</Link>.
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
