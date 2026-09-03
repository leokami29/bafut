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
      <main className="page page-narrow" id="main">
        <h1>No hay ciudad activa</h1>
        <p>Elige una ciudad para publicar el hueco.</p>
        {cities.length > 0 ? <CitySwitcher cities={cities} current={undefined} /> : null}
      </main>
    );
  }

  const [venues, preselected] = await Promise.all([
    getVenuesByCity(city.id),
    venueSlug ? getVenueBySlug(city.id, venueSlug) : Promise.resolve(null),
  ]);

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>Publicar hueco</h1>
        <p>Deporte primero, luego cancha y cupos. El link se comparte al grupo.</p>
        {preselected ? (
          <p className="form-ok" role="status">
            Cancha preseleccionada: {preselected.name}
          </p>
        ) : null}
      </header>
      <CreateMatchForm city={city} venues={venues} defaultVenueId={preselected?.id} />
    </main>
  );
}
