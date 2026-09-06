import type { Metadata } from "next";
import Link from "next/link";
import { TemplateList } from "@/components/TemplateList";
import { requireUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Templates recurrentes",
  robots: robotsNoIndex,
};

export default async function TemplatesPage() {
  const { userId } = await requireUserId("/perfil/templates");
  const supabase = await createClient();

  const { data: templates, error } = await supabase
    .from("match_templates")
    .select("*, venues(name)")
    .eq("host_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="page page-narrow" id="main">
        <h1>Templates</h1>
        <p className="form-error">Error cargando templates: {error.message}</p>
      </main>
    );
  }

  return (
    <main className="page page-nuevo-partido" id="main">
      <header className="page-head match-compose-head">
        <div>
          <p className="eyebrow">Partidos recurrentes</p>
          <h1>Tus templates</h1>
          <p className="lede">
            BaFut publica automáticamente un partido cada semana según tus templates.
            Podés pausar o editar en cualquier momento.
          </p>
        </div>
        <Link className="btn-flood page-head-cta" href="/perfil/templates/nuevo">
          Nuevo template
        </Link>
      </header>

      <TemplateList templates={templates ?? []} userId={userId} />

      <p className="foot-link">
        <Link href="/perfil">← Volver al perfil</Link>
      </p>
    </main>
  );
}
