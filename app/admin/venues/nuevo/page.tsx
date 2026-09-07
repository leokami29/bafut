import type { Metadata } from "next";
import Link from "next/link";
import { VenueCreateForm } from "@/components/VenueCreateForm";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts } from "@/lib/admin-queues";
import { getActiveCity, getIsAdmin } from "@/lib/data";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Crear cancha",
  robots: robotsNoIndex,
};

export default async function NewVenueAdminPage() {
  const { userId } = await requireUserId("/admin/venues/nuevo");

  if (!(await getIsAdmin(userId))) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>Solo los administradores de BaFut pueden crear fichas de cancha.</p>
          <p className="foot-link">
            <Link href="/admin/venues">← Volver a canchas</Link>
          </p>
        </header>
      </main>
    );
  }

  const city = await getActiveCity();
  const counts = await getAdminQueueCounts();

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />
      <header className="page-head page-head-compact">
        <p className="eyebrow">Alta · {city?.name ?? "BaFut"}</p>
        <h1>Crear cancha</h1>
        <p className="lede">
          Alta de una ficha nueva en el directorio. Los campos marcados * son obligatorios.
        </p>
      </header>

      {city ? (
        <VenueCreateForm
          cityId={city.id}
          cityName={city.name}
          cityCenter={{ lat: city.lat, lng: city.lng }}
        />
      ) : (
        <p className="form-error">No hay ciudad activa. Verificá el seed de cities.</p>
      )}
    </main>
  );
}
