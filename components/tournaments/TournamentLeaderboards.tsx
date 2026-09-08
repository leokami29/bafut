import type { LeaderboardBoard } from "@/lib/tournaments/stats-load";

type Props = {
  boards: LeaderboardBoard[];
  emptyHint?: string;
};

export function TournamentLeaderboards({
  boards,
  emptyHint = "Sin estadísticas de jugadores todavía. Se llenan al confirmar actas.",
}: Props) {
  const hasAny = boards.some((b) => b.entries.length > 0);
  if (!hasAny) {
    return <p className="field-help">{emptyHint}</p>;
  }

  return (
    <div className="tournament-leaderboards">
      {boards.map((board) => (
        <section
          key={board.key}
          className="tournament-leaderboard"
          aria-labelledby={`lb-${board.key}`}
        >
          <h3 id={`lb-${board.key}`} className="tournament-leaderboard-title">
            {board.label}
          </h3>
          {board.entries.length === 0 ? (
            <p className="field-help">Sin registros.</p>
          ) : (
            <ol className="tournament-leaderboard-list">
              {board.entries.map((entry, idx) => (
                <li key={entry.teamMemberId} className="tournament-leaderboard-row">
                  <span className="tournament-leaderboard-rank">{idx + 1}</span>
                  <span className="tournament-leaderboard-player">
                    <span className="tournament-leaderboard-name">
                      {entry.jerseyNumber != null
                        ? `#${entry.jerseyNumber} `
                        : null}
                      {entry.displayName}
                    </span>
                    <span className="tournament-leaderboard-team">
                      {entry.teamName}
                    </span>
                  </span>
                  <span className="tournament-leaderboard-value">{entry.value}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
