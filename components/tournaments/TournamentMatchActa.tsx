"use client";

import { useActionState, useState } from "react";
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
import { tournamentEventLabel } from "@/lib/tournaments/labels";
import { previewMatchScoreFromEvents, eventsToDomain } from "@/lib/tournaments/match-events";
import type { Json } from "@/lib/database.types";

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

  const [events, setEvents] = useState(initialEvents);
  const [layer, setLayer] = useState<"scoring" | "all">("scoring");
  const [period, setPeriod] = useState<string>("1");
  const [clock, setClock] = useState<string>("");
  const [isConfirmed, setIsConfirmed] = useState(confirmed);

  const preview = previewMatchScoreFromEvents(sport, eventsToDomain(events));

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

  return (
    <div className="tournament-acta">
      <header className="tournament-acta-head">
        <div className="tournament-acta-scoreboard" aria-live="polite">
          <div className="tournament-acta-side">
            <span className="tournament-acta-team">{nameA}</span>
            <strong className="tournament-acta-score">{preview.a}</strong>
          </div>
          <span className="tournament-acta-sep" aria-hidden="true">
            –
          </span>
          <div className="tournament-acta-side is-b">
            <strong className="tournament-acta-score">{preview.b}</strong>
            <span className="tournament-acta-team">{nameB}</span>
          </div>
        </div>
        <p className="field-help">
          Preview ({catalog.bracketScoreKind}
          {catalog.bestOf ? ` · best of ${catalog.bestOf}` : ""}
          ): {preview.complete ? "listo para confirmar" : "partido incompleto"}
          {isConfirmed ? " · ya confirmado" : ""}
        </p>
      </header>

      {canScore && !isConfirmed ? (
        <section className="tournament-acta-controls" aria-labelledby="acta-controls-title">
          <h2 id="acta-controls-title" className="subhead">
            Cargar evento
          </h2>

          <div className="mode-toggle" role="group" aria-label="Capa de eventos">
            <button
              type="button"
              className={layer === "scoring" ? "is-on" : undefined}
              onClick={() => setLayer("scoring")}
            >
              Scoring
            </button>
            <button
              type="button"
              className={layer === "all" ? "is-on" : undefined}
              onClick={() => setLayer("all")}
            >
              + Amateur
            </button>
          </div>

          <div className="form-split tournament-form-split">
            <label>
              Periodo
              <input
                type="number"
                min={0}
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Reloj (opcional)
              <input
                type="number"
                min={0}
                value={clock}
                onChange={(e) => setClock(e.target.value)}
                placeholder="min / punto"
                disabled={busy}
              />
            </label>
          </div>

          <div className="tournament-acta-sides">
            {(["a", "b"] as const).map((side) => {
              const teamName = side === "a" ? nameA : nameB;
              return (
                <div key={side} className="tournament-acta-side-pad">
                  <p className="tournament-acta-side-label">{teamName}</p>
                  <div className="tournament-event-grid">
                    {types.map((type) => (
                      <form key={`${side}-${type}`} action={appendAction}>
                        <input type="hidden" name="type" value={type} />
                        <input type="hidden" name="team_side" value={side} />
                        <input type="hidden" name="period" value={period} />
                        <input type="hidden" name="clock" value={clock} />
                        <button
                          type="submit"
                          className={side === "a" ? "btn-ghost" : "btn-flood"}
                          disabled={busy}
                          title={type}
                        >
                          {tournamentEventLabel(sport, type)}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {appendState?.ok === false ? (
            <p className="form-error">{appendState.error}</p>
          ) : null}
        </section>
      ) : null}

      <section className="tournament-acta-log" aria-labelledby="acta-log-title">
        <h2 id="acta-log-title" className="subhead">
          Acta ({activeCount} activos)
        </h2>
        {events.length === 0 ? (
          <p className="field-help">Sin eventos todavía.</p>
        ) : (
          <ul className="tournament-event-list">
            {[...events].reverse().map((ev) => (
              <li
                key={ev.id}
                className={`tournament-event-row${ev.voided_at ? " is-voided" : ""}`}
              >
                <div className="tournament-event-main">
                  <span className="badge">{ev.team_side === "a" ? nameA : nameB}</span>
                  <strong>{tournamentEventLabel(sport, ev.type)}</strong>
                  {ev.period != null ? (
                    <span className="tournament-event-meta">P{ev.period}</span>
                  ) : null}
                  {ev.clock != null ? (
                    <span className="tournament-event-meta">@{ev.clock}</span>
                  ) : null}
                  {ev.voided_at ? <span className="badge">Anulado</span> : null}
                </div>
                {canScore && !isConfirmed && !ev.voided_at ? (
                  <form action={voidAction}>
                    <input type="hidden" name="event_id" value={ev.id} />
                    <button type="submit" className="btn-bib" disabled={busy}>
                      Anular
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {voidState?.ok === false ? <p className="form-error">{voidState.error}</p> : null}
      </section>

      {canScore && !isConfirmed ? (
        <section className="tournament-acta-confirm">
          <form action={confirmAction}>
            <button
              type="submit"
              className="btn-flood"
              disabled={busy || activeCount === 0 || !preview.complete || preview.a === preview.b}
            >
              {confirmPending ? "Confirmando…" : "Confirmar resultado"}
            </button>
          </form>
          <p className="field-help">
            Al confirmar se deriva el marcador, se actualiza el bracket y se bloquea el acta.
            No se permiten empates.
          </p>
          {confirmState?.ok === false ? (
            <p className="form-error">{confirmState.error}</p>
          ) : null}
          {confirmState?.ok === true ? (
            <p className="form-ok">{confirmState.message ?? "Resultado confirmado."}</p>
          ) : null}
        </section>
      ) : null}

      {isConfirmed ? (
        <p className="form-ok">Este partido ya tiene resultado confirmado.</p>
      ) : null}
      {!canScore ? (
        <p className="field-help">Solo lectura: no tenés rol de scorer en esta cancha.</p>
      ) : null}
    </div>
  );
}
