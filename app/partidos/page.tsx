import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MatchFeed } from "@/components/MatchFeed";
import { RosterSkeleton } from "@/components/RosterSkeleton";
import { getActiveCity, getUpcomingMatches } from "@/lib/data";

export const metadata: Metadata = {
  title: "Radar",
  description: "Huecos abiertos hoy para armar la pateada en Barranquilla.",
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
