import type { Metadata } from "next";
import Link from "next/link";
import { CreateMatchForm } from "@/components/CreateMatchForm";
import { CitySwitcher } from "@/components/CitySwitcher";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getCities, getVenueBySlug, getVenuesByCity } from "@/lib/data";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Publicar hueco",
  robots: robotsNoIndex,
};

export default async function NuevoPartidoPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  await requireUserId("/partidos/nuevo");
  const [city, cities] = await Promise.all([getActiveCity(), getCities()]);
  const { venue: venueSlug } = await searchParams;

  if (!city) {
    return (
      <main className="page page-nuevo-partido" id="main">
        <p className="venue-back">
          <Link href="/partidos">← Partidos</Link>
        </p>
        <header className="page-head match-compose-head">
          <p className="eyebrow">Publicar</p>
          <h1>No hay ciudad activa</h1>
          <p className="lede">Elige una ciudad para armar el partido.</p>
        </header>
        {cities.length > 0 ? <CitySwitcher cities={cities} current={undefined} /> : null}
      </main>
    );
  }

  const [venues, preselected] = await Promise.all([
    getVenuesByCity(city.id),
    venueSlug ? getVenueBySlug(city.id, venueSlug) : Promise.resolve(null),
  ]);

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/partidos">← Partidos</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Publicar · {city.name}</p>
        <h1>Publicar un hueco</h1>
        <p className="lede">
          Arma el partido: deporte, cancha, hora y cupos. El link se comparte al grupo.
        </p>
        <div className="venue-badges" aria-label="Contexto del hueco">
          <span className="venue-badge is-neighborhood">{city.name}</span>
          {preselected ? <span className="venue-badge">{preselected.name}</span> : null}
          {preselected?.neighborhood ? (
            <span className="venue-badge">{preselected.neighborhood}</span>
          ) : null}
        </div>
      </header>
      <CreateMatchForm city={city} venues={venues} defaultVenueId={preselected?.id} />
    </main>
  );
}
