import type { StandingRow } from "@/lib/tournaments/stats-load";

type Props = {
  standings: StandingRow[];
  forLabel: string;
  againstLabel: string;
  emptyHint?: string;
};

export function TournamentStandingsTable({
  standings,
  forLabel,
  againstLabel,
  emptyHint = "Todavía no hay partidos confirmados para armar la tabla.",
}: Props) {
  if (standings.length === 0) {
    return <p className="field-help">{emptyHint}</p>;
  }

  return (
    <div className="tournament-standings-wrap">
      <table className="tournament-standings-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Equipo</th>
            <th scope="col">PJ</th>
            <th scope="col">PG</th>
            <th scope="col">PE</th>
            <th scope="col">PP</th>
            <th scope="col">{forLabel}</th>
            <th scope="col">{againstLabel}</th>
            <th scope="col">Dif</th>
            <th scope="col">Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, idx) => {
            const diff = row.forScore - row.againstScore;
            return (
              <tr key={row.teamId}>
                <td>{idx + 1}</td>
                <td className="tournament-standings-team">{row.teamName}</td>
                <td>{row.played}</td>
                <td>{row.wins}</td>
                <td>{row.draws}</td>
                <td>{row.losses}</td>
                <td>{row.forScore}</td>
                <td>{row.againstScore}</td>
                <td>
                  {diff > 0 ? `+${diff}` : diff}
                </td>
                <td className="tournament-standings-pts">{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
