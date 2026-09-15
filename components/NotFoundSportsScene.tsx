"use client";

import { TournamentSportIcon } from "@/components/tournaments/TournamentSportIcon";
import { sportLabel } from "@/lib/labels";
import { SPORTS, type Sport } from "@/lib/sport-rules";

const MOTION: Record<Sport, string> = {
  futbol: "is-bounce",
  futbol_sala: "is-dash",
  basquet: "is-hoop",
  voleibol: "is-float",
  padel: "is-swing",
};

export function NotFoundSportsScene() {
  return (
    <div className="nf-pitch" aria-hidden="true">
      <div className="nf-pitch-field">
        <span className="nf-pitch-line nf-pitch-line-mid" />
        <span className="nf-pitch-circle" />
        <span className="nf-pitch-glow" />
      </div>

      <ul className="nf-sports">
        {SPORTS.map((sport, index) => (
          <li
            key={sport}
            className={`nf-sport nf-sport-${index + 1} ${MOTION[sport]}`}
            style={{ ["--nf-i" as string]: String(index) }}
          >
            <span className="nf-sport-orb">
              <TournamentSportIcon sport={sport} size={28} />
            </span>
            <span className="nf-sport-name">{sportLabel[sport]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
