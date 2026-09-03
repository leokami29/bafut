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
