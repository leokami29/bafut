"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useMemo, useState } from "react";
import { createMatchAction, lookupVenueOccupancyAction, updateMatchAction } from "@/app/actions";
import { OccupancyBanner } from "@/components/OccupancyBanner";
import { trackEvent } from "@/lib/analytics";
import { VenueMapLazy } from "@/components/VenueMapLazy";
import { VenuePicker } from "@/components/VenuePicker";
import {
  DURATIONS,
  GENDERS,
  LEVELS,
  SPORTS,
  type DurationMin,
  type Format,
  type GenderPolicy,
  type Level,
  type Sport,
} from "@/lib/constants";
import { datetimeLocalInZoneToDate, defaultStartsAtLocal } from "@/lib/datetime";
import { formatMoney, formatWhen } from "@/lib/format";
import { formatLabel, genderLabel, levelLabel, positionLabel, sportLabel } from "@/lib/labels";
import {
  defaultFormatForSport,
  formatsForSport,
  positionAllowedForSport,
  positionsForSport,
  SPORT_RULES,
  venuesForSport,
} from "@/lib/sport-rules";
import type { OccupancyConflict } from "@/lib/occupancy";
import type { City, Venue } from "@/lib/types";
import { mapsDirectionsUrl } from "@/lib/venue-meta";

type State = { error?: string; occupancy?: OccupancyConflict } | null;

export type MatchEditSlot = {
  id: string;
  position: string;
  level: string;
  accepted: boolean;
  pending: boolean;
};

export type MatchEditInitial = {
  matchId: string;
  shareCode: string;
  sport: Sport;
  format: Format;
  venueId: string;
  startsAtLocal: string;
  durationMin: number;
  costPerPerson: number | null;
  genderPolicy: string;
  notes: string | null;
  slots: MatchEditSlot[];
};

type EditSlotRow = {
  key: string;
  id: string | null;
  position: string;
  level: string;
  accepted: boolean;
  pending: boolean;
};

function initialDuration(value: number | undefined): DurationMin {
  return (DURATIONS as readonly number[]).includes(value ?? 60) ? ((value ?? 60) as DurationMin) : 60;
}

function initialGender(value: string | undefined): GenderPolicy {
  return (GENDERS as readonly string[]).includes(value ?? "mixed")
    ? ((value ?? "mixed") as GenderPolicy)
    : "mixed";
}

function startsPreview(local: string, timeZone: string) {
  const date = datetimeLocalInZoneToDate(local, timeZone);
  if (!date) return "Hora por definir";
  return formatWhen(date.toISOString(), timeZone);
}

export function CreateMatchForm({
  city,
  venues,
  defaultVenueId,
  edit,
}: {
  city: City;
  venues: Venue[];
  defaultVenueId?: string;
  edit?: MatchEditInitial;
}) {
  const formId = useId();
  const isEdit = Boolean(edit);
  const preselected = venues.find((v) => v.id === (edit?.venueId ?? defaultVenueId));
  const initialSport: Sport =
    edit?.sport ??
    (preselected?.sports?.find((s): s is Sport => (SPORTS as readonly string[]).includes(s)) as Sport | undefined) ??
    "futbol";

  const [sport, setSport] = useState<Sport>(initialSport);
  const [format, setFormat] = useState<Format>(edit?.format ?? defaultFormatForSport(initialSport));
  const [position, setPosition] = useState("any");
  const [step, setStep] = useState<1 | 2>(1);
  const [openCount, setOpenCount] = useState(2);
  const [durationMin, setDurationMin] = useState<DurationMin>(initialDuration(edit?.durationMin));
  const [genderPolicy, setGenderPolicy] = useState<GenderPolicy>(initialGender(edit?.genderPolicy));
  const [costPerPerson, setCostPerPerson] = useState<string>(
    edit?.costPerPerson != null ? String(edit.costPerPerson) : "",
  );
  const [venueMissing, setVenueMissing] = useState(false);
  const [startsAt, setStartsAt] = useState(() =>
    edit ? edit.startsAtLocal : defaultStartsAtLocal(),
  );
  const [venueId, setVenueId] = useState(edit?.venueId ?? defaultVenueId ?? "");
  const [liveOccupancy, setLiveOccupancy] = useState<OccupancyConflict | null>(null);
  const [editSlots, setEditSlots] = useState<EditSlotRow[]>(() =>
    (edit?.slots ?? []).map((slot) => ({
      key: slot.id,
      id: slot.id,
      position: slot.position,
      level: slot.level,
      accepted: slot.accepted,
      pending: slot.pending,
    })),
  );

  const sportLocked = Boolean(edit?.slots.some((slot) => slot.accepted));
  const hasActiveClaims = Boolean(
    edit?.slots.some((slot) => slot.accepted || slot.pending),
  );
  const acceptedCount = edit?.slots.filter((slot) => slot.accepted).length ?? 0;

  const sportVenues = useMemo(() => venuesForSport(venues, sport), [venues, sport]);
  const formats = formatsForSport(sport);
  const positions = positionsForSport(sport);
  const hasKeeper = SPORT_RULES[sport].hasKeeper;
  const activeFormat = formats.includes(format) ? format : defaultFormatForSport(sport);
  const activePosition = positionAllowedForSport(sport, position as never) ? position : "any";
  const minSlots = Math.max(1, acceptedCount);
  const timeOrVenueChanged =
    isEdit &&
    Boolean(edit) &&
    (startsAt !== edit!.startsAtLocal || venueId !== edit!.venueId);

  const selectedVenue = sportVenues.find((venue) => venue.id === venueId) ?? null;
  const slotCount = isEdit ? editSlots.length : openCount;
  const costNumber = costPerPerson.trim() === "" ? Number.NaN : Number(costPerPerson);
  const priceLabel =
    costPerPerson.trim() === "0" || costNumber === 0
      ? "Gratis"
      : Number.isFinite(costNumber)
        ? formatMoney(costNumber)
        : formatMoney(null);

  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => {
      if (isEdit) {
        trackEvent("match_edit_submit", { sport, format: activeFormat });
        return updateMatchAction(formData);
      }
      trackEvent("match_publish_submit", { sport, format: activeFormat });
      return createMatchAction(formData);
    },
    null,
  );

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      if (!venueId || !startsAt) {
        if (!cancelled) setLiveOccupancy(null);
        return;
      }
      void lookupVenueOccupancyAction({
        citySlug: city.slug,
        venueId,
        startsAt,
        durationMin,
        excludeMatchId: edit?.matchId,
      }).then((result) => {
        if (!cancelled) setLiveOccupancy(result.occupancy ?? null);
      });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [venueId, startsAt, durationMin, city.slug, edit?.matchId]);

  function chooseSport(next: Sport) {
    if (sportLocked) return;
    setSport(next);
    setFormat(defaultFormatForSport(next));
    setPosition("any");
    setVenueMissing(false);
    setVenueId("");
    setEditSlots((rows) =>
      rows.map((row) => ({
        ...row,
        position: positionAllowedForSport(next, row.position as never) ? row.position : "any",
      })),
    );
  }

  function goToStep2(form: HTMLFormElement) {
    const selected = new FormData(form).get("venue_id");
    if (!selected || sportVenues.length === 0) {
      setVenueMissing(true);
      return;
    }
    setVenueMissing(false);
    setStep(2);
  }

  function addEditSlot() {
    if (editSlots.length >= 12) return;
    const allowed = positionsForSport(sport);
    const nextPos = allowed.includes(activePosition as never) ? activePosition : "any";
    setEditSlots((rows) => [
      ...rows,
      {
        key: `new-${crypto.randomUUID()}`,
        id: null,
        position: nextPos,
        level: "any",
        accepted: false,
        pending: false,
      },
    ]);
  }

  function removeEditSlot(key: string) {
    setEditSlots((rows) => {
      const target = rows.find((row) => row.key === key);
      if (!target || target.accepted || target.pending) return rows;
      if (rows.length <= minSlots) return rows;
      return rows.filter((row) => row.key !== key);
    });
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

  const occupancy = liveOccupancy ?? state?.occupancy ?? null;
  const occupancyBlocksSubmit = Boolean(occupancy);
  const submitLabel = isEdit ? "Guardar cambios" : "Publicar hueco";
  const pendingLabel = isEdit ? "Guardando…" : "Publicando…";
  const directionsHref = selectedVenue
    ? mapsDirectionsUrl(
        selectedVenue.lat,
        selectedVenue.lng,
        selectedVenue.address ? `${selectedVenue.name}, ${selectedVenue.address}` : selectedVenue.name,
      )
    : null;

  return (
    <form action={action} className="stack-form match-compose">
      <input type="hidden" name="city_slug" value={city.slug} />
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="format" value={activeFormat} />
      <input type="hidden" name="duration_min" value={durationMin} />
      <input type="hidden" name="gender_policy" value={genderPolicy} />
      {isEdit && edit ? (
        <>
          <input type="hidden" name="match_id" value={edit.matchId} />
          <input type="hidden" name="share_code" value={edit.shareCode} />
          <input
            type="hidden"
            name="slots_json"
            value={JSON.stringify(
              editSlots.map((row) => ({
                id: row.id,
                position: positionAllowedForSport(sport, row.position as never) ? row.position : "any",
                level: row.level,
              })),
            )}
          />
        </>
      ) : (
        <input type="hidden" name="position" value={activePosition} />
      )}

      <div className="match-compose-progress" aria-label={`Paso ${step} de 2`}>
        <div className="match-compose-progress-track" aria-hidden="true">
          <span className={step >= 1 ? "is-on" : undefined} />
          <span className={step >= 2 ? "is-on" : undefined} />
        </div>
        <div className="create-steps" role="tablist" aria-label={isEdit ? "Pasos para editar" : "Pasos para publicar"}>
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
            Dónde
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
            Cuándo y cupos
          </button>
        </div>
      </div>

      {occupancy ? (
        <OccupancyBanner occupancy={occupancy} timeZone={city.timezone} sport={sport} isEdit={isEdit} />
      ) : null}

      {state?.error && !occupancy ? (
        <div className="match-compose-banner-error" role="alert">
          <p className="form-error">{state.error}</p>
        </div>
      ) : null}

      {isEdit && hasActiveClaims ? (
        <div className="match-compose-banner-warn" role="status">
          <p>
            Hay pedidos pendientes o confirmados. Si cambiás hora o cancha, avisales: el partido se actualiza igual.
          </p>
        </div>
      ) : null}

      {isEdit && hasActiveClaims && timeOrVenueChanged ? (
        <div className="match-compose-banner-warn is-strong" role="status">
          <p>Vas a cambiar hora o cancha con gente ya anotada. Quienes pidieron cupo no se avisan solos.</p>
        </div>
      ) : null}

      <div className="match-compose-layout">
        <div className="match-compose-primary">
          <div
            id={`${formId}-panel-1`}
            role="tabpanel"
            aria-labelledby={`${formId}-tab-1`}
            className={step === 1 ? "create-step is-active" : "create-step"}
            hidden={step !== 1}
          >
            <fieldset className="match-compose-group">
              <legend className="match-compose-legend">Deporte</legend>
              <p className="field-help">
                {sportLocked
                  ? "El deporte no se puede cambiar: ya hay cupos confirmados."
                  : "Define qué se juega; la lista de canchas se filtra sola."}
              </p>

              <div className="filter-chips match-compose-chips" role="group" aria-labelledby={sportId}>
                <p className="sr-only" id={sportId}>
                  Deporte
                </p>
                {SPORTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={sport === item ? "is-on" : undefined}
                    aria-pressed={sport === item}
                    disabled={sportLocked}
                    onClick={() => chooseSport(item)}
                  >
                    {sportLabel[item]}
                  </button>
                ))}
              </div>

              <div>
                <p className="match-compose-field-label" id={formatId}>
                  Formato
                </p>
                <div className="filter-chips match-compose-chips" role="group" aria-labelledby={formatId}>
                {formats.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={activeFormat === item ? "is-on" : undefined}
                    aria-pressed={activeFormat === item}
                    onClick={() => setFormat(item)}
                  >
                    {formatLabel[item]}
                  </button>
                ))}
                </div>
              </div>
            </fieldset>

            <fieldset className="match-compose-group">
              <legend className="match-compose-legend">Dónde</legend>
              <VenuePicker
                key={sport}
                venues={sportVenues}
                defaultVenueId={
                  (edit?.venueId ?? defaultVenueId) &&
                  sportVenues.some((v) => v.id === (edit?.venueId ?? defaultVenueId))
                    ? (edit?.venueId ?? defaultVenueId)
                    : undefined
                }
                emptyHint="No hay canchas para ese deporte en la ciudad."
                invalid={venueMissing}
                onVenueChange={(id) => {
                  setVenueId(id);
                  setVenueMissing(false);
                }}
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

              <div className="form-split">
                <label htmlFor={startsId}>
                  Hora de inicio <span className="req-mark" aria-hidden="true">*</span>
                  <input
                    id={startsId}
                    type="datetime-local"
                    name="starts_at"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </label>
                <div>
                  <p className="match-compose-field-label" id={durationId}>
                    Duración
                  </p>
                  <div className="filter-chips match-compose-chips" role="group" aria-labelledby={durationId}>
                    {DURATIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={durationMin === item ? "is-on" : undefined}
                        aria-pressed={durationMin === item}
                        onClick={() => setDurationMin(item)}
                      >
                        {item} min
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </fieldset>

            {isEdit ? (
              <fieldset className="match-compose-group">
                <legend className="match-compose-legend">Cupos</legend>
                <p className="field-help">
                  Podés sumar o quitar huecos. No se quitan cupos confirmados ni con pedido pendiente.
                </p>
                <ul className="slot-edit-list">
                  {editSlots.map((row, index) => {
                    const posId = `${formId}-slot-pos-${row.key}`;
                    const lvlId = `${formId}-slot-lvl-${row.key}`;
                    const locked = row.accepted;
                    const blockedDelete = row.accepted || row.pending || editSlots.length <= minSlots;
                    const rowPosition = positionAllowedForSport(sport, row.position as never)
                      ? row.position
                      : "any";
                    return (
                      <li key={row.key} className="slot-edit-row">
                        <p className="slot-edit-label">
                          Cupo {index + 1}
                          {row.accepted ? <span className="slot-edit-tag">Confirmado</span> : null}
                          {row.pending && !row.accepted ? (
                            <span className="slot-edit-tag is-pending">Pedido</span>
                          ) : null}
                        </p>
                        <div className="form-split">
                          <label htmlFor={posId}>
                            Posición
                            <select
                              id={posId}
                              value={rowPosition}
                              disabled={locked}
                              onChange={(e) =>
                                setEditSlots((rows) =>
                                  rows.map((item) =>
                                    item.key === row.key ? { ...item, position: e.target.value } : item,
                                  ),
                                )
                              }
                            >
                              {positions.map((item) => (
                                <option key={item} value={item}>
                                  {positionLabel[item]}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label htmlFor={lvlId}>
                            Nivel
                            <select
                              id={lvlId}
                              value={row.level}
                              disabled={locked}
                              onChange={(e) =>
                                setEditSlots((rows) =>
                                  rows.map((item) =>
                                    item.key === row.key ? { ...item, level: e.target.value as Level } : item,
                                  ),
                                )
                              }
                            >
                              {LEVELS.map((level) => (
                                <option key={level} value={level}>
                                  {levelLabel[level]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <button
                          type="button"
                          className="btn-ghost slot-edit-remove"
                          disabled={blockedDelete}
                          onClick={() => removeEditSlot(row.key)}
                        >
                          Quitar cupo
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={editSlots.length >= 12}
                  onClick={addEditSlot}
                >
                  Añadir cupo
                </button>
              </fieldset>
            ) : (
              <fieldset className="match-compose-group">
                <legend className="match-compose-legend">Cupos</legend>
                <p className="field-help">Cuántos faltan para cerrar el partido.</p>

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

                <div className="filter-chips">
                  {[2, 4, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={openCount === n ? "is-on" : undefined}
                      aria-pressed={openCount === n}
                      onClick={() => setOpenCount(n)}
                    >
                      {n} cupos
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="match-compose-group">
              <legend className="match-compose-legend">Precio</legend>
              <p className="field-help">Lo que paga cada uno. Dejalo vacío si se arregla en la cancha.</p>
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
              <div className="filter-chips">
                <button
                  type="button"
                  className={costPerPerson === "0" ? "is-on" : undefined}
                  aria-pressed={costPerPerson === "0"}
                  onClick={() => setCostPerPerson("0")}
                >
                  Gratis
                </button>
              </div>
            </fieldset>

            <fieldset className="match-compose-group">
              <legend className="match-compose-legend">Quién entra</legend>

              {isEdit ? null : (
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
              )}

              {!isEdit && hasKeeper ? (
                <label className="check-line">
                  <input type="checkbox" name="need_keeper" />
                  El primero es arquero
                </label>
              ) : null}

              <p className="match-compose-field-label" id={genderId}>
                Quién juega
              </p>
              <div className="filter-chips match-compose-chips" role="group" aria-labelledby={genderId}>
                {GENDERS.map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    className={genderPolicy === gender ? "is-on" : undefined}
                    aria-pressed={genderPolicy === gender}
                    onClick={() => setGenderPolicy(gender)}
                  >
                    {genderLabel[gender]}
                  </button>
                ))}
              </div>
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
                  defaultValue={edit?.notes ?? ""}
                  placeholder="Punto de encuentro, chalecos, nivel de la pateada…"
                />
              </label>
            </fieldset>

            <div className="form-actions-row match-compose-actions match-compose-actions-inline" aria-live="polite">
              <button className="btn-ghost" type="button" onClick={() => setStep(1)}>
                Atrás
              </button>
              <button className="btn-flood" type="submit" disabled={pending || sportVenues.length === 0 || occupancyBlocksSubmit}>
                {pending ? pendingLabel : submitLabel}
              </button>
            </div>
          </div>
        </div>

        <aside className="match-compose-aside" aria-label="Resumen del hueco">
          <dl className="match-stat-strip match-compose-stats" aria-label="Datos del hueco">
            <div>
              <dt>Deporte</dt>
              <dd>
                {sportLabel[sport]} {formatLabel[activeFormat]}
              </dd>
            </div>
            <div>
              <dt>Cuándo</dt>
              <dd>{startsPreview(startsAt, city.timezone)}</dd>
            </div>
            <div>
              <dt>Cupos</dt>
              <dd>
                {slotCount} · {durationMin} min
              </dd>
            </div>
            <div>
              <dt>Por persona</dt>
              <dd>{priceLabel}</dd>
            </div>
          </dl>

          {selectedVenue ? (
            <section className="match-venue-block match-compose-venue" aria-labelledby={`${formId}-venue-heading`}>
              <div className="match-venue-copy">
                <h2 className="subhead" id={`${formId}-venue-heading`}>
                  Dónde se juega
                </h2>
                <p className="match-venue-name">
                  <Link href={`/canchas/${selectedVenue.slug}`}>{selectedVenue.name}</Link>
                </p>
                <p className="match-venue-meta">
                  {[selectedVenue.neighborhood, selectedVenue.address].filter(Boolean).join(" · ") || city.name}
                </p>
                <p className="venue-map-foot">
                  {directionsHref ? (
                    <a href={directionsHref} target="_blank" rel="noopener noreferrer">
                      Cómo llegar
                    </a>
                  ) : null}
                  {directionsHref ? " · " : null}
                  <Link href={`/canchas/${selectedVenue.slug}`}>Ficha de la cancha</Link>
                </p>
              </div>
              <div className="venue-map-wrap venue-map-detail match-venue-map">
                <VenueMapLazy
                  venues={[selectedVenue]}
                  center={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
                  focusId={selectedVenue.id}
                  navigateOnClick={false}
                />
              </div>
            </section>
          ) : (
            <div className="match-compose-aside-empty" role="status">
              <p className="match-compose-aside-kicker">{city.name}</p>
              <p>Elegí una cancha para verla en el mapa y armar el hueco ahí.</p>
            </div>
          )}
        </aside>
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
            <button className="btn-flood" type="submit" disabled={pending || sportVenues.length === 0 || occupancyBlocksSubmit}>
              {pending ? pendingLabel : submitLabel}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}
