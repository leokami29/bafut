import type { Metadata } from "next";
import { VenueDirectory } from "@/components/VenueDirectory";
import { getActiveCity, getVenuesByCity } from "@/lib/data";

export const metadata: Metadata = {
  title: "Canchas",
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
  const venues = await getVenuesByCity(city.id);

  return (
    <main className="page page-canchas" id="main">
      <header className="page-head page-head-compact">
        <p className="eyebrow">{city.name}</p>
        <h1>Canchas</h1>
        <p className="lede">
          {venues.length} canchas en el mapa. BaFut no reserva: marcas el punto y armas el partido.
        </p>
      </header>
      <VenueDirectory venues={venues} center={{ lat: city.lat, lng: city.lng }} />
    </main>
  );
}
