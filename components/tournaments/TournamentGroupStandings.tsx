import { TournamentStandingsTable } from "@/components/tournaments/TournamentStandingsTable";
import type { GroupStandingBlock } from "@/lib/tournaments/load";

type Props = {
  blocks: GroupStandingBlock[];
  forLabel: string;
  againstLabel: string;
  emptyHint?: string;
};

/**
 * Tablas de posiciones por grupo (liga / fase de grupos).
 * Reutiliza TournamentStandingsTable del pipeline de stats.
 */
export function TournamentGroupStandings({
  blocks,
  forLabel,
  againstLabel,
  emptyHint = "Todavía no hay partidos confirmados para armar la tabla.",
}: Props) {
  if (blocks.length === 0) {
    return <p className="field-help">{emptyHint}</p>;
  }

  const anyRows = blocks.some((b) => b.rows.length > 0);
  if (!anyRows) {
    return <p className="field-help">{emptyHint}</p>;
  }

  return (
    <div className="tournament-group-standings">
      {blocks.map((block) => (
        <div key={block.groupId} className="tournament-group-standings-block">
          {blocks.length > 1 || block.label !== "Tabla general" ? (
            <h3 className="tournament-group-standings-title">{block.label}</h3>
          ) : null}
          <TournamentStandingsTable
            standings={block.rows}
            forLabel={forLabel}
            againstLabel={againstLabel}
            emptyHint="Sin equipos en este grupo."
          />
        </div>
      ))}
    </div>
  );
}
