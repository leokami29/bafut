import { TournamentLeaderboards } from "@/components/tournaments/TournamentLeaderboards";
import { TournamentStandingsTable } from "@/components/tournaments/TournamentStandingsTable";
import { TournamentStatsCharts } from "@/components/tournaments/TournamentStatsCharts";
import type { TournamentStatsView } from "@/lib/tournaments/stats-load";

type Props = {
  stats: TournamentStatsView;
  /** Prefijo de ids de sección para a11y (público vs admin). */
  idPrefix?: string;
  className?: string;
};

export function TournamentStatsPanel({
  stats,
  idPrefix = "stats",
  className,
}: Props) {
  return (
    <div className={className}>
      <section
        className="tournament-stats-section"
        aria-labelledby={`${idPrefix}-standings`}
      >
        <h2 id={`${idPrefix}-standings`} className="subhead">
          Tabla
        </h2>
        <TournamentStandingsTable
          standings={stats.standings}
          forLabel={stats.forLabel}
          againstLabel={stats.againstLabel}
        />
      </section>

      <section
        className="tournament-stats-section"
        aria-labelledby={`${idPrefix}-leaders`}
      >
        <h2 id={`${idPrefix}-leaders`} className="subhead">
          Líderes
        </h2>
        <TournamentLeaderboards boards={stats.leaderboards} />
      </section>

      <section
        className="tournament-stats-section"
        aria-labelledby={`${idPrefix}-charts`}
      >
        <h2 id={`${idPrefix}-charts`} className="subhead">
          Gráficos
        </h2>
        <TournamentStatsCharts
          teamBars={stats.teamBars}
          forLabel={stats.forLabel}
          againstLabel={stats.againstLabel}
          scoreKind={stats.scoreKind}
          evolution={stats.evolution}
        />
      </section>
    </div>
  );
}
