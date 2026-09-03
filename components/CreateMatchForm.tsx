"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { createMatchAction } from "@/app/actions";
import { trackEvent } from "@/lib/analytics";
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
  const formId = useId();
  const preselected = venues.find((v) => v.id === defaultVenueId);
  const initialSport: Sport =
    (preselected?.sports?.find((s): s is Sport => (SPORTS as readonly string[]).includes(s)) as Sport | undefined) ??
    "futbol";

  const [sport, setSport] = useState<Sport>(initialSport);
  const [format, setFormat] = useState<Format>(defaultFormatForSport(initialSport));
  const [position, setPosition] = useState("any");
  const [step, setStep] = useState<1 | 2>(1);
  const [openCount, setOpenCount] = useState(2);
  const [costPerPerson, setCostPerPerson] = useState<string>("");
  const [venueMissing, setVenueMissing] = useState(false);

  const sportVenues = useMemo(() => venuesForSport(venues, sport), [venues, sport]);
  const formats = formatsForSport(sport);
  const positions = positionsForSport(sport);
  const hasKeeper = SPORT_RULES[sport].hasKeeper;
  const activeFormat = formats.includes(format) ? format : defaultFormatForSport(sport);
  const activePosition = positionAllowedForSport(sport, position as never) ? position : "any";

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => {
      trackEvent("match_publish_submit", { sport, format: activeFormat });
      return createMatchAction(formData);
    },
    null,
  );

  function chooseSport(next: Sport) {
    setSport(next);
    setFormat(defaultFormatForSport(next));
    setPosition("any");
    setVenueMissing(false);
  }

  function goToStep2(form: HTMLFormElement) {
    const venueId = new FormData(form).get("venue_id");
    if (!venueId || sportVenues.length === 0) {
      setVenueMissing(true);
      return;
    }
    setVenueMissing(false);
    setStep(2);
  }

  const sportId = `${formId}-sport`;
  const formatId = `${formId}-format`;
  const startsId = `${formId}-starts`;
  const openId = `${formId}-open`;
  const durationId = `${formId}-duration`;
  const costId = `${formId}-cost`;
  const positionId = `${formId}-position`;
  const levelId = `${formId}-level`;
  const genderId = `${formId}-gender`;
  const notesId = `${formId}-notes`;

  return (
    <form action={action} className="stack-form match-compose">
      <input type="hidden" name="city_slug" value={city.slug} />
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="format" value={activeFormat} />
      <input type="hidden" name="position" value={activePosition} />

      <div className="match-compose-progress" aria-label={`Paso ${step} de 2`}>
        <div className="match-compose-progress-track" aria-hidden="true">
          <span className={step >= 1 ? "is-on" : undefined} />
          <span className={step >= 2 ? "is-on" : undefined} />
        </div>
        <div className="create-steps" role="tablist" aria-label="Pasos para publicar">
          <button
            type="button"
            role="tab"
            id={`${formId}-tab-1`}
            aria-selected={step === 1}
            aria-controls={`${formId}-panel-1`}
            className={step === 1 ? "is-on" : undefined}
            onClick={() => setStep(1)}
          >
            <span className="match-compose-step-num">01</span>
            Deporte y cancha
          </button>
          <button
            type="button"
            role="tab"
            id={`${formId}-tab-2`}
            aria-selected={step === 2}
            aria-controls={`${formId}-panel-2`}
            className={step === 2 ? "is-on" : undefined}
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (form) goToStep2(form);
            }}
          >
            <span className="match-compose-step-num">02</span>
            Hora y cupos
          </button>
        </div>
      </div>

      {state?.error ? (
        <div className="match-compose-banner-error" role="alert">
          <p className="form-error">{state.error}</p>
        </div>
      ) : null}

      <div
        id={`${formId}-panel-1`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-1`}
        className={step === 1 ? "create-step is-active" : "create-step"}
        hidden={step !== 1}
      >
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Deporte</legend>
          <p className="field-help">Define qué se juega; la lista de canchas se filtra sola.</p>

          <label htmlFor={sportId}>
            Deporte <span className="req-mark" aria-hidden="true">*</span>
            <select id={sportId} value={sport} onChange={(e) => chooseSport(e.target.value as Sport)}>
              {SPORTS.map((item) => (
                <option key={item} value={item}>
                  {sportLabel[item]}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor={formatId}>
            Formato <span className="req-mark" aria-hidden="true">*</span>
            <select id={formatId} value={activeFormat} onChange={(e) => setFormat(e.target.value as Format)}>
              {formats.map((item) => (
                <option key={item} value={item}>
                  {formatLabel[item]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Dónde</legend>
          <VenuePicker
            key={sport}
            venues={sportVenues}
            defaultVenueId={
              defaultVenueId && sportVenues.some((v) => v.id === defaultVenueId) ? defaultVenueId : undefined
            }
            emptyHint="No hay canchas para ese deporte en la ciudad."
            invalid={venueMissing}
            onVenueChange={() => setVenueMissing(false)}
          />
        </fieldset>

        <div className="match-compose-actions match-compose-actions-inline">
          <button
            className="btn-flood create-step-next"
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.form;
              if (form) goToStep2(form);
            }}
          >
            Siguiente: hora y cupos
          </button>
        </div>
      </div>

      <div
        id={`${formId}-panel-2`}
        role="tabpanel"
        aria-labelledby={`${formId}-tab-2`}
        className={step === 2 ? "create-step is-active" : "create-step"}
        hidden={step !== 2}
      >
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Cuándo</legend>
          <p className="field-help">Usa una hora que todavía no haya pasado.</p>

          <label htmlFor={startsId}>
            Hora de inicio <span className="req-mark" aria-hidden="true">*</span>
            <input
              id={startsId}
              type="datetime-local"
              name="starts_at"
              required
              defaultValue={defaultStartsAtLocal()}
            />
          </label>

          <label htmlFor={durationId}>
            Duración
            <select id={durationId} name="duration_min" defaultValue="60">
              <option value="30">30 min</option>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
            </select>
          </label>
        </fieldset>

        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Cupos</legend>
          <p className="field-help">Cuántos faltan y a cuánto sale cada uno.</p>

          <div className="form-split">
            <label htmlFor={openId}>
              Faltan <span className="req-mark" aria-hidden="true">*</span>
              <input
                id={openId}
                type="number"
                name="open_count"
                min={1}
                max={12}
                value={openCount}
                onChange={(e) => setOpenCount(Number(e.target.value))}
                inputMode="numeric"
              />
            </label>
            <label htmlFor={costId}>
              Precio / persona (COP)
              <input
                id={costId}
                type="number"
                name="cost_per_person"
                min={0}
                step={500}
                value={costPerPerson}
                onChange={(e) => setCostPerPerson(e.target.value)}
                placeholder="15000"
                inputMode="numeric"
              />
            </label>
          </div>

          <div className="filter-chips">
            {[2, 4, 6].map((n) => (
              <button
                key={n}
                type="button"
                className={openCount === n ? "is-on" : undefined}
                onClick={() => setOpenCount(n)}
              >
                {n} cupos
              </button>
            ))}
            <button
              type="button"
              className={costPerPerson === "0" ? "is-on" : undefined}
              onClick={() => setCostPerPerson("0")}
            >
              Gratis
            </button>
          </div>
        </fieldset>

        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Quién entra</legend>

          <div className="form-split">
            <label htmlFor={positionId}>
              Posición
              <select
                id={positionId}
                value={activePosition}
                onChange={(e) => setPosition(e.target.value)}
              >
                {positions.map((item) => (
                  <option key={item} value={item}>
                    {positionLabel[item]}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={levelId}>
              Nivel
              <select id={levelId} name="level" defaultValue="any">
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

          <label htmlFor={genderId}>
            Quién juega
            <select id={genderId} name="gender_policy" defaultValue="mixed">
              {GENDERS.map((gender) => (
                <option key={gender} value={gender}>
                  {genderLabel[gender]}
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Nota</legend>
          <label htmlFor={notesId}>
            Detalle para el grupo <span className="field-optional">(opcional)</span>
            <textarea
              id={notesId}
              name="notes"
              rows={3}
              maxLength={500}
              placeholder="Punto de encuentro, chalecos, nivel de la pateada…"
            />
          </label>
        </fieldset>

        <div className="form-actions-row match-compose-actions match-compose-actions-inline" aria-live="polite">
          <button className="btn-ghost" type="button" onClick={() => setStep(1)}>
            Atrás
          </button>
          <button className="btn-flood" type="submit" disabled={pending || sportVenues.length === 0}>
            {pending ? "Publicando…" : "Publicar hueco"}
          </button>
        </div>
      </div>

      <div className="match-compose-sticky">
        {step === 1 ? (
          <button
            className="btn-flood"
            type="button"
            onClick={(e) => {
              const form = e.currentTarget.closest("form");
              if (form) goToStep2(form);
            }}
          >
            Siguiente: hora y cupos
          </button>
        ) : (
          <div className="match-compose-sticky-row">
            <button className="btn-ghost" type="button" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button className="btn-flood" type="submit" disabled={pending || sportVenues.length === 0}>
              {pending ? "Publicando…" : "Publicar hueco"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
