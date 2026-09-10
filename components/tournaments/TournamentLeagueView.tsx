"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Table2 } from "@/components/tournaments/TournamentIcons";
import type { BracketGroupInfo, FixtureMatch, GroupStandingBlock } from "@/lib/tournaments/load";
import { bmMatchStatusLabel } from "@/lib/tournaments/labels";
import { TournamentGroupStandings } from "@/components/tournaments/TournamentGroupStandings";
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
  groups?: BracketGroupInfo[];
  groupStandings: GroupStandingBlock[];
  forLabel: string;
  againstLabel: string;
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

export function TournamentLeagueView({
  matches,
  rounds,
  groupStandings,
  forLabel,
  againstLabel,
  sport = "padel",
  actaHref,
  emptyHint = "El calendario y las posiciones se publicarán una vez inicie el torneo.",
}: Props) {
  const [activeTab, setActiveTab] = useState<"standings" | "fixtures">("standings");
  const [selectedRoundId, setSelectedRoundId] = useState<number | "all">("all");

  // Ordenar rondas por número de jornada
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
    for (const [, list] of map) {
      list.sort((a, b) => a.number - b.number);
    }
    return map;
  }, [matches, sortedRounds]);

  return (
    <div className="tournament-league-container">
      {/* Selector de pestañas: Posiciones vs Jornadas */}
      <div className="tournament-league-nav" role="tablist" aria-label="Secciones de la liga">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "standings"}
          className={`tournament-tab-btn${activeTab === "standings" ? " is-active" : ""}`}
          onClick={() => setActiveTab("standings")}
        >
          <Table2 size={14} aria-hidden="true" />
          <span>Tabla de Posiciones</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "fixtures"}
          className={`tournament-tab-btn${activeTab === "fixtures" ? " is-active" : ""}`}
          onClick={() => setActiveTab("fixtures")}
        >
          <Calendar size={14} aria-hidden="true" />
          <span>Calendario de Jornadas ({matches.length})</span>
        </button>
      </div>

      {activeTab === "standings" ? (
        <div className="tournament-league-tab-content">
          <TournamentGroupStandings
            blocks={groupStandings}
            forLabel={forLabel}
            againstLabel={againstLabel}
            emptyHint="Todavía no hay resultados confirmados para armar la tabla de posiciones."
          />
        </div>
      ) : (
        <div className="tournament-league-tab-content">
          {/* Filtro por Jornadas */}
          {sortedRounds.length > 1 ? (
            <div className="tournament-round-filter-bar" role="group" aria-label="Filtrar por jornada">
              <button
                type="button"
                className={`tournament-filter-chip${selectedRoundId === "all" ? " is-selected" : ""}`}
                onClick={() => setSelectedRoundId("all")}
              >
                Todas las fechas
              </button>
              {sortedRounds.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`tournament-filter-chip${selectedRoundId === r.id ? " is-selected" : ""}`}
                  onClick={() => setSelectedRoundId(r.id)}
                >
                  {r.label || `Jornada ${r.number}`}
                </button>
              ))}
            </div>
          ) : null}

          {/* Lista de partidos agrupados por jornada */}
          {matches.length === 0 ? (
            <p className="field-help">{emptyHint}</p>
          ) : (
            <div className="tournament-league-fixtures">
              {sortedRounds
                .filter((r) => selectedRoundId === "all" || selectedRoundId === r.id)
                .map((round) => {
                  const roundMatches = matchesByRound.get(round.id) ?? [];
                  if (roundMatches.length === 0) return null;

                  return (
                    <section key={round.id} className="tournament-jornada-section">
                      <div className="tournament-jornada-header">
                        <span className="tournament-jornada-badge">
                          <TournamentSportIcon sport={sport} size={12} aria-hidden="true" />
                          <span>Jornada {round.number}</span>
                        </span>
                        <h3 className="tournament-jornada-title">{round.label}</h3>
                        <span className="tournament-jornada-count">
                          {roundMatches.length} {roundMatches.length === 1 ? "partido" : "partidos"}
                        </span>
                      </div>

                      <div className="tournament-league-match-grid">
                        {roundMatches.map((match) => {
                          const winner = determineWinner(match);
                          const isLive = match.status === 1;
                          const isDone = match.confirmed || match.status === 2;
                          const href = actaHref?.(match.id);

                          const matchCard = (
                            <div
                              className={`tournament-league-match-card${isLive ? " is-live" : ""}${isDone ? " is-completed" : ""}`}
                            >
                              <div className="tournament-league-match-meta">
                                <span className="tournament-league-match-id">M{match.number}</span>
                                <span className="tournament-league-match-status">
                                  {isLive ? "● En juego" : match.confirmed ? "Finalizado" : bmMatchStatusLabel(match.status)}
                                </span>
                              </div>

                              <div className="tournament-league-match-participants">
                                <div className={`tournament-league-row${winner === "a" ? " is-winner" : ""}`}>
                                  <span className="tournament-league-team-name">
                                    {match.nameA || "Por definir"}
                                  </span>
                                  <span className="tournament-league-score-chip">
                                    {match.scoreA != null ? match.scoreA : "—"}
                                  </span>
                                </div>

                                <div className={`tournament-league-row${winner === "b" ? " is-winner" : ""}`}>
                                  <span className="tournament-league-team-name">
                                    {match.nameB || "Por definir"}
                                  </span>
                                  <span className="tournament-league-score-chip">
                                    {match.scoreB != null ? match.scoreB : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );

                          return (
                            <div key={match.id} className="tournament-league-match-item">
                              {href ? (
                                <Link href={href} className="tournament-league-match-link">
                                  {matchCard}
                                </Link>
                              ) : (
                                matchCard
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
