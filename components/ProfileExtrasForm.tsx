"use client";

import { useActionState, useState } from "react";
import { saveProfileExtrasAction } from "@/app/perfil/actions";
import type { Sport } from "@/lib/constants";
import {
  playerGenderLabel,
  positionLabel,
  preferredFootLabel,
  timePeriodLabel,
  weekdayLabel,
} from "@/lib/labels";
import {
  PLAYER_GENDERS,
  PREFERRED_FEET,
  PROFILE_TIME_SLOTS,
  WEEKDAYS,
  sportUsesPreferredFoot,
} from "@/lib/player-card";
import { positionsForSport } from "@/lib/sport-rules";
import type { ProfileWithContact } from "@/lib/types";

type State = { error?: string; ok?: boolean } | null;

function toggleValue(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function ProfileExtrasForm({
  profile,
  neighborhoods,
}: {
  profile: ProfileWithContact;
  neighborhoods: string[];
}) {
  const sport = profile.preferred_sport as Sport;
  const positions = positionsForSport(sport).filter((item) => item !== "any" && item !== profile.preferred_position);
  const [days, setDays] = useState<string[]>(profile.preferred_days ?? []);
  const [slots, setSlots] = useState<string[]>(profile.preferred_time_slots ?? []);
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => saveProfileExtrasAction(formData),
    null,
  );

  return (
    <form action={action} className="stack-form profile-form">
      {days.map((day) => (
        <input key={day} type="hidden" name="preferred_days" value={day} />
      ))}
      {slots.map((slot) => (
        <input key={slot} type="hidden" name="preferred_time_slots" value={slot} />
      ))}

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Ubicación</legend>
        <p className="profile-form-section-lede">Ayuda a cruzar partidos cerca tuyo.</p>
        <label>
          Barrio
          <input
            name="neighborhood"
            list="bafut-barrios"
            maxLength={80}
            defaultValue={profile.neighborhood ?? ""}
            placeholder="Ej. Riomar"
          />
          <datalist id="bafut-barrios">
            {neighborhoods.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>
      </fieldset>

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Disponibilidad</legend>
        <p className="profile-form-section-lede">Elegí uno o más. Ninguno te bloquea el cupo.</p>
        <div className="profile-form-subgroup">
          <p className="profile-form-subgroup-label" id="profile-days-label">
            Días que te pinta jugar
          </p>
          <div className="ficha-choice-grid" role="group" aria-labelledby="profile-days-label">
            {WEEKDAYS.map((day) => {
              const selected = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  className={`ficha-choice${selected ? " is-on" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setDays((current) => toggleValue(current, day))}
                >
                  {weekdayLabel[day]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="profile-form-subgroup">
          <p className="profile-form-subgroup-label" id="profile-slots-label">
            Horario
          </p>
          <div className="ficha-choice-grid" role="group" aria-labelledby="profile-slots-label">
            {PROFILE_TIME_SLOTS.map((slot) => {
              const selected = slots.includes(slot);
              return (
                <button
                  key={slot}
                  type="button"
                  className={`ficha-choice${selected ? " is-on" : ""}`}
                  aria-pressed={selected}
                  onClick={() => setSlots((current) => toggleValue(current, slot))}
                >
                  {timePeriodLabel[slot]}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      {(sportUsesPreferredFoot(sport) || positions.length > 0) ? (
        <fieldset className="profile-form-section">
          <legend className="profile-form-section-title">Juego</legend>
          <div className="profile-form-grid is-2">
            {sportUsesPreferredFoot(sport) ? (
              <label>
                Pierna hábil
                <select name="preferred_foot" defaultValue={profile.preferred_foot ?? ""}>
                  <option value="">Todavía no</option>
                  {PREFERRED_FEET.map((foot) => (
                    <option key={foot} value={foot}>
                      {preferredFootLabel[foot]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {positions.length > 0 ? (
              <label>
                Posición secundaria
                <select name="secondary_position" defaultValue={profile.secondary_position ?? ""}>
                  <option value="">Ninguna</option>
                  {positions.map((item) => (
                    <option key={item} value={item}>
                      {positionLabel[item as keyof typeof positionLabel] ?? item}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Datos personales</legend>
        <div className="profile-form-grid is-2">
          <label>
            Fecha de nacimiento
            <input type="date" name="birth_date" defaultValue={profile.birth_date ?? ""} />
          </label>
          <label>
            Género
            <select name="gender" defaultValue={profile.gender ?? ""}>
              <option value="">Todavía no</option>
              {PLAYER_GENDERS.map((item) => (
                <option key={item} value={item}>
                  {playerGenderLabel[item]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="profile-form-grid is-2">
          <label>
            Altura (cm)
            <input
              name="height_cm"
              inputMode="numeric"
              min={120}
              max={230}
              defaultValue={profile.height_cm ?? ""}
              placeholder="175"
            />
          </label>
          <label>
            Peso (kg)
            <input
              name="weight_kg"
              inputMode="numeric"
              min={35}
              max={180}
              defaultValue={profile.weight_kg ?? ""}
              placeholder="72"
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="profile-form-section">
        <legend className="profile-form-section-title">Preferencias</legend>
        <label className="check-line">
          <input type="checkbox" name="plays_for_pay" defaultChecked={profile.plays_for_pay} />
          Cobro por jugar
        </label>
        <p className="profile-form-hint">
          BaFut no cobra ni paga ese arreglo. Solo queda como dato en tu carta para que el host sepa.
        </p>
      </fieldset>

      <div aria-live="polite">
        {state?.error ? <p className="profile-form-status is-error">{state.error}</p> : null}
        {state?.ok ? (
          <p className="profile-form-status is-ok">El resto de la carta quedó guardado.</p>
        ) : null}
      </div>

      <div className="profile-form-actions">
        <button className="btn-turf" type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar extras"}
        </button>
      </div>
    </form>
  );
}
