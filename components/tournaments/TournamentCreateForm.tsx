"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createTournamentAction,
  type TournamentActionResult,
} from "@/app/canchas/[slug]/admin/torneos/actions";
import {
  TOURNAMENT_FORMATS,
  TOURNAMENT_SPORTS,
  type TournamentFormat,
  type TournamentSport,
} from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
} from "@/lib/tournaments/labels";

type State = TournamentActionResult | null;

type Props = {
  slug: string;
  venueId: string;
};

const FORMAT_HINT: Record<TournamentFormat, string> = {
  single_elim: "Llave de eliminación directa.",
  double_elim: "Perdedores pasan a llave inferior hasta ser eliminados dos veces.",
  round_robin: "Todos contra todos; tabla de posiciones por puntos.",
  groups_knockout: "Fase de grupos y luego llave con los clasificados.",
};

export function TournamentCreateForm({ slug, venueId }: Props) {
  const router = useRouter();
  const [format, setFormat] = useState<TournamentFormat>("single_elim");
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const sport = String(formData.get("sport") ?? "futbol") as TournamentSport;
      const name = String(formData.get("name") ?? "").trim();
      const formatValue = String(formData.get("format") ?? "single_elim");
      const maxTeamsRaw = Number(formData.get("max_teams"));
      const visibility = String(formData.get("visibility") ?? "private");
      const status = String(formData.get("status") ?? "registration");

      const result = await createTournamentAction(slug, {
        venueId,
        name,
        sport,
        format: formatValue as TournamentFormat,
        maxTeams: Number.isFinite(maxTeamsRaw) ? maxTeamsRaw : 8,
        visibility: visibility === "published" ? "published" : "private",
        status: status === "draft" ? "draft" : "registration",
      });
      if (result.ok) {
        router.refresh();
        router.push(`/canchas/${slug}/admin/torneos/${result.id}`);
      }
      return result;
    },
    null,
  );

  return (
    <form action={action} className="stack-form tournament-form">
      <label>
        Nombre del torneo
        <input
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder="Copa Pádel Park Open"
          autoComplete="off"
          disabled={pending}
        />
      </label>

      <div className="form-split tournament-form-split">
        <label>
          Deporte
          <select name="sport" defaultValue="padel" disabled={pending}>
            {TOURNAMENT_SPORTS.map((s) => (
              <option key={s} value={s}>
                {tournamentSportLabel[s]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Formato
          <select
            name="format"
            value={format}
            disabled={pending}
            onChange={(e) => setFormat(e.target.value as TournamentFormat)}
          >
            {TOURNAMENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {tournamentFormatLabel[f]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="field-help">{FORMAT_HINT[format]}</p>

      <div className="form-split tournament-form-split">
        <label>
          Máx. equipos
          <input
            name="max_teams"
            type="number"
            min={2}
            max={32}
            defaultValue={8}
            disabled={pending}
          />
        </label>

        <label>
          Visibilidad
          <select name="visibility" defaultValue="private" disabled={pending}>
            <option value="private">Privado (solo staff)</option>
            <option value="published">Público</option>
          </select>
        </label>
      </div>

      <label>
        Estado inicial
        <select name="status" defaultValue="registration" disabled={pending}>
          <option value="registration">Inscripción</option>
          <option value="draft">Borrador</option>
        </select>
      </label>

      <button type="submit" className="btn-flood" disabled={pending}>
        {pending ? "Creando…" : "Crear torneo"}
      </button>

      {state?.ok === false ? <p className="form-error">{state.error}</p> : null}
      {state?.ok === true ? (
        <p className="form-ok">Torneo creado. Abrí el detalle para inscribir equipos.</p>
      ) : null}
    </form>
  );
}
