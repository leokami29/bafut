"use client";

import { useActionState } from "react";
import { createMatchAction } from "@/app/actions";
import { VenuePicker } from "@/components/VenuePicker";
import { FORMATS, GENDERS, LEVELS, POSITIONS, SPORTS } from "@/lib/constants";
import { defaultStartsAtLocal } from "@/lib/datetime";
import { formatLabel, genderLabel, levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import type { City, Venue } from "@/lib/types";

type State = { error?: string } | null;

export function CreateMatchForm({
  city,
  venues,
  defaultVenueId,
}: {
  city: City;
  venues: Venue[];
  defaultVenueId?: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => createMatchAction(formData),
    null,
  );

  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="city_slug" value={city.slug} />

      <VenuePicker venues={venues} defaultVenueId={defaultVenueId} />

      <label>
        Hora
        <input type="datetime-local" name="starts_at" required defaultValue={defaultStartsAtLocal()} />
      </label>

      <div className="form-split">
        <label>
          Deporte
          <select name="sport" defaultValue="futbol">
            {SPORTS.map((sport) => (
              <option key={sport} value={sport}>
                {sportLabel[sport]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Formato
          <select name="format" defaultValue="5v5">
            {FORMATS.map((format) => (
              <option key={format} value={format}>
                {formatLabel[format]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-split">
        <label>
          Faltan
          <input type="number" name="open_count" min={1} max={12} defaultValue={2} />
        </label>
        <label>
          Duración (min)
          <select name="duration_min" defaultValue="60">
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
          </select>
        </label>
      </div>

      <label>
        Precio por persona (COP)
        <input type="number" name="cost_per_person" min={0} step={500} placeholder="15000" />
      </label>

      <div className="form-split">
        <label>
          Posición
          <select name="position" defaultValue="any">
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {positionLabel[position]}
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

      <label className="check-line">
        <input type="checkbox" name="need_keeper" />
        El primero es arquero
      </label>

      <label>
        Quién juega
        <select name="gender_policy" defaultValue="mixed">
          {GENDERS.map((gender) => (
            <option key={gender} value={gender}>
              {genderLabel[gender]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Nota (opcional)
        <textarea name="notes" rows={3} placeholder="Punto de encuentro, chalecos, nivel del piquete…" />
      </label>

      <div aria-live="polite">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
      </div>

      <button className="btn-flood" type="submit" disabled={pending}>
        {pending ? "Publicando…" : "Publicar hueco"}
      </button>
    </form>
  );
}
