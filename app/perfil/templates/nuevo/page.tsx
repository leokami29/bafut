import type { Metadata } from "next";
import Link from "next/link";
import { TemplateForm } from "@/components/TemplateForm";
import { requireUserId } from "@/lib/auth";
import { getVenuesByCity } from "@/lib/data";
import { getActiveCity } from "@/lib/data";
import { robotsNoIndexNoFollow } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Nuevo template",
  robots: robotsNoIndexNoFollow,
};

export default async function NewTemplatePage() {
  const { userId } = await requireUserId("/perfil/templates");
  const city = await getActiveCity();
  if (!city) {
    return (
      <main className="page page-nuevo-partido" id="main">
        <header className="page-head match-compose-head">
          <p className="eyebrow">Templates recurrentes</p>
          <h1>No hay ciudad activa</h1>
          <p className="lede">Elige una ciudad para crear el template.</p>
        </header>
      </main>
    );
  }

  const venues = await getVenuesByCity(city.id);

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/perfil/templates">← Templates</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Templates recurrentes · {city.name}</p>
        <h1>Nuevo template</h1>
        <p className="lede">
          Creá un template y BaFut publicará automáticamente un partido cada semana en el día y hora que elijas.
        </p>
      </header>

      <TemplateForm venues={venues} userId={userId} />

      <p className="foot-link">
        <Link href="/perfil/templates">← Volver a templates</Link>
      </p>
    </main>
  );
}
