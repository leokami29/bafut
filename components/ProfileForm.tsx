"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions";
import { LEVELS, POSITIONS, SPORTS } from "@/lib/constants";
import { levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import type { City, Profile } from "@/lib/types";

type State = { error?: string; ok?: boolean } | null;

export function ProfileForm({
  profile,
  cities,
  citySlug,
  completenessHint,
}: {
  profile: Profile;
  cities: City[];
  citySlug: string;
  completenessHint?: string | null;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => updateProfileAction(formData),
    null,
  );

  return (
    <form action={action} className="stack-form">
      {completenessHint ? (
        <p className="profile-hint" role="status">
          {completenessHint}
        </p>
      ) : null}
      <label>
        Cómo te dicen
        <input name="display_name" required minLength={2} defaultValue={profile.display_name} />
      </label>
      <label>
        Ciudad
        <select name="city_slug" defaultValue={citySlug}>
          {cities.map((city) => (
            <option key={city.id} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-split">
        <label>
          Deporte
          <select name="preferred_sport" defaultValue={profile.preferred_sport}>
            {SPORTS.map((sport) => (
              <option key={sport} value={sport}>
                {sportLabel[sport]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Posición
          <select name="preferred_position" defaultValue={profile.preferred_position}>
            {POSITIONS.map((position) => (
              <option key={position} value={position}>
                {positionLabel[position]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Nivel
        <select name="level" defaultValue={profile.level}>
          {LEVELS.filter((level) => level !== "any").map((level) => (
            <option key={level} value={level}>
              {levelLabel[level]}
            </option>
          ))}
        </select>
      </label>
      <div aria-live="polite">
        {state?.error ? <p className="form-error">{state.error}</p> : null}
        {state?.ok ? <p className="form-ok">Quedó guardado.</p> : null}
      </div>
      <button className="btn-flood" type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
