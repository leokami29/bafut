export const SPORTS = ["futbol", "futbol_sala", "basquet", "voleibol", "padel"] as const;
export type Sport = (typeof SPORTS)[number];

export const FORMATS = ["2v2", "3v3", "4v4", "5v5", "6v6", "7v7", "8v8", "11v11"] as const;
export const POSITIONS = [
  "any",
  "gk",
  "def",
  "mid",
  "fwd",
  "cierre",
  "ala",
  "pivot",
  "base",
  "escolta",
  "ala_pivot",
  "armador",
  "central",
  "opuesto",
  "receptor",
  "libero",
  "drive",
  "reves",
] as const;
export const DURATIONS = [30, 60, 90] as const;

export type Format = (typeof FORMATS)[number];
export type Position = (typeof POSITIONS)[number];
export type DurationMin = (typeof DURATIONS)[number];

type SportRule = {
  formats: readonly Format[];
  positions: readonly Position[];
  hasKeeper: boolean;
  defaultFormat: Format;
};

export const SPORT_RULES: Record<Sport, SportRule> = {
  futbol: {
    formats: ["5v5", "6v6", "7v7", "8v8", "11v11"],
    positions: ["any", "gk", "def", "mid", "fwd"],
    hasKeeper: true,
    defaultFormat: "5v5",
  },
  futbol_sala: {
    formats: ["5v5"],
    positions: ["any", "gk", "cierre", "ala", "pivot"],
    hasKeeper: true,
    defaultFormat: "5v5",
  },
  basquet: {
    formats: ["3v3", "5v5"],
    positions: ["any", "base", "escolta", "ala", "ala_pivot", "pivot"],
    hasKeeper: false,
    defaultFormat: "5v5",
  },
  voleibol: {
    formats: ["2v2", "6v6"],
    positions: ["any", "armador", "central", "opuesto", "receptor", "libero"],
    hasKeeper: false,
    defaultFormat: "6v6",
  },
  padel: {
    formats: ["2v2", "4v4"],
    positions: ["any", "drive", "reves"],
    hasKeeper: false,
    defaultFormat: "2v2",
  },
};

export function isSport(value: string): value is Sport {
  return (SPORTS as readonly string[]).includes(value);
}

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

export function isPosition(value: string): value is Position {
  return (POSITIONS as readonly string[]).includes(value);
}

export function formatsForSport(sport: Sport) {
  return SPORT_RULES[sport].formats;
}

export function positionsForSport(sport: Sport) {
  return SPORT_RULES[sport].positions;
}

export function formatAllowedForSport(sport: Sport, format: Format) {
  return SPORT_RULES[sport].formats.includes(format);
}

export function positionAllowedForSport(sport: Sport, position: Position) {
  return SPORT_RULES[sport].positions.includes(position);
}

export function defaultFormatForSport(sport: Sport) {
  return SPORT_RULES[sport].defaultFormat;
}

export function venuesForSport<T extends { sports: string[] | null }>(venues: T[], sport: Sport) {
  return venues.filter((venue) => venue.sports?.includes(sport));
}

export function isDuration(value: number): value is DurationMin {
  return (DURATIONS as readonly number[]).includes(value);
}
