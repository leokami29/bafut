"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, ListOrdered, Trophy } from "@/components/tournaments/TournamentIcons";
import type { FixtureMatch } from "@/lib/tournaments/load";
import { bmMatchStatusLabel } from "@/lib/tournaments/labels";
import { TournamentSportIcon } from "@/components/tournaments/TournamentSportIcon";

type RoundInfo = {
  id: number;
  number: number;
  label: string;
  stageId?: number;
};

type Props = {
  matches: FixtureMatch[];
  rounds: RoundInfo[];
  sport?: string;
  actaHref?: (matchId: number) => string;
  emptyHint?: string;
};

function determineWinner(match: FixtureMatch): "a" | "b" | null {
  if (match.scoreA == null || match.scoreB == null) return null;
  if (match.scoreA > match.scoreB) return "a";
  if (match.scoreB > match.scoreA) return "b";
  return null;
}

export function TournamentVisualBracket({
  matches,
  rounds,
  sport = "padel",
  actaHref,
  emptyHint = "El cuadro de llaves aún no ha sido generado.",
}: Props) {
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [activeRoundFilter, setActiveRoundFilter] = useState<number | "all">("all");

  // Ordenar rondas por número secuencial
  const sortedRounds = useMemo(() => {
    return [...rounds].sort((a, b) => a.number - b.number);
  }, [rounds]);

  // Agrupar partidos por roundId
  const matchesByRound = useMemo(() => {
    const map = new Map<number, FixtureMatch[]>();
    for (const r of sortedRounds) {
      map.set(r.id, []);
    }
    for (const m of matches) {
      const list = map.get(m.roundId);
      if (list) {
        list.push(m);
      } else {
        map.set(m.roundId, [m]);
      }
    }
    // Ordenar partidos dentro de cada ronda por número
    for (const [, list] of map) {
      list.sort((a, b) => a.number - b.number);
    }
    return map;
  }, [matches, sortedRounds]);

  // Detectar ganador del torneo si la final está terminada
  const finalRound = sortedRounds[sortedRounds.length - 1];
  const finalMatches = finalRound ? matchesByRound.get(finalRound.id) ?? [] : [];
  const grandFinal = finalMatches[0] ?? null;
  const grandWinner = grandFinal ? determineWinner(grandFinal) : null;
  const championName =
    grandWinner === "a"
      ? grandFinal?.nameA
      : grandWinner === "b"
        ? grandFinal?.nameB
        : null;

  if (matches.length === 0) {
    return (
      <div className="tournament-empty">
        <p className="tournament-empty-title">Llaves por definir</p>
        <p className="field-help">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="tournament-bracket-container">
      {/* Barra de herramientas y alternancia de vista */}
      <div className="tournament-bracket-toolbar">
        <div className="tournament-view-switch" role="group" aria-label="Modo de vista">
          <button
            type="button"
            className={viewMode === "tree" ? "is-on" : undefined}
            onClick={() => setViewMode("tree")}
            aria-pressed={viewMode === "tree"}
          >
            <GitBranch size={13} aria-hidden="true" />
            <span>Árbol de Llaves</span>
          </button>
          <button
            type="button"
            className={viewMode === "list" ? "is-on" : undefined}
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
          >
            <ListOrdered size={13} aria-hidden="true" />
            <span>Lista de Partidos</span>
          </button>
        </div>

        {viewMode === "tree" && sortedRounds.length > 1 ? (
          <div className="tournament-round-tabs" role="tablist" aria-label="Filtro de ronda en móvil">
            <button
              type="button"
              className={activeRoundFilter === "all" ? "is-on" : undefined}
              onClick={() => setActiveRoundFilter("all")}
            >
              Todas
            </button>
            {sortedRounds.map((r) => (
              <button
                key={r.id}
                type="button"
                className={activeRoundFilter === r.id ? "is-on" : undefined}
                onClick={() => setActiveRoundFilter(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {viewMode === "tree" ? (
        <div className="tournament-bracket-tree-wrapper">
          <div className="tournament-bracket-tree" role="region" aria-label="Diagrama de llaves eliminatorias">
            {sortedRounds
              .filter((r) => activeRoundFilter === "all" || activeRoundFilter === r.id)
              .map((round, rIndex) => {
                const roundMatches = matchesByRound.get(round.id) ?? [];
                const isFinalRound = rIndex === sortedRounds.length - 1;

                return (
                  <div key={round.id} className="bracket-round-column">
                    <div className="bracket-round-header">
                      <span className="bracket-round-kicker">
                        <TournamentSportIcon sport={sport} size={12} aria-hidden="true" />
                        <span>Ronda {round.number}</span>
                      </span>
                      <h3 className="bracket-round-title">{round.label}</h3>
                      <span className="bracket-round-count">
                        {roundMatches.length} {roundMatches.length === 1 ? "partido" : "partidos"}
                      </span>
                    </div>

                    <div className="bracket-round-matches">
                      {roundMatches.map((match, mIndex) => {
                        const winner = determineWinner(match);
                        const isWinnerA = winner === "a";
                        const isWinnerB = winner === "b";
                        const isLive = match.status === 1; // running
                        const isDone = match.confirmed || match.status === 2; // completed
                        const href = actaHref?.(match.id);

                        const cardContent = (
                          <div
                            className={`bracket-match-card${isLive ? " is-live" : ""}${isDone ? " is-completed" : ""}`}
                          >
                            <div className="bracket-match-meta">
                              <span className="bracket-match-num">M{match.number}</span>
                              <span className="bracket-match-status">
                                {isLive ? "● En vivo" : match.confirmed ? "Final" : bmMatchStatusLabel(match.status)}
                              </span>
                            </div>

                            {/* Equipo / Pareja A */}
                            <div className={`bracket-participant${isWinnerA ? " is-winner" : ""}`}>
                              <div className="bracket-participant-info">
                                {match.opponent1?.position != null ? (
                                  <span className="bracket-seed-badge">#{match.opponent1.position}</span>
                                ) : null}
                                <span className="bracket-participant-name" title={match.nameA}>
                                  {match.nameA || "Por definir"}
                                </span>
                              </div>
                              <span className="bracket-score-badge">
                                {match.scoreA != null ? match.scoreA : "—"}
                              </span>
                            </div>

                            {/* Equipo / Pareja B */}
                            <div className={`bracket-participant${isWinnerB ? " is-winner" : ""}`}>
                              <div className="bracket-participant-info">
                                {match.opponent2?.position != null ? (
                                  <span className="bracket-seed-badge">#{match.opponent2.position}</span>
                                ) : null}
                                <span className="bracket-participant-name" title={match.nameB}>
                                  {match.nameB || "Por definir"}
                                </span>
                              </div>
                              <span className="bracket-score-badge">
                                {match.scoreB != null ? match.scoreB : "—"}
                              </span>
                            </div>
                          </div>
                        );

                        return (
                          <div key={match.id} className="bracket-match-slot">
                            {href ? (
                              <Link href={href} className="bracket-match-link">
                                {cardContent}
                              </Link>
                            ) : (
                              cardContent
                            )}
                            {/* Conector visual hacia la siguiente ronda */}
                            {!isFinalRound && activeRoundFilter === "all" ? (
                              <div
                                className={`bracket-connector${mIndex % 2 === 0 ? " is-top" : " is-bottom"}`}
                                aria-hidden="true"
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

            {/* Columna de Campeón */}
            {activeRoundFilter === "all" || activeRoundFilter === finalRound?.id ? (
              <div className="bracket-round-column bracket-champion-column">
                <div className="bracket-round-header">
                  <span className="bracket-round-kicker">Trofeo</span>
                  <h3 className="bracket-round-title">Campeón</h3>
                  <span className="bracket-round-count">Título</span>
                </div>

                <div className="bracket-champion-box">
                  <div className="bracket-champion-trophy" aria-hidden="true">
                    <Trophy size={44} strokeWidth={1.75} className="bracket-champion-trophy-svg" />
                  </div>
                  {championName ? (
                    <div className="bracket-champion-details">
                      <span className="bracket-champion-kicker">Ganador del torneo</span>
                      <strong className="bracket-champion-name">{championName}</strong>
                      <span className="bracket-champion-tag">Campeón Oficial</span>
                    </div>
                  ) : (
                    <div className="bracket-champion-details">
                      <span className="bracket-champion-kicker">Por coronar</span>
                      <strong className="bracket-champion-pending">En disputa</strong>
                      <span className="bracket-champion-hint">Se define en la gran final</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        /* Vista alternativa: Lista detallada de partidos */
        <div className="tournament-fixture-list-view">
          {sortedRounds.map((round) => {
            const roundMatches = matchesByRound.get(round.id) ?? [];
            return (
              <section key={round.id} className="tournament-round-section">
                <div className="tournament-round-section-head">
                  <h3 className="subhead">{round.label}</h3>
                  <span className="tournament-round-meta-tag">
                    {roundMatches.length} {roundMatches.length === 1 ? "partido" : "partidos"}
                  </span>
                </div>

                <ul className="tournament-fixture-list">
                  {roundMatches.map((match) => {
                    const winner = determineWinner(match);
                    const href = actaHref?.(match.id);
                    const rowContent = (
                      <div className="tournament-fixture-row">
                        <div className="tournament-fixture-teams">
                          <span className={`tournament-fixture-team${winner === "a" ? " is-winner" : ""}`}>
                            {match.nameA}
                          </span>
                          <span className="tournament-fixture-vs" aria-hidden="true">
                            vs
                          </span>
                          <span className={`tournament-fixture-team${winner === "b" ? " is-winner" : ""}`}>
                            {match.nameB}
                          </span>
                        </div>
                        <div className="tournament-fixture-meta">
                          <span className="tournament-fixture-score">
                            {match.scoreA != null && match.scoreB != null
                              ? `${match.scoreA} – ${match.scoreB}`
                              : "—"}
                          </span>
                          <span className="badge tournament-status-badge">
                            {match.confirmed ? "Confirmado" : bmMatchStatusLabel(match.status)}
                          </span>
                        </div>
                      </div>
                    );

                    return (
                      <li key={match.id} className="tournament-fixture-item">
                        {href ? (
                          <Link href={href} className="tournament-fixture-link">
                            {rowContent}
                          </Link>
                        ) : (
                          rowContent
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
