"use client";

import { useActionState } from "react";
import { openMatchSideBAction } from "@/app/actions";
import { LEVELS } from "@/lib/constants";
import { levelLabel, positionLabel } from "@/lib/labels";
import { humanizeSideBError } from "@/lib/occupancy";
import { positionsForSport, type Sport } from "@/lib/sport-rules";

type State = { error?: string } | null;

export function OpenSideBForm({
  matchId,
  shareCode,
  sport,
  compact = false,
}: {
  matchId: string;
  shareCode: string;
  sport: Sport;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => openMatchSideBAction(formData),
    null,
  );
  const positions = positionsForSport(sport);
  const error = state?.error ? humanizeSideBError(state.error) : null;

  return (
    <form action={action} className={`open-side-b-form ${compact ? "is-compact" : ""}`}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="share_code" value={shareCode} />

      <p className="open-side-b-question">¿Cuántos faltan en el otro equipo?</p>
      <p className="open-side-b-copy">
        Misma cancha y hora. Acá pedís cupos para jugarles — no para sumarte a ellos.
      </p>

      <div className="open-side-b-fields">
        <fieldset className="open-side-b-count">
          <legend className="sr-only">Cupos del otro equipo</legend>
          <label className="open-side-b-count-option">
            <input type="radio" name="open_count" value="1" />
            <span>
              <strong>1 cupo</strong>
              <em>Falta uno</em>
            </span>
          </label>
          <label className="open-side-b-count-option">
            <input type="radio" name="open_count" value="2" defaultChecked />
            <span>
              <strong>2 cupos</strong>
              <em>Faltan dos</em>
            </span>
          </label>
        </fieldset>

        <label className="open-side-b-position">
          Posición que buscan
          <select name="position" defaultValue="any">
            {positions.map((item) => (
              <option key={item} value={item}>
                {positionLabel[item]}
              </option>
            ))}
          </select>
        </label>

        {!compact ? (
          <label className="open-side-b-level">
            Nivel
            <select name="level" defaultValue="any">
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {levelLabel[level]}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="level" value="any" />
        )}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      <button className="btn-flood" type="submit" disabled={pending}>
        {pending ? "Armando…" : "Armar el rival acá"}
      </button>
    </form>
  );
}
