import type { Format, GenderPolicy, Level, Position, Sport } from "@/lib/constants";
import type { MatchTimePeriod } from "@/lib/datetime";

export const sportLabel: Record<Sport, string> = {
  futbol: "Fútbol",
  futbol_sala: "Fútbol sala",
  basquet: "Básquet",
  voleibol: "Voleibol",
  padel: "Pádel",
};

export const formatLabel: Record<Format, string> = {
  "2v2": "2 vs 2",
  "3v3": "3 vs 3",
  "4v4": "4 vs 4",
  "5v5": "5 vs 5",
  "6v6": "6 vs 6",
  "7v7": "7 vs 7",
  "8v8": "8 vs 8",
  "11v11": "11 vs 11",
};

export const positionLabel: Record<Position, string> = {
  any: "Cualquiera",
  gk: "Arquero",
  def: "Defensa",
  mid: "Medio",
  fwd: "Delantero",
  cierre: "Cierre",
  ala: "Ala",
  pivot: "Pívot",
  base: "Base",
  escolta: "Escolta",
  ala_pivot: "Ala-pívot",
  armador: "Armador",
  central: "Central",
  opuesto: "Opuesto",
  receptor: "Receptor",
  libero: "Líbero",
  drive: "Drive",
  reves: "Revés",
};

/** Plurales para copy de cupos (“2 delanteros”). */
export const positionLabelPlural: Record<Position, string> = {
  any: "Cualquiera",
  gk: "Arqueros",
  def: "Defensas",
  mid: "Medios",
  fwd: "Delanteros",
  cierre: "Cierres",
  ala: "Alas",
  pivot: "Pívots",
  base: "Bases",
  escolta: "Escoltas",
  ala_pivot: "Ala-pívots",
  armador: "Armadores",
  central: "Centrales",
  opuesto: "Opuestos",
  receptor: "Receptores",
  libero: "Líberos",
  drive: "Drives",
  reves: "Revés",
};

/** “1 arquero” / “2 delanteros” (minúsculas). */
export function positionCountLabel(position: string, count: number) {
  const key = position as Position;
  const singular = (positionLabel[key] ?? position).toLowerCase();
  if (count === 1) {
    return `1 ${singular}`;
  }
  const plural = (positionLabelPlural[key] ?? `${singular}s`).toLowerCase();
  return `${count} ${plural}`;
}

export const levelLabel: Record<Level, string> = {
  any: "Da igual",
  low: "Bajo",
  mid: "Medio",
  high: "Alto",
};

export const genderLabel: Record<GenderPolicy, string> = {
  mixed: "Mixto",
  men: "Hombres",
  women: "Mujeres",
};

export const venueKindLabel: Record<string, string> = {
  alquiler: "Alquiler",
  publica: "Pública",
  club: "Club",
};

export const surfaceLabel: Record<string, string> = {
  sintetica: "Sintética",
  grama: "Grama",
  grass: "Césped natural",
  dura: "Piso duro",
  cemento: "Cemento",
};

export const timePeriodLabel: Record<MatchTimePeriod, string> = {
  manana: "Mañana",
  tarde: "Tarde",
  noche: "Noche",
};

export const matchStatusLabel: Record<string, string> = {
  open: "Abierto",
  cancelled: "Cancelado",
};

export const claimStatusLabel: Record<string, string> = {
  pending: "Pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  withdrawn: "Retirado",
};
