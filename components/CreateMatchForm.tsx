"use client";

import { useActionState, useMemo, useState } from "react";
import { createMatchAction } from "@/app/actions";
import { VenuePicker } from "@/components/VenuePicker";
import { GENDERS, LEVELS, SPORTS, type Format, type Sport } from "@/lib/constants";
import { defaultStartsAtLocal } from "@/lib/datetime";
import { formatLabel, genderLabel, levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import {
  defaultFormatForSport,
  formatsForSport,
  positionAllowedForSport,
  positionsForSport,
  SPORT_RULES,
  venuesForSport,
} from "@/lib/sport-rules";
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
  const preselected = venues.find((v) => v.id === defaultVenueId);
  const initialSport: Sport =
    (preselected?.sports?.find((s): s is Sport => (SPORTS as readonly string[]).includes(s)) as Sport | undefined) ??
    "futbol";

  const [sport, setSport] = useState<Sport>(initialSport);
  const [format, setFormat] = useState<Format>(defaultFormatForSport(initialSport));
  const [position, setPosition] = useState("any");
  const [step, setStep] = useState<1 | 2>(1);

  const sportVenues = useMemo(() => venuesForSport(venues, sport), [venues, sport]);
  const formats = formatsForSport(sport);
  const positions = positionsForSport(sport);
  const hasKeeper = SPORT_RULES[sport].hasKeeper;
  const activeFormat = formats.includes(format) ? format : defaultFormatForSport(sport);
  const activePosition = positionAllowedForSport(sport, position as never) ? position : "any";

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => createMatchAction(formData),
    null,
  );

  function chooseSport(next: Sport) {
    setSport(next);
    setFormat(defaultFormatForSport(next));
    setPosition("any");
  }

  return (
    <form action={action} className="stack-form create-match-form">
      <input type="hidden" name="city_slug" value={city.slug} />
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="format" value={activeFormat} />
      <input type="hidden" name="position" value={activePosition} />

      <div className="create-steps" role="tablist" aria-label="Pasos para publicar">
        <button
          type="button"
          role="tab"
          aria-selected={step === 1}
          className={step === 1 ? "is-on" : undefined}
          onClick={() => setStep(1)}
        >
          1. Deporte y cancha
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={step === 2}
          className={step === 2 ? "is-on" : undefined}
          onClick={() => setStep(2)}
        >
          2. Hora y cupos
        </button>
      </div>

      <div className={step === 1 ? "create-step is-active" : "create-step"} hidden={step !== 1}>
        <label>
          Deporte
          <select value={sport} onChange={(e) => chooseSport(e.target.value as Sport)}>
            {SPORTS.map((item) => (
              <option key={item} value={item}>
                {sportLabel[item]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Formato
          <select value={activeFormat} onChange={(e) => setFormat(e.target.value as Format)}>
            {formats.map((item) => (
              <option key={item} value={item}>
                {formatLabel[item]}
              </option>
            ))}
          </select>
        </label>

        <VenuePicker
          key={sport}
          venues={sportVenues}
          defaultVenueId={
            defaultVenueId && sportVenues.some((v) => v.id === defaultVenueId) ? defaultVenueId : undefined
          }
          emptyHint="No hay canchas para ese deporte en la ciudad."
        />

        <button className="btn-flood create-step-next" type="button" onClick={() => setStep(2)}>
          Siguiente: hora y cupos
        </button>
      </div>

      <div className={step === 2 ? "create-step is-active" : "create-step"} hidden={step !== 2}>
        <label>
          Hora
          <input type="datetime-local" name="starts_at" required defaultValue={defaultStartsAtLocal()} />
        </label>

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
            <select value={activePosition} onChange={(e) => setPosition(e.target.value)}>
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

        {hasKeeper ? (
          <label className="check-line">
            <input type="checkbox" name="need_keeper" />
            El primero es arquero
          </label>
        ) : null}

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

        <div className="form-actions-row">
          <button className="btn-ghost" type="button" onClick={() => setStep(1)}>
            Atrás
          </button>
          <button className="btn-flood" type="submit" disabled={pending || sportVenues.length === 0}>
            {pending ? "Publicando…" : "Publicar hueco"}
          </button>
        </div>
      </div>
    </form>
  );
}
