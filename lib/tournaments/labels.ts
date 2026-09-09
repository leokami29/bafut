import type { TournamentFormat, TournamentSport, TournamentStatus } from "@/lib/tournaments/authz";
import type { SportId } from "@/lib/tournaments/sports";

export const tournamentSportLabel: Record<TournamentSport, string> = {
  futbol: "Fútbol",
  voleibol: "Vóleibol",
  basquet: "Básquet",
  padel: "Pádel",
};

export const tournamentFormatLabel: Record<TournamentFormat, string> = {
  single_elim: "Eliminación simple",
  double_elim: "Eliminación doble",
  round_robin: "Todos contra todos",
  groups_knockout: "Grupos + llave",
};

export const tournamentStatusLabel: Record<TournamentStatus, string> = {
  draft: "Borrador",
  registration: "Inscripción",
  active: "En curso",
  completed: "Finalizado",
  archived: "Archivado",
};

export const tournamentVisibilityLabel = {
  private: "Privado",
  published: "Público",
} as const;

/** Etiquetas UI de tipos de evento por deporte (scoring + amateur). */
const EVENT_LABELS: Record<SportId, Record<string, string>> = {
  futbol: {
    goal: "Gol",
    own_goal: "Autogol",
    yellow_card: "Amarilla",
    red_card: "Roja",
    assist: "Asistencia",
  },
  voleibol: {
    set_point: "Punto de set",
    set_won: "Set ganado",
    ace: "Ace",
    kill: "Remate",
    block_solo: "Bloqueo",
    block_assist: "Bloqueo asist.",
    dig: "Defensa",
    attack_error: "Error ataque",
    serve_error: "Error saque",
  },
  basquet: {
    fg2_made: "Doble",
    fg3_made: "Triple",
    ft_made: "Libre",
    fg2_miss: "Doble fallado",
    fg3_miss: "Triple fallado",
    ft_miss: "Libre fallado",
    reb: "Rebote",
    ast: "Asistencia",
    stl: "Robo",
    blk: "Tapón",
    tov: "Pérdida",
    foul: "Falta",
  },
  padel: {
    point_won: "Punto",
    game_won: "Game",
    set_won: "Set ganado",
    ace: "Ace",
    double_fault: "Doble falta",
    winner: "Winner",
    forced_error: "Error forzado",
    unforced_error: "Error no forzado",
  },
};

export function tournamentEventLabel(sport: SportId, type: string): string {
  return EVENT_LABELS[sport]?.[type] ?? type;
}

/** Unidad del marcador principal (lo que confirma el bracket). */
export function tournamentScoreUnitLabel(sport: SportId): string {
  switch (sport) {
    case "futbol":
      return "Goles";
    case "basquet":
      return "Puntos";
    case "voleibol":
    case "padel":
      return "Sets";
    default:
      return "Marcador";
  }
}

/** Etiquetas de periodo / reloj en el acta según deporte. */
export function tournamentActaFieldLabels(sport: SportId): {
  period: string;
  clock: string;
  clockPlaceholder: string;
} {
  switch (sport) {
    case "futbol":
      return { period: "Tiempo", clock: "Minuto", clockPlaceholder: "ej. 12" };
    case "basquet":
      return { period: "Cuarto", clock: "Minuto", clockPlaceholder: "ej. 3" };
    case "voleibol":
      return { period: "Set", clock: "Punto #", clockPlaceholder: "opcional" };
    case "padel":
      return { period: "Set", clock: "Game #", clockPlaceholder: "opcional" };
    default:
      return { period: "Periodo", clock: "Reloj", clockPlaceholder: "opcional" };
  }
}

export function bmMatchStatusLabel(status: number): string {
  switch (status) {
    case 0:
      return "Bloqueado";
    case 1:
      return "Esperando";
    case 2:
      return "Listo";
    case 3:
      return "En juego";
    case 4:
      return "Completado";
    case 5:
      return "Archivado";
    default:
      return `Estado ${status}`;
  }
}
