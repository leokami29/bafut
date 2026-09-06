import type { Metadata } from "next";
import Link from "next/link";
import { TemplateForm } from "@/components/TemplateForm";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getVenuesByCity } from "@/lib/data";
import { getActiveCity } from "@/lib/data";
import { robotsNoIndexNoFollow } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Editar template",
  robots: robotsNoIndexNoFollow,
};

type Props = { params: Promise<{ id: string }> };

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params;
  const { userId } = await requireUserId("/perfil/templates");
  const city = await getActiveCity();
  if (!city) {
    return (
      <main className="page page-nuevo-partido" id="main">
        <header className="page-head match-compose-head">
          <p className="eyebrow">Templates recurrentes</p>
          <h1>No hay ciudad activa</h1>
          <p className="lede">Elige una ciudad para editar el template.</p>
        </header>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from("match_templates")
    .select("*, venues(name)")
    .eq("id", id)
    .eq("host_id", userId)
    .single();

  if (error || !template) {
    return (
      <main className="page page-nuevo-partido" id="main">
        <p className="venue-back">
          <Link href="/perfil/templates">← Templates</Link>
        </p>
        <header className="page-head match-compose-head">
          <p className="eyebrow">Templates recurrentes</p>
          <h1>Template no encontrado</h1>
          <p className="lede">El template que buscás no existe o no te pertenece.</p>
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
        <h1>Editar template</h1>
        <p className="lede">
          Modificá los detalles del template. Los cambios se aplicarán a los próximos partidos que se creen.
        </p>
      </header>

      <TemplateForm
        venues={venues}
        userId={userId}
        editTemplate={template}
      />

      <p className="foot-link">
        <Link href="/perfil/templates">← Volver a templates</Link>
      </p>
    </main>
  );
}
