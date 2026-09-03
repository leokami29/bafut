import type { Metadata } from "next";
import { CreateMatchForm } from "@/components/CreateMatchForm";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug, getVenuesByCity } from "@/lib/data";

export const metadata: Metadata = {
  title: "Publicar hueco",
};

export default async function NuevoPartidoPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  await requireUserId("/partidos/nuevo");
  const city = await getActiveCity();
  const { venue: venueSlug } = await searchParams;

  if (!city) {
    return (
      <main className="page" id="main">
        <h1>No hay ciudad activa</h1>
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
        <p>Cancha, hora y cuántos faltan. El link se comparte al grupo.</p>
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
