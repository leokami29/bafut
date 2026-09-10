import Link from "next/link";
import type { BracketGroupInfo, FixtureMatch } from "@/lib/tournaments/load";
import { bmMatchStatusLabel } from "@/lib/tournaments/labels";

type Props = {
  matches: FixtureMatch[];
  rounds: Array<{ id: number; number: number; label: string; stageId?: number }>;
  groups?: BracketGroupInfo[];
  /** Si se pasa, cada partido linkea a la acta admin. */
  actaHref?: (matchId: number) => string;
  emptyHint?: string;
};

function scoreText(match: FixtureMatch): string {
  if (match.scoreA != null && match.scoreB != null) {
    return `${match.scoreA} – ${match.scoreB}`;
  }
  return "—";
}

function groupLabel(
  match: FixtureMatch,
  groups: BracketGroupInfo[] | undefined,
): string | null {
  if (!groups || groups.length <= 1) {
    // Multi-stage: show stage name as section when changing stage
    return null;
  }
  const g = groups.find((x) => x.id === match.groupId);
  return g?.label ?? `Grupo ${match.groupNumber}`;
}

export function TournamentBracketTable({
  matches,
  rounds,
  groups,
  actaHref,
  emptyHint = "Todavía no hay partidos en la llave.",
}: Props) {
  if (matches.length === 0) {
    return <p className="field-help">{emptyHint}</p>;
  }

  const roundLabelById = new Map(rounds.map((r) => [r.id, r.label]));
  const multiStage = new Set(matches.map((m) => m.stageId)).size > 1;
  const multiGroup = (groups?.length ?? 0) > 1;

  return (
    <div className="tournament-bracket">
      <ul className="tournament-fixture-list">
        {matches.map((match, idx) => {
          const prev = matches[idx - 1];
          const showStage = multiStage && (!prev || match.stageId !== prev.stageId);
          const showGroup =
            multiGroup &&
            (!prev || match.groupId !== prev.groupId || match.stageId !== prev.stageId);
          const showRound =
            !prev ||
            match.roundId !== prev.roundId ||
            match.groupId !== prev.groupId ||
            match.stageId !== prev.stageId;

          const gLabel = groupLabel(match, groups);
          const rLabel =
            roundLabelById.get(match.roundId) ??
            (match.stageType === "round_robin"
              ? `Jornada ${match.roundNumber}`
              : `Ronda ${match.roundNumber}`);
          const href = actaHref?.(match.id);

          const row = (
            <div className="tournament-fixture-row">
              <div className="tournament-fixture-teams">
                <span className="tournament-fixture-team">{match.nameA}</span>
                <span className="tournament-fixture-vs" aria-hidden="true">
                  vs
                </span>
                <span className="tournament-fixture-team">{match.nameB}</span>
              </div>
              <div className="tournament-fixture-meta">
                <span className="tournament-fixture-score">{scoreText(match)}</span>
                <span className="badge tournament-status-badge">
                  {match.confirmed ? "Confirmado" : bmMatchStatusLabel(match.status)}
                </span>
              </div>
            </div>
          );

          return (
            <li key={match.id} className="tournament-fixture-item">
              {showStage ? (
                <p className="tournament-stage-label">{match.stageName}</p>
              ) : null}
              {showGroup && gLabel ? (
                <p className="tournament-group-label">{gLabel}</p>
              ) : null}
              {showRound ? (
                <p className="tournament-round-label" id={`round-${match.roundId}`}>
                  {rLabel}
                </p>
              ) : null}
              {href ? (
                <Link href={href} className="tournament-fixture-link">
                  {row}
                </Link>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
