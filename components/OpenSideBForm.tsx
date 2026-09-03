"use client";

import { useActionState } from "react";
import { openMatchSideBAction } from "@/app/actions";
import { LEVELS } from "@/lib/constants";
import { levelLabel, positionLabel } from "@/lib/labels";
import { positionsForSport, type Sport } from "@/lib/sport-rules";

type State = { error?: string } | null;

export function OpenSideBForm({
  matchId,
  shareCode,
  sport,
}: {
  matchId: string;
  shareCode: string;
  sport: Sport;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => openMatchSideBAction(formData),
    null,
  );
  const positions = positionsForSport(sport);

  return (
    <form action={action} className="open-side-b-form">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="share_code" value={shareCode} />
      <p className="open-side-b-copy">
        Esto es el equipo <strong>en contra</strong>. Si sos del mismo grupo, uníte a los cupos
        libres. Hora y cancha se heredan; no se pide otra.
      </p>
      <div className="form-split">
        <label>
          Cupos del otro lado
          <select name="open_count" defaultValue="2">
            <option value="1">1 cupo</option>
            <option value="2">2 cupos</option>
          </select>
        </label>
        <label>
          Posición
          <select name="position" defaultValue="any">
            {positions.map((item) => (
              <option key={item} value={item}>
                {positionLabel[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Nivel
          <select name="level" defaultValue="any">
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {levelLabel[level]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      <button className="btn-flood" type="submit" disabled={pending}>
        {pending ? "Abriendo…" : "Pedir el otro lado"}
      </button>
    </form>
  );
}
