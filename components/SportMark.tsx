import type { Sport } from "@/lib/constants";
import { sportLabel } from "@/lib/labels";

const SPORT_CODE: Record<Sport, string> = {
  futbol: "FUT",
  futbol_sala: "SALA",
  basquet: "BÁS",
  voleibol: "VÓL",
  padel: "PÁD",
};

function CourtGlyph({ sport }: { sport: Sport }) {
  switch (sport) {
    case "futbol_sala":
      return (
        <svg viewBox="0 0 40 28" aria-hidden="true" className="sport-mark-glyph">
          <rect x="2" y="2" width="36" height="24" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="20" y1="2" x2="20" y2="26" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="20" cy="14" r="4" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="8" width="5" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="33" y="8" width="5" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "basquet":
      return (
        <svg viewBox="0 0 40 28" aria-hidden="true" className="sport-mark-glyph">
          <rect x="2" y="2" width="36" height="24" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="20" y1="2" x2="20" y2="26" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="7" width="9" height="14" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="29" y="7" width="9" height="14" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="20" cy="14" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    case "voleibol":
      return (
        <svg viewBox="0 0 40 28" aria-hidden="true" className="sport-mark-glyph">
          <rect x="3" y="3" width="34" height="22" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="20" y1="3" x2="20" y2="25" stroke="currentColor" strokeWidth="2" />
          <line x1="12" y1="3" x2="12" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.55" />
          <line x1="28" y1="3" x2="28" y2="25" stroke="currentColor" strokeWidth="1" opacity="0.55" />
        </svg>
      );
    case "padel":
      return (
        <svg viewBox="0 0 40 28" aria-hidden="true" className="sport-mark-glyph">
          <rect x="5" y="4" width="30" height="20" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="20" y1="4" x2="20" y2="24" stroke="currentColor" strokeWidth="1.4" />
          <line x1="5" y1="14" x2="35" y2="14" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 40 28" aria-hidden="true" className="sport-mark-glyph">
          <rect x="2" y="2" width="36" height="24" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <line x1="20" y1="2" x2="20" y2="26" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="20" cy="14" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="2" y="8" width="5" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <rect x="33" y="8" width="5" height="12" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      );
  }
}

export function SportMark({ sport, compact = false }: { sport: Sport; compact?: boolean }) {
  const label = sportLabel[sport] ?? sport;
  return (
    <span className={`sport-mark${compact ? " is-compact" : ""}`} data-sport={sport} title={label}>
      <span className="sport-mark-code" aria-hidden="true">
        {SPORT_CODE[sport]}
      </span>
      <CourtGlyph sport={sport} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
