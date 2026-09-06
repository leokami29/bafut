"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sportLabel } from "@/lib/labels";

type Template = {
  id: string;
  venue_id: string;
  sport: string;
  format: string;
  day_of_week: number;
  starts_at_time: string;
  duration_min: number;
  open_count: number;
  cost_per_person: number | null;
  gender_policy: string;
  notes: string | null;
  active: boolean;
  venues: { name: string };
};

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type TemplateListProps = {
  templates: Template[];
  userId: string;
};

export function TemplateList({ templates, userId }: TemplateListProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [localTemplates, setLocalTemplates] = useState(templates);

  async function toggleActive(template: Template) {
    setPending(template.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("match_templates")
      .update({ active: !template.active, updated_at: new Date().toISOString() })
      .eq("id", template.id)
      .eq("host_id", userId);

    if (!error) {
      // Actualizar estado local para feedback inmediato
      setLocalTemplates((prev) =>
        prev.map((t) =>
          t.id === template.id ? { ...t, active: !t.active } : t,
        ),
      );
      router.refresh();
    }
    setPending(null);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("¿Eliminar este template? Los partidos ya creados no se afectan.")) return;
    setPending(id);
    const supabase = createClient();
    const { error } = await supabase
      .from("match_templates")
      .delete()
      .eq("id", id)
      .eq("host_id", userId);

    if (!error) {
      setLocalTemplates((prev) => prev.filter((t) => t.id !== id));
      router.refresh();
    }
    setPending(null);
  }

  if (localTemplates.length === 0) {
    return (
      <div className="empty">
        <p>No tenés templates creados.</p>
        <p className="field-help">
          Creá un template y BaFut publicará automáticamente un partido cada semana en el día y hora que elijas.
        </p>
      </div>
    );
  }

  return (
    <ul className="roster">
      {localTemplates.map((t) => (
        <li key={t.id} className="template-row">
          <div className="template-info">
            <strong>
              {t.venues.name} · {sportLabel[t.sport as keyof typeof sportLabel] ?? t.sport} {t.format}
            </strong>
            <span>
              {DAYS[t.day_of_week]} {t.starts_at_time} · {t.duration_min} min · {t.open_count} cupos
            </span>
            <span className={`template-status ${t.active ? "active" : "paused"}`}>
              {t.active ? "Activo" : "Pausado"}
            </span>
          </div>
          <div className="template-actions">
            <Link href={`/perfil/templates/${t.id}`} className="btn-ghost">
              Editar
            </Link>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => toggleActive(t)}
              disabled={pending === t.id}
            >
              {pending === t.id ? "..." : t.active ? "Pausar" : "Activar"}
            </button>
            <button
              type="button"
              className="btn-bib"
              onClick={() => deleteTemplate(t.id)}
              disabled={pending === t.id}
            >
              {pending === t.id ? "..." : "Eliminar"}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
