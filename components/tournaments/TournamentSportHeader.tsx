import Link from "next/link";
import { Calendar, MapPin, Target, Users } from "@/components/tournaments/TournamentIcons";
import { TournamentStatusChip } from "@/components/tournaments/TournamentStatusChip";
import { TournamentSportIcon } from "@/components/tournaments/TournamentSportIcon";
import type { TournamentFormat, TournamentSport, TournamentStatus } from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
} from "@/lib/tournaments/labels";

type Props = {
  name: string;
  sport: TournamentSport;
  format: TournamentFormat;
  status: TournamentStatus;
  teamCount: number;
  maxTeams: number;
  venueName: string;
  venueSlug: string;
  cityName: string;
  startsAt?: string | null;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
};

const SPORT_CONFIG: Record<
  string,
  { term: string; scoreTerm: string; colorClass: string }
> = {
  padel: {
    term: "parejas",
    scoreTerm: "Sets al mejor de 3",
    colorClass: "is-padel",
  },
  futbol: {
    term: "equipos",
    scoreTerm: "Goles",
    colorClass: "is-futbol",
  },
  basquet: {
    term: "equipos",
    scoreTerm: "Puntos",
    colorClass: "is-basquet",
  },
  voleibol: {
    term: "equipos",
    scoreTerm: "Sets",
    colorClass: "is-voleibol",
  },
};

export function TournamentSportHeader({
  name,
  sport,
  format,
  status,
  teamCount,
  maxTeams,
  venueName,
  venueSlug,
  cityName,
  startsAt,
}: Props) {
  const config = SPORT_CONFIG[sport] ?? {
    term: "equipos",
    scoreTerm: "Puntos",
    colorClass: "is-general",
  };

  return (
    <header className={`page-head tournament-detail-head ${config.colorClass}`}>
      <div className="tournament-head-top-row">
        <div className="tournament-sport-pill">
          <TournamentSportIcon sport={sport} size={15} className="tournament-sport-pill-icon" />
          <span className="tournament-sport-pill-label">
            {tournamentSportLabel[sport] ?? sport}
          </span>
        </div>

        <div className="tournament-format-pill">
          <span>{tournamentFormatLabel[format] ?? format}</span>
        </div>

        <TournamentStatusChip status={status} />
      </div>

      <h1 className="tournament-detail-title">{name}</h1>

      <div className="tournament-detail-meta-strip">
        <span className="tournament-meta-item">
          <MapPin size={14} aria-hidden="true" />
          <span>
            <Link href={`/canchas/${venueSlug}`}>{venueName}</Link> · {cityName}
          </span>
        </span>
        <span className="tournament-meta-sep" aria-hidden="true">
          ·
        </span>
        <span className="tournament-meta-item">
          <Users size={14} aria-hidden="true" />
          <span>
            {teamCount}/{maxTeams} {config.term}
          </span>
        </span>
        <span className="tournament-meta-sep" aria-hidden="true">
          ·
        </span>
        <span className="tournament-meta-item">
          <Target size={14} aria-hidden="true" />
          <span>{config.scoreTerm}</span>
        </span>
        {startsAt ? (
          <>
            <span className="tournament-meta-sep" aria-hidden="true">
              ·
            </span>
            <span className="tournament-meta-item">
              <Calendar size={14} aria-hidden="true" />
              <span>{new Date(startsAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}</span>
            </span>
          </>
        ) : null}
      </div>
    </header>
  );
}

