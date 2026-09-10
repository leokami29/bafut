"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptChallengeFullTeamAction, type MutationActionState } from "@/app/actions";

export function AcceptChallengeCard({
  matchId,
  shareCode,
  userId,
  hostTeamName,
}: {
  matchId: string;
  shareCode: string;
  userId: string | null;
  hostTeamName?: string | null;
}) {
  const [state, formAction, isPending] = useActionState<MutationActionState | null, FormData>(
    async (_prev, formData) => {
      return acceptChallengeFullTeamAction(formData);
    },
    null,
  );


  return (
    <aside className="challenge-accept-card" aria-labelledby="challenge-accept-title">
      <div className="challenge-accept-head">
        <span className="challenge-tag">⚔️ Modo Reto</span>
        <h3 id="challenge-accept-title" className="challenge-accept-title">
          {hostTeamName ? `¿Tu equipo le juega a ${hostTeamName}?` : "¿Tienes tu equipo completo?"}
        </h3>
        <p className="challenge-accept-desc">
          Si ya tienes a tu combo completo, desafíalos en bloque y pacten el partido de una vez.
        </p>
      </div>

      {userId ? (
        <form action={formAction} className="challenge-accept-form">
          <input type="hidden" name="match_id" value={matchId} />
          <input type="hidden" name="share_code" value={shareCode} />
          <div className="form-row">
            <label className="field-label" htmlFor="challenge-team-name">
              Nombre de tu equipo
            </label>
            <input
              id="challenge-team-name"
              name="team_name"
              type="text"
              required
              minLength={2}
              maxLength={60}
              placeholder="Ej: Los Amigos FC, Deportivo Pasto"
              className="field-input"
            />
          </div>

          <button className="btn-flood btn-challenge" type="submit" disabled={isPending}>
            {isPending ? "Aceptando reto…" : "⚔️ Aceptar reto con mi equipo"}
          </button>

          {state?.error ? <p className="form-error" role="alert">{state.error}</p> : null}
        </form>
      ) : (
        <div className="challenge-accept-auth">
          <Link className="btn-flood btn-challenge" href={`/entrar?next=/p/${shareCode}`}>
            Entrá para aceptar el reto con tu equipo
          </Link>
        </div>
      )}
    </aside>
  );
}
