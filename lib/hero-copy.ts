import type { Sport } from "@/lib/constants";

/** IDs de rol/posición faltante por deporte — fuente única para el copy del hero. */
export const FUTBOL_ROLES = ["arquero", "lateral", "medio", "delantero"] as const;
export const FUTBOL_SALA_ROLES = ["arquero", "cierre", "ala", "pivot"] as const;
export const BASQUET_ROLES = ["base", "escolta", "ala", "ala-pivot", "pivot"] as const;
export const VOLEIBOL_ROLES = ["armador", "central", "opuesto", "receptor", "libero"] as const;
export const PADEL_ROLES = ["pareja", "companero"] as const;

export type FutbolRole = (typeof FUTBOL_ROLES)[number];
export type FutbolSalaRole = (typeof FUTBOL_SALA_ROLES)[number];
export type BasquetRole = (typeof BASQUET_ROLES)[number];
export type VoleibolRole = (typeof VOLEIBOL_ROLES)[number];
export type PadelRole = (typeof PADEL_ROLES)[number];

export type HeroRoleBySport = {
  futbol: FutbolRole;
  futbol_sala: FutbolSalaRole;
  basquet: BasquetRole;
  voleibol: VoleibolRole;
  padel: PadelRole;
};

export type HeroMissingRole = HeroRoleBySport[Sport];

/** Orden de asignación de roles a slots en básquet (5 jugadores). */
export const BASQUET_SLOT_ROLES: readonly BasquetRole[] = BASQUET_ROLES;

/** Frases del hero por deporte y rol — tono es-CO. */
export const HERO_HEADLINES: { [S in Sport]: Record<HeroRoleBySport[S], string> } = {
  futbol: {
    arquero: "Falta un arquero a las 8. ¿Quién entra?",
    lateral: "Falta un lateral a las 8. ¿Quién entra?",
    medio: "Falta un medio a las 8. ¿Quién entra?",
    delantero: "Falta un delantero a las 8. ¿Quién entra?",
  },
  futbol_sala: {
    arquero: "Falta un arquero a las 8. ¿Quién entra?",
    cierre: "Falta un cierre a las 8. ¿Quién entra?",
    ala: "Falta un ala a las 8. ¿Quién entra?",
    pivot: "Falta un pívot a las 8. ¿Quién entra?",
  },
  basquet: {
    base: "Falta un base a las 8. ¿Quién entra?",
    escolta: "Falta un escolta a las 8. ¿Quién entra?",
    ala: "Falta un ala a las 8. ¿Quién entra?",
    "ala-pivot": "Falta un ala-pívot a las 8. ¿Quién entra?",
    pivot: "Falta un pívot a las 8. ¿Quién entra?",
  },
  voleibol: {
    armador: "Falta un armador a las 8. ¿Quién entra?",
    central: "Falta un central a las 8. ¿Quién entra?",
    opuesto: "Falta un opuesto a las 8. ¿Quién entra?",
    receptor: "Falta un receptor a las 8. ¿Quién entra?",
    libero: "Falta un líbero a las 8. ¿Quién entra?",
  },
  padel: {
    pareja: "Falta la pareja en la cancha. ¿Quién entra?",
    companero: "Falta un compañero a las 8. ¿Quién entra?",
  },
};

/** Genérico antes de montar el pitch aleatorio (sin referencia a un deporte). */
export const HERO_HEADLINE_FALLBACK = "Falta uno a las 8. ¿Quién entra?";

export function getHeroHeadline<S extends Sport>(
  sport: S,
  missingRole: HeroRoleBySport[S],
): string {
  return HERO_HEADLINES[sport][missingRole];
}
