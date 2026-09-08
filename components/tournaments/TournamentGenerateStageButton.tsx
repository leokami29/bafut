"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  generateKnockoutStageAction,
  generateStageAction,
  type TournamentActionResult,
} from "@/app/canchas/[slug]/admin/torneos/actions";
import type { TournamentFormat } from "@/lib/tournaments/authz";
import { tournamentFormatLabel } from "@/lib/tournaments/labels";
import { defaultGroupCount } from "@/lib/tournaments/service";

type State = TournamentActionResult | null;

type GenerateProps = {
  slug: string;
  tournamentId: string;
  teamCount: number;
  format: TournamentFormat;
  disabled?: boolean;
};

function generateButtonLabel(format: TournamentFormat, pending: boolean): string {
  if (pending) return "Generando…";
  switch (format) {
    case "round_robin":
      return "Generar liga (todos contra todos)";
    case "groups_knockout":
      return "Generar fase de grupos";
    case "double_elim":
      return "Generar llave (doble elim)";
    default:
      return "Generar llave (single elim)";
  }
}

export function TournamentGenerateStageButton({
  slug,
  tournamentId,
  teamCount,
  format,
  disabled = false,
}: GenerateProps) {
  const router = useRouter();
  const suggestedGroups = defaultGroupCount(format, teamCount);
  const showGroupCount = format === "groups_knockout";
  const minTeams = format === "groups_knockout" ? 4 : 2;

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const groupRaw = Number(formData.get("group_count"));
      const result = await generateStageAction(slug, tournamentId, {
        groupCount: Number.isFinite(groupRaw) ? groupRaw : undefined,
      });
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );

  const busy = pending || disabled || teamCount < minTeams;

  return (
    <form action={action} className="tournament-generate">
      {showGroupCount ? (
        <label>
          Cantidad de grupos
          <select
            name="group_count"
            defaultValue={String(suggestedGroups)}
            disabled={busy}
          >
            {[2, 3, 4]
              .filter((n) => teamCount / n >= 2)
              .map((n) => (
                <option key={n} value={n}>
                  {n} grupos
                </option>
              ))}
          </select>
        </label>
      ) : null}
      <button type="submit" className="btn-flood" disabled={busy}>
        {generateButtonLabel(format, pending)}
      </button>
      {teamCount < minTeams ? (
        <p className="field-help">
          Necesitás al menos {minTeams} equipos
          {format === "groups_knockout" ? " para grupos + llave" : ""}.
        </p>
      ) : (
        <p className="field-help">
          {tournamentFormatLabel[format]} · {teamCount} equipos
          {showGroupCount ? ` · sugerido ${suggestedGroups} grupos` : ""}. El
          torneo pasará a «En curso».
        </p>
      )}
      {state?.ok === false ? <p className="form-error">{state.error}</p> : null}
      {state?.ok === true ? (
        <p className="form-ok">{state.message ?? "Stage generado."}</p>
      ) : null}
    </form>
  );
}

type KnockoutProps = {
  slug: string;
  tournamentId: string;
  disabled?: boolean;
};

export function TournamentGenerateKnockoutButton({
  slug,
  tournamentId,
  disabled = false,
}: KnockoutProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (): Promise<State> => {
      const result = await generateKnockoutStageAction(slug, tournamentId, {
        qualifyPerGroup: 2,
      });
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );

  const busy = pending || disabled;

  return (
    <form action={action} className="tournament-generate">
      <button type="submit" className="btn-flood" disabled={busy}>
        {pending ? "Generando llave…" : "Generar llave (clasificados)"}
      </button>
      <p className="field-help">
        Fase de grupos completa. Se clasifican los 2 mejores de cada grupo.
      </p>
      {state?.ok === false ? <p className="form-error">{state.error}</p> : null}
      {state?.ok === true ? (
        <p className="form-ok">{state.message ?? "Llave generada."}</p>
      ) : null}
    </form>
  );
}
