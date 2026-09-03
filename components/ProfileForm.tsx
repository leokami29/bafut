"use client";

import { useActionState, useMemo, useState } from "react";
import { updateProfileAction } from "@/app/actions";
import { LEVELS, SPORTS, type Sport } from "@/lib/constants";
import { formatWhatsappDisplay, normalizeWhatsapp } from "@/lib/whatsapp-contact";
import { levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import { positionsForSport } from "@/lib/sport-rules";
import type { City, ProfileWithContact } from "@/lib/types";

type State = { error?: string; ok?: boolean } | null;

export function ProfileForm({
  profile,
  cities,
  citySlug,
  completenessHint,
  nextPath,
}: {
  profile: ProfileWithContact;
  cities: City[];
  citySlug: string;
  completenessHint?: string | null;
  nextPath?: string;
}) {
  const initialSport = (SPORTS as readonly string[]).includes(profile.preferred_sport)
    ? (profile.preferred_sport as Sport)
    : "futbol";
  const [sport, setSport] = useState<Sport>(initialSport);
  const positions = positionsForSport(sport);
  const whatsappDisplay = useMemo(() => {
    if (!profile.whatsapp) return "";
    const digits = profile.whatsapp.startsWith("57") ? profile.whatsapp.slice(2) : profile.whatsapp;
    return digits;
  }, [profile.whatsapp]);

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => updateProfileAction(formData),
    null,
  );

  return (
    <form action={action} className="stack-form">
      {nextPath ? <input type="hidden" name="next" value={nextPath} /> : null}
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
        WhatsApp
        <input
          name="whatsapp"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="3001234567"
          defaultValue={whatsappDisplay}
          aria-describedby="whatsapp-help"
        />
      </label>
      <p id="whatsapp-help" className="field-help">
        Solo lo ve la otra parte cuando confirman el cupo. Ejemplo:{" "}
        {formatWhatsappDisplay(normalizeWhatsapp("3001234567") ?? "573001234567")}
      </p>
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
          <select
            name="preferred_sport"
            value={sport}
            onChange={(e) => setSport(e.target.value as Sport)}
          >
            {SPORTS.map((item) => (
              <option key={item} value={item}>
                {sportLabel[item]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Posición
          <select
            name="preferred_position"
            defaultValue={
              (positions as readonly string[]).includes(profile.preferred_position)
                ? profile.preferred_position
                : "any"
            }
            key={sport}
          >
            {positions.map((position) => (
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
        {pending ? "Guardando…" : nextPath ? "Guardar y volver" : "Guardar"}
      </button>
    </form>
  );
}
