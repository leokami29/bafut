"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  appendMatchEventAction,
  confirmMatchResultAction,
  voidMatchEventAction,
  type TournamentActionResult,
} from "@/app/canchas/[slug]/admin/torneos/actions";
import {
  eventTypesFor,
  getSportCatalog,
  type SportId,
  type TeamSide,
} from "@/lib/tournaments/sports";
import { activeEvents, countBySide } from "@/lib/tournaments/sports/helpers";
import { countSetPoints } from "@/lib/tournaments/sports/voleibol";
import {
  tournamentActaFieldLabels,
  tournamentEventLabel,
  tournamentScoreUnitLabel,
  tournamentSportLabel,
} from "@/lib/tournaments/labels";
import { previewMatchScoreFromEvents, eventsToDomain } from "@/lib/tournaments/match-events";
import type { Json } from "@/lib/database.types";
import type { MatchEvent } from "@/lib/tournaments/sports";

export type ActaEventRow = {
  id: string;
  type: string;
  team_side: TeamSide;
  player_id: string | null;
  period: number | null;
  clock: number | null;
  payload: Json;
  voided_at: string | null;
  created_at: string;
  sport: string;
};

type Props = {
  slug: string;
  tournamentId: string;
  bmMatchId: number;
  sport: SportId;
  nameA: string;
  nameB: string;
  confirmed: boolean;
  initialEvents: ActaEventRow[];
  canScore: boolean;
};

type State = TournamentActionResult | null;

function payloadForEvent(type: string, teamSide: TeamSide): unknown {
  if (type === "set_point") return { point_won_by: teamSide };
  if (type === "point_won") return { point_won_by: teamSide };
  return {};
}

/** Puntos del set en curso (después del último set ganado). */
function liveSetPoints(events: MatchEvent[]): { a: number; b: number } {
  const list = activeEvents(events);
  let cut = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].type === "set_won") cut = i;
  }
  return countSetPoints(list.slice(cut + 1));
}

/** Games del set en curso (pádel). */
function liveGames(events: MatchEvent[]): { a: number; b: number } {
  const list = activeEvents(events);
  let cut = -1;
  for (let i = 0; i < list.length; i++) {
    if (list[i].type === "set_won") cut = i;
  }
  return countBySide(list.slice(cut + 1), (e) => e.type === "game_won");
}

function confirmBlockReason(opts: {
  activeCount: number;
  complete: boolean;
  tied: boolean;
}): string | null {
  if (opts.activeCount === 0) {
    return "Cargá al menos un evento de marcador antes de confirmar.";
  }
  if (!opts.complete) {
    return "El partido aún no tiene ganador según las reglas del deporte.";
  }
  if (opts.tied) {
    return "No se permiten empates. El marcador tiene que definir un ganador.";
  }
  return null;
}

export function TournamentMatchActa({
  slug,
  tournamentId,
  bmMatchId,
  sport,
  nameA,
  nameB,
  confirmed,
  initialEvents,
  canScore,
}: Props) {
  const router = useRouter();
  const catalog = getSportCatalog(sport);
  const scoringTypes = eventTypesFor(sport, "scoring");
  const amateurTypes = eventTypesFor(sport, "amateur");
  const fieldLabels = tournamentActaFieldLabels(sport);
  const scoreUnit = tournamentScoreUnitLabel(sport);
  const sportLabel = tournamentSportLabel[sport] ?? sport;

  const [events, setEvents] = useState(initialEvents);
  const [layer, setLayer] = useState<"scoring" | "all">("scoring");
  const [period, setPeriod] = useState<string>("1");
  const [clock, setClock] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState(confirmed);
  const [scoreBump, setScoreBump] = useState(false);
  const prevScore = useRef<{ a: number; b: number } | null>(null);

  const domainEvents = eventsToDomain(events);
  const preview = previewMatchScoreFromEvents(sport, domainEvents);

  useEffect(() => {
    if (prevScore.current == null) {
      prevScore.current = { a: preview.a, b: preview.b };
      return;
    }
    const prev = prevScore.current;
    if (prev.a !== preview.a || prev.b !== preview.b) {
      prevScore.current = { a: preview.a, b: preview.b };
      setScoreBump(true);
      const t = window.setTimeout(() => setScoreBump(false), 280);
      return () => window.clearTimeout(t);
    }
  }, [preview.a, preview.b]);

  const secondary =
    sport === "voleibol"
      ? { label: "Puntos del set", value: liveSetPoints(domainEvents) }
      : sport === "padel"
        ? { label: "Games", value: liveGames(domainEvents) }
        : null;

  const [appendState, appendAction, appendPending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const type = String(formData.get("type") ?? "");
      const teamSide = String(formData.get("team_side") ?? "") as TeamSide;
      const periodRaw = String(formData.get("period") ?? "").trim();
      const clockRaw = String(formData.get("clock") ?? "").trim();

      const result = await appendMatchEventAction(slug, {
        tournamentId,
        bmMatchId,
        teamSide,
        type,
        period: periodRaw ? Number(periodRaw) : null,
        clock: clockRaw ? Number(clockRaw) : null,
        payload: payloadForEvent(type, teamSide),
      });

      if (result.ok) {
        setEvents((prev) => [
          ...prev,
          {
            id: result.id,
            type,
            team_side: teamSide,
            player_id: null,
            period: periodRaw ? Number(periodRaw) : null,
            clock: clockRaw ? Number(clockRaw) : null,
            payload: payloadForEvent(type, teamSide) as Json,
            voided_at: null,
            created_at: new Date().toISOString(),
            sport,
          },
        ]);
        router.refresh();
      }
      return result;
    },
    null,
  );

  const [voidState, voidAction, voidPending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const eventId = String(formData.get("event_id") ?? "");
      const result = await voidMatchEventAction(slug, tournamentId, eventId);
      if (result.ok) {
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, voided_at: new Date().toISOString() } : e,
          ),
        );
        router.refresh();
      }
      return result;
    },
    null,
  );

  const [confirmState, confirmAction, confirmPending] = useActionState(
    async (): Promise<State> => {
      const result = await confirmMatchResultAction(slug, tournamentId, bmMatchId);
      if (result.ok) {
        setIsConfirmed(true);
        router.refresh();
      }
      return result;
    },
    null,
  );

  const busy = appendPending || voidPending || confirmPending || isConfirmed || !canScore;
  const types = layer === "scoring" ? scoringTypes : [...scoringTypes, ...amateurTypes];
  const activeCount = events.filter((e) => !e.voided_at).length;
  const tied = preview.a === preview.b;
  const blockReason = confirmBlockReason({
    activeCount,
    complete: preview.complete,
    tied,
  });
  const canConfirm = canScore && !isConfirmed && !blockReason && !busy;
  const showStickyConfirm = canScore && !isConfirmed;

  const statusText = isConfirmed
    ? "Confirmado"
    : preview.complete && !tied
      ? "Listo para confirmar"
      : "En carga";

  const bestOfNote =
    catalog.bracketScoreKind === "sets" && catalog.bestOf
      ? `Al mejor de ${catalog.bestOf}`
      : null;

  return (
    <div
      className={`tournament-acta${showStickyConfirm ? " has-sticky-confirm" : ""}`}
      data-sport={sport}
    >
      <section className="tournament-acta-board" aria-labelledby="acta-board-title">
        <div className="tournament-acta-board-meta">
          <p className="tournament-acta-kicker">
            {sportLabel}
            {bestOfNote ? ` · ${bestOfNote}` : ` · ${scoreUnit}`}
          </p>
          <p
            className={`tournament-acta-status${isConfirmed ? " is-done" : preview.complete && !tied ? " is-ready" : ""}`}
          >
            {statusText}
          </p>
        </div>

        <h2 id="acta-board-title" className="sr-only">
          Marcador: {nameA} {preview.a} – {preview.b} {nameB}
        </h2>

        <div
          className={`tournament-acta-scoreboard${scoreBump ? " is-bump" : ""}`}
          aria-live="polite"
        >
          <div className="tournament-acta-side is-a">
            <span className="tournament-acta-team">{nameA}</span>
            <strong
              className="tournament-acta-score"
              data-score={preview.a}
              aria-label={`${scoreUnit} ${nameA}: ${preview.a}`}
            >
              {preview.a}
            </strong>
            {secondary ? (
              <span className="tournament-acta-subscore">
                {secondary.label} {secondary.value.a}
              </span>
            ) : null}
          </div>

          <div className="tournament-acta-mid" aria-hidden="true">
            <span className="tournament-acta-unit">{scoreUnit}</span>
            <span className="tournament-acta-sep">–</span>
          </div>

          <div className="tournament-acta-side is-b">
            <span className="tournament-acta-team">{nameB}</span>
            <strong
              className="tournament-acta-score"
              data-score={preview.b}
              aria-label={`${scoreUnit} ${nameB}: ${preview.b}`}
            >
              {preview.b}
            </strong>
            {secondary ? (
              <span className="tournament-acta-subscore">
                {secondary.label} {secondary.value.b}
              </span>
            ) : null}
          </div>
        </div>

        <p className="tournament-acta-board-help">
          {isConfirmed
            ? "Resultado cerrado: el bracket ya refleja este marcador."
            : catalog.bracketScoreKind === "sets"
              ? `Confirmá cuando un equipo cierre el partido (${scoreUnit.toLowerCase()}).`
              : `Marcador en vivo por ${scoreUnit.toLowerCase()}. Confirmá cuando el partido termine.`}
        </p>
      </section>

      {!canScore ? (
        <p className="tournament-acta-banner is-muted" role="status">
          Solo lectura: no tenés rol de scorer en esta cancha.
        </p>
      ) : null}

      {isConfirmed ? (
        <p className="tournament-acta-banner is-ok" role="status">
          Este partido ya tiene resultado confirmado.
        </p>
      ) : null}

      {canScore && !isConfirmed ? (
        <section className="tournament-acta-controls" aria-labelledby="acta-controls-title">
          <div className="tournament-acta-section-head">
            <h2 id="acta-controls-title" className="subhead">
              Cargar evento
            </h2>
            <p className="tournament-acta-section-lede">
              Tocá el evento del equipo que corresponde. El marcador se actualiza al instante.
            </p>
          </div>

          <div className="mode-toggle tournament-acta-layer" role="group" aria-label="Tipo de eventos">
            <button
              type="button"
              className={layer === "scoring" ? "is-on" : undefined}
              onClick={() => setLayer("scoring")}
              disabled={appendPending}
            >
              Marcador
            </button>
            <button
              type="button"
              className={layer === "all" ? "is-on" : undefined}
              onClick={() => setLayer("all")}
              disabled={appendPending}
            >
              + Estadística
            </button>
          </div>

          <div className="form-split tournament-form-split tournament-acta-meta-fields">
            <label>
              {fieldLabels.period}
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              {fieldLabels.clock}
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={clock}
                onChange={(e) => setClock(e.target.value)}
                placeholder={fieldLabels.clockPlaceholder}
                disabled={busy}
              />
            </label>
          </div>

          <div className="tournament-acta-sides">
            {(["a", "b"] as const).map((side) => {
              const teamName = side === "a" ? nameA : nameB;
              return (
                <div key={side} className={`tournament-acta-side-pad is-${side}`}>
                  <p className="tournament-acta-side-label">{teamName}</p>
                  <div className="tournament-event-grid">
                    {types.map((type) => {
                      const isPrimary =
                        layer === "scoring" || scoringTypes.includes(type);
                      return (
                        <form key={`${side}-${type}`} action={appendAction}>
                          <input type="hidden" name="type" value={type} />
                          <input type="hidden" name="team_side" value={side} />
                          <input type="hidden" name="period" value={period} />
                          <input type="hidden" name="clock" value={clock} />
                          <button
                            type="submit"
                            className={
                              side === "a"
                                ? isPrimary
                                  ? "btn-ghost tournament-event-btn is-primary"
                                  : "btn-ghost tournament-event-btn"
                                : isPrimary
                                  ? "btn-flood tournament-event-btn is-primary"
                                  : "btn-ghost tournament-event-btn"
                            }
                            disabled={busy}
                            aria-label={`${tournamentEventLabel(sport, type)} · ${teamName}`}
                          >
                            {tournamentEventLabel(sport, type)}
                          </button>
                        </form>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {appendPending ? (
            <p className="tournament-acta-pending" role="status">
              Guardando evento…
            </p>
          ) : null}
          {appendState?.ok === false ? (
            <p className="form-error" role="alert">
              {appendState.error}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="tournament-acta-log" aria-labelledby="acta-log-title">
        <div className="tournament-acta-section-head">
          <h2 id="acta-log-title" className="subhead">
            Acta
          </h2>
          <p className="tournament-acta-section-lede">
            {activeCount === 0
              ? "Todavía no hay eventos."
              : `${activeCount} evento${activeCount === 1 ? "" : "s"} activo${activeCount === 1 ? "" : "s"} · el más reciente arriba.`}
          </p>
        </div>

        {events.length === 0 ? (
          <div className="tournament-acta-empty">
            <p>
              {canScore && !isConfirmed
                ? "Empezá con un evento de marcador (gol, punto, set…)."
                : "No hay eventos registrados en este partido."}
            </p>
          </div>
        ) : (
          <ol className="tournament-event-list">
            {[...events].reverse().map((ev) => (
              <li
                key={ev.id}
                className={`tournament-event-row is-side-${ev.team_side}${ev.voided_at ? " is-voided" : ""}`}
              >
                <span className="tournament-event-side" aria-hidden="true">
                  {ev.team_side === "a" ? "A" : "B"}
                </span>
                <div className="tournament-event-main">
                  <span className="tournament-event-team">
                    {ev.team_side === "a" ? nameA : nameB}
                  </span>
                  <strong className="tournament-event-type">
                    {tournamentEventLabel(sport, ev.type)}
                  </strong>
                  <span className="tournament-event-meta">
                    {ev.period != null ? (
                      <span>
                        {fieldLabels.period} {ev.period}
                      </span>
                    ) : null}
                    {ev.clock != null ? <span>@{ev.clock}</span> : null}
                    {ev.voided_at ? <span className="tournament-event-void-tag">Anulado</span> : null}
                  </span>
                </div>
                {canScore && !isConfirmed && !ev.voided_at ? (
                  <form action={voidAction} className="tournament-event-void">
                    <input type="hidden" name="event_id" value={ev.id} />
                    <button
                      type="submit"
                      className="btn-bib"
                      disabled={busy}
                      aria-label={`Anular ${tournamentEventLabel(sport, ev.type)}`}
                    >
                      {voidPending ? "…" : "Anular"}
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ol>
        )}
        {voidState?.ok === false ? (
          <p className="form-error" role="alert">
            {voidState.error}
          </p>
        ) : null}
      </section>

      {canScore && !isConfirmed ? (
        <section
          className="tournament-acta-confirm"
          aria-labelledby="acta-confirm-title"
        >
          <div className="tournament-acta-section-head">
            <h2 id="acta-confirm-title" className="subhead">
              Confirmar resultado
            </h2>
            <p className="tournament-acta-section-lede">
              Al confirmar se deriva el marcador, se actualiza el bracket y se bloquea el
              acta. No se permiten empates.
            </p>
          </div>

          {blockReason ? (
            <p className="tournament-acta-confirm-hint" role="status">
              {blockReason}
            </p>
          ) : (
            <p className="tournament-acta-confirm-hint is-ready" role="status">
              Marcador listo: {nameA} {preview.a} – {preview.b} {nameB}.
            </p>
          )}

          <form action={confirmAction} className="tournament-acta-confirm-form">
            <button
              type="submit"
              className="btn-flood tournament-acta-confirm-btn"
              disabled={!canConfirm}
            >
              {confirmPending ? "Confirmando…" : "Confirmar resultado"}
            </button>
          </form>

          {confirmState?.ok === false ? (
            <p className="form-error" role="alert">
              {confirmState.error}
            </p>
          ) : null}
          {confirmState?.ok === true ? (
            <p className="form-ok" role="status">
              {confirmState.message ?? "Resultado confirmado."}
            </p>
          ) : null}
        </section>
      ) : null}

      {showStickyConfirm ? (
        <div className="tournament-acta-sticky" role="region" aria-label="Confirmar resultado">
          <div className="tournament-acta-sticky-score" aria-hidden="true">
            <span>{preview.a}</span>
            <span className="tournament-acta-sticky-sep">–</span>
            <span>{preview.b}</span>
          </div>
          <form action={confirmAction} className="tournament-acta-sticky-form">
            <button
              type="submit"
              className="btn-flood"
              disabled={!canConfirm}
            >
              {confirmPending ? "Confirmando…" : "Confirmar"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
