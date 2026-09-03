import type { Metadata } from "next";
import { CreateMatchForm } from "@/components/CreateMatchForm";
import { CitySwitcher } from "@/components/CitySwitcher";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getCities, getVenueBySlug, getVenuesByCity } from "@/lib/data";

export const metadata: Metadata = {
  title: "Publicar hueco",
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
      <main className="page page-narrow page-nuevo-partido" id="main">
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
    <main className="page page-narrow page-nuevo-partido" id="main">
      <header className="page-head match-compose-head">
        <p className="eyebrow">Publicar</p>
        <h1>Publicar un hueco</h1>
        <p className="lede">
          Arma el partido: deporte, cancha, hora y cupos. El link se comparte al grupo.
        </p>
        {preselected ? (
          <p className="match-compose-preselect" role="status">
            <span className="match-compose-preselect-label">Cancha lista</span>
            <span className="match-compose-preselect-name">{preselected.name}</span>
          </p>
        ) : null}
      </header>
      <CreateMatchForm city={city} venues={venues} defaultVenueId={preselected?.id} />
    </main>
  );
}
