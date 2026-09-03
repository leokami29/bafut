/**
 * Catálogo completo de formaciones BaFut.
 *
 * Fuentes (investigación 2026-09-03):
 * - Football / a-side: startinglineup.co.uk/football-formations, soccerxpert.com/formations,
 *   soccercoachweekly.net/formats, themastermindsite.com (6v6/8v8), socceriate.com,
 *   thisisamericansoccer.com/8v8, socceredu.com, soccercoachlab.com
 * - Futsal: footyware.com/futsal-formations, footbolno.com, futsalta.com, futsal.tech
 * - Vóley: howtocoachvolleyball.com (6 sistemas), activesgcircle, volleyballworld,
 *   volleyinsight, hoopsking
 * - Básquet: sportplan 2-3, sporitrax 1-3-1, roundballcoach 1-2-2; 3v3 spacing guides
 * - Pádel: padel39, playpadel.sg, cortapadel, padel-magazine, PLOS ONE service formations
 *
 * Reglas:
 * - Fútbol / sala: `lines` = solo de campo (GK fuera del string).
 * - Vóley / básquet / pádel: `lines` cuenta a todos.
 * - `featured` = chips prioritarios; `common` = lista corta; el resto vía “Ver más”.
 */

import type { Format, Position, Sport } from "@/lib/sport-rules";

export type FormationRarity = "common" | "mvp" | "rare";

export function playersPerSideFromFormat(format: string | null | undefined): number {
  const match = /^(\d+)v(\d+)$/i.exec(format?.trim() ?? "");
  if (!match) return 5;
  return Math.max(1, Number(match[1]));
}

export type FormationEntry = {
  id: string;
  sport: Sport;
  format: Format;
  /** Líneas tácticas (sin GK en fútbol/sala). */
  lines: number[];
  /** Etiqueta corta (ej. "4-3-3", "5-1"). */
  label: string;
  /** Nombre opcional más descriptivo. */
  name?: string;
  featured: boolean;
  common: boolean;
  rarity: FormationRarity;
  includeGk: boolean;
  /** Roles sugeridos por slot (orden: GK si aplica, luego líneas). */
  roles?: Position[];
};

function linesLabel(lines: number[]): string {
  return lines.filter((n) => n > 0).join("-") || "1";
}

function outfieldSum(lines: number[]): number {
  return lines.reduce((sum, n) => sum + Math.max(0, n), 0);
}

function assertSoccer(format: Format, lines: number[]) {
  const need = playersPerSideFromFormat(format) - 1;
  if (outfieldSum(lines) !== need) {
    throw new Error(`Formación ${linesLabel(lines)} no suma ${need} para ${format}`);
  }
}

function soccerRoles(lines: number[], includeGk: boolean): Position[] {
  const roles: Position[] = [];
  if (includeGk) roles.push("gk");
  const active = lines
    .map((count, lineIndex) => ({ count, lineIndex }))
    .filter((l) => l.count > 0);
  const total = active.length;
  active.forEach((line, pos) => {
    const role: Position = pos === 0 ? "def" : pos === total - 1 ? "fwd" : "mid";
    for (let i = 0; i < line.count; i += 1) roles.push(role);
  });
  return roles;
}

function futsalRoles(lines: number[]): Position[] {
  const roles: Position[] = ["gk"];
  const active = lines
    .map((count, lineIndex) => ({ count, lineIndex }))
    .filter((l) => l.count > 0);
  const total = active.length;
  active.forEach((line, pos) => {
    const role: Position =
      pos === 0 ? "cierre" : pos === total - 1 ? "pivot" : "ala";
    for (let i = 0; i < line.count; i += 1) roles.push(role);
  });
  return roles;
}

function soccerEntry(
  format: Format,
  lines: number[],
  opts: {
    featured?: boolean;
    common?: boolean;
    rarity?: FormationRarity;
    name?: string;
    idSuffix?: string;
  } = {},
): FormationEntry {
  assertSoccer(format, lines);
  const label = linesLabel(lines);
  const id = `futbol-${format}-${opts.idSuffix ?? label}`;
  const featured = opts.featured ?? false;
  const common = opts.common ?? featured;
  return {
    id,
    sport: "futbol",
    format,
    lines,
    label,
    name: opts.name,
    featured,
    common,
    rarity: opts.rarity ?? (featured || common ? "common" : "rare"),
    includeGk: true,
    roles: soccerRoles(lines, true),
  };
}

function futsalEntry(
  lines: number[],
  opts: {
    featured?: boolean;
    common?: boolean;
    rarity?: FormationRarity;
    name?: string;
    label?: string;
    idSuffix?: string;
  } = {},
): FormationEntry {
  if (outfieldSum(lines) !== 4) {
    throw new Error(`Futsal ${linesLabel(lines)} debe sumar 4 de campo`);
  }
  const label = opts.label ?? linesLabel(lines);
  return {
    id: `futbol_sala-5v5-${opts.idSuffix ?? label}`,
    sport: "futbol_sala",
    format: "5v5",
    lines,
    label,
    name: opts.name,
    featured: opts.featured ?? false,
    common: opts.common ?? opts.featured ?? false,
    rarity: opts.rarity ?? "common",
    includeGk: true,
    roles: futsalRoles(lines),
  };
}

/** ——— Fútbol 5v5 (4 de campo + GK) ——— */
const FUTBOL_5V5: FormationEntry[] = [
  soccerEntry("5v5", [1, 2, 1], { featured: true, common: true, name: "Diamante" }),
  soccerEntry("5v5", [2, 1, 1], { featured: true, common: true }),
  soccerEntry("5v5", [2, 2], { featured: true, common: true, name: "Caja / Square" }),
  soccerEntry("5v5", [1, 1, 2], { common: true }),
  soccerEntry("5v5", [3, 1], { rarity: "mvp", common: false }),
  soccerEntry("5v5", [1, 3], { rarity: "rare", common: false }),
  soccerEntry("5v5", [4], { rarity: "rare", common: false, name: "Línea plana" }),
];

/** ——— Fútbol 6v6 (5 de campo) ——— */
const FUTBOL_6V6: FormationEntry[] = [
  soccerEntry("6v6", [2, 2, 1], { featured: true, common: true }),
  soccerEntry("6v6", [2, 1, 2], { featured: true, common: true }),
  soccerEntry("6v6", [3, 1, 1], { featured: true, common: true }),
  soccerEntry("6v6", [1, 3, 1], { common: true }),
  soccerEntry("6v6", [1, 2, 2], { common: true }),
  soccerEntry("6v6", [3, 2], { rarity: "mvp" }),
  soccerEntry("6v6", [2, 3], { rarity: "mvp" }),
  soccerEntry("6v6", [1, 1, 3], { rarity: "rare" }),
  soccerEntry("6v6", [4, 1], { rarity: "rare" }),
  soccerEntry("6v6", [1, 4], { rarity: "rare" }),
];

/** ——— Fútbol 7v7 (6 de campo) ——— */
const FUTBOL_7V7: FormationEntry[] = [
  soccerEntry("7v7", [2, 3, 1], { featured: true, common: true }),
  soccerEntry("7v7", [3, 2, 1], { featured: true, common: true }),
  soccerEntry("7v7", [2, 2, 2], { featured: true, common: true }),
  soccerEntry("7v7", [3, 1, 2], { common: true }),
  soccerEntry("7v7", [2, 1, 2, 1], { common: true, name: "Diamante" }),
  soccerEntry("7v7", [1, 3, 2], { common: true }),
  soccerEntry("7v7", [3, 3], { rarity: "mvp" }),
  soccerEntry("7v7", [4, 1, 1], { rarity: "mvp" }),
  soccerEntry("7v7", [1, 2, 2, 1], { rarity: "rare" }),
  soccerEntry("7v7", [2, 1, 3], { rarity: "rare" }),
  soccerEntry("7v7", [1, 4, 1], { rarity: "rare" }),
  soccerEntry("7v7", [4, 2], { rarity: "rare" }),
];

/** ——— Fútbol 8v8 (7 de campo) ——— */
const FUTBOL_8V8: FormationEntry[] = [
  soccerEntry("8v8", [3, 3, 1], { featured: true, common: true }),
  soccerEntry("8v8", [2, 3, 2], { featured: true, common: true }),
  soccerEntry("8v8", [3, 2, 2], { featured: true, common: true }),
  soccerEntry("8v8", [2, 4, 1], { common: true, name: "Diamante de medio" }),
  soccerEntry("8v8", [3, 1, 3], { common: true }),
  soccerEntry("8v8", [2, 2, 3], { common: true }),
  soccerEntry("8v8", [4, 2, 1], { common: true }),
  soccerEntry("8v8", [2, 1, 2, 2], { rarity: "mvp" }),
  soccerEntry("8v8", [1, 3, 2, 1], { rarity: "mvp" }),
  soccerEntry("8v8", [3, 2, 1, 1], { rarity: "rare" }),
  soccerEntry("8v8", [4, 3], { rarity: "rare" }),
  soccerEntry("8v8", [1, 2, 3, 1], { rarity: "rare" }),
];

/** ——— Fútbol 11v11 (10 de campo) — incluye TODAS las de la imagen del usuario ——— */
const FUTBOL_11V11: FormationEntry[] = [
  soccerEntry("11v11", [4, 4, 2], { featured: true, common: true }),
  soccerEntry("11v11", [4, 3, 3], { featured: true, common: true }),
  soccerEntry("11v11", [4, 2, 3, 1], { featured: true, common: true }),
  soccerEntry("11v11", [3, 5, 2], { featured: true, common: true }),
  soccerEntry("11v11", [3, 4, 3], { featured: true, common: true }),
  soccerEntry("11v11", [5, 3, 2], { featured: true, common: true }),
  // Imagen usuario (completas)
  soccerEntry("11v11", [4, 5, 1], { common: true }),
  soccerEntry("11v11", [3, 1, 5, 1], { common: true, rarity: "mvp" }),
  soccerEntry("11v11", [5, 4, 1], { common: true }),
  soccerEntry("11v11", [4, 2, 2, 2], { common: true }),
  soccerEntry("11v11", [2, 4, 4], { rarity: "mvp" }),
  soccerEntry("11v11", [2, 5, 3], { rarity: "mvp" }),
  // Ampliación estándar
  soccerEntry("11v11", [4, 1, 4, 1], { common: true }),
  soccerEntry("11v11", [4, 3, 2, 1], { common: true }),
  soccerEntry("11v11", [3, 4, 2, 1], { common: true }),
  soccerEntry("11v11", [4, 4, 1, 1], { common: true }),
  soccerEntry("11v11", [5, 2, 3], { rarity: "mvp" }),
  soccerEntry("11v11", [3, 5, 1, 1], { rarity: "mvp" }),
  soccerEntry("11v11", [3, 4, 1, 2], { rarity: "mvp" }),
  soccerEntry("11v11", [4, 1, 3, 2], { rarity: "mvp" }),
  soccerEntry("11v11", [3, 1, 4, 2], { rarity: "rare" }),
  soccerEntry("11v11", [4, 2, 4], { rarity: "rare" }),
  soccerEntry("11v11", [3, 3, 3, 1], { rarity: "rare" }),
  soccerEntry("11v11", [3, 3, 4], { rarity: "rare" }),
  soccerEntry("11v11", [5, 3, 1, 1], { rarity: "rare" }),
  soccerEntry("11v11", [3, 6, 1], { rarity: "rare" }),
  soccerEntry("11v11", [6, 3, 1], { rarity: "rare" }),
  soccerEntry("11v11", [2, 3, 5], { rarity: "rare" }),
];

/** ——— Futsal 5v5 ——— */
const FUTSAL: FormationEntry[] = [
  futsalEntry([1, 2, 1], { featured: true, common: true, name: "Diamante / 3-1", label: "1-2-1" }),
  futsalEntry([2, 2], { featured: true, common: true, name: "Cuadrado / 2-2" }),
  futsalEntry([2, 1, 1], { featured: true, common: true, name: "Pirámide / Y", label: "2-1-1" }),
  futsalEntry([1, 1, 2], { common: true, name: "Y ofensiva" }),
  futsalEntry([3, 1], { common: true, name: "Muro / 3-1", label: "3-1" }),
  futsalEntry([4], { rarity: "mvp", common: false, name: "Quatro / 4-0", label: "4-0" }),
  futsalEntry([1, 3], { rarity: "rare", common: false }),
];

/** ——— Básquet ——— */
const BASQUET_5: FormationEntry[] = [
  {
    id: "basquet-5v5-2-1-2",
    sport: "basquet",
    format: "5v5",
    lines: [2, 1, 2],
    label: "2-1-2",
    name: "Clásica",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
  {
    id: "basquet-5v5-1-2-2",
    sport: "basquet",
    format: "5v5",
    lines: [1, 2, 2],
    label: "1-2-2",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
  {
    id: "basquet-5v5-1-3-1",
    sport: "basquet",
    format: "5v5",
    lines: [1, 3, 1],
    label: "1-3-1",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
  {
    id: "basquet-5v5-2-3",
    sport: "basquet",
    format: "5v5",
    lines: [2, 3],
    label: "2-3",
    name: "Zona baja",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
  {
    id: "basquet-5v5-3-2",
    sport: "basquet",
    format: "5v5",
    lines: [3, 2],
    label: "3-2",
    common: true,
    featured: false,
    rarity: "common",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
  {
    id: "basquet-5v5-2-2-1",
    sport: "basquet",
    format: "5v5",
    lines: [2, 2, 1],
    label: "2-2-1",
    common: true,
    featured: false,
    rarity: "mvp",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
  {
    id: "basquet-5v5-1-1-3",
    sport: "basquet",
    format: "5v5",
    lines: [1, 1, 3],
    label: "1-1-3",
    common: false,
    featured: false,
    rarity: "rare",
    includeGk: false,
    roles: ["base", "escolta", "ala", "ala_pivot", "pivot"],
  },
];

const BASQUET_3: FormationEntry[] = [
  {
    id: "basquet-3v3-1-1-1",
    sport: "basquet",
    format: "3v3",
    lines: [1, 1, 1],
    label: "1-1-1",
    name: "Triángulo",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["base", "ala", "pivot"],
  },
  {
    id: "basquet-3v3-2-1",
    sport: "basquet",
    format: "3v3",
    lines: [2, 1],
    label: "2-1",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["base", "ala", "pivot"],
  },
  {
    id: "basquet-3v3-1-2",
    sport: "basquet",
    format: "3v3",
    lines: [1, 2],
    label: "1-2",
    common: true,
    featured: false,
    rarity: "common",
    includeGk: false,
    roles: ["base", "ala", "pivot"],
  },
];

function volley6(
  system: string,
  opts: {
    featured?: boolean;
    common?: boolean;
    rarity?: FormationRarity;
    name?: string;
    roles: Position[];
  },
): FormationEntry {
  return {
    id: `voleibol-6v6-${system}`,
    sport: "voleibol",
    format: "6v6",
    lines: [3, 3],
    label: system,
    name: opts.name,
    featured: opts.featured ?? false,
    common: opts.common ?? opts.featured ?? false,
    rarity: opts.rarity ?? "common",
    includeGk: false,
    roles: opts.roles,
  };
}

/** Sistemas ofensivos 6v6 (layout 3-3; roles cambian). */
const VOLEY_6: FormationEntry[] = [
  volley6("5-1", {
    featured: true,
    common: true,
    name: "Un armador",
    roles: ["receptor", "central", "opuesto", "armador", "libero", "central"],
  }),
  volley6("4-2", {
    featured: true,
    common: true,
    name: "Dos armadores (frente)",
    roles: ["receptor", "armador", "opuesto", "receptor", "libero", "armador"],
  }),
  volley6("6-2", {
    featured: true,
    common: true,
    name: "Dos armadores (fondo)",
    roles: ["receptor", "central", "opuesto", "armador", "libero", "armador"],
  }),
  volley6("6-0", {
    common: true,
    name: "Sin armador fijo",
    rarity: "mvp",
    roles: ["receptor", "central", "opuesto", "receptor", "libero", "central"],
  }),
  volley6("5-2", {
    rarity: "rare",
    name: "Dos armadores mixtos",
    roles: ["receptor", "central", "opuesto", "armador", "libero", "armador"],
  }),
  volley6("6-3", {
    rarity: "rare",
    name: "Tres armadores",
    roles: ["armador", "central", "opuesto", "armador", "libero", "armador"],
  }),
  volley6("6-6", {
    rarity: "rare",
    name: "Play where you are",
    roles: ["any", "any", "any", "any", "any", "any"],
  }),
];

const VOLEY_2: FormationEntry[] = [
  {
    id: "voleibol-2v2-1-1",
    sport: "voleibol",
    format: "2v2",
    lines: [1, 1],
    label: "1-1",
    name: "Paralelo",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["receptor", "armador"],
  },
  {
    id: "voleibol-2v2-diagonal",
    sport: "voleibol",
    format: "2v2",
    lines: [1, 1],
    label: "Diagonal",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["armador", "receptor"],
  },
];

const PADEL_2: FormationEntry[] = [
  {
    id: "padel-2v2-classic",
    sport: "padel",
    format: "2v2",
    lines: [2],
    label: "Clásica",
    name: "Drive + Revés (paralelo)",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["drive", "reves"],
  },
  {
    id: "padel-2v2-australian",
    sport: "padel",
    format: "2v2",
    lines: [1, 1],
    label: "Australiana",
    name: "Mismo lado al saque",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["drive", "reves"],
  },
  {
    id: "padel-2v2-diagonal",
    sport: "padel",
    format: "2v2",
    lines: [1, 1],
    label: "Diagonal",
    common: true,
    featured: false,
    rarity: "mvp",
    includeGk: false,
    roles: ["reves", "drive"],
  },
];

const PADEL_4: FormationEntry[] = [
  {
    id: "padel-4v4-2-2",
    sport: "padel",
    format: "4v4",
    lines: [2, 2],
    label: "2-2",
    featured: true,
    common: true,
    rarity: "common",
    includeGk: false,
    roles: ["drive", "reves", "drive", "reves"],
  },
  {
    id: "padel-4v4-1-2-1",
    sport: "padel",
    format: "4v4",
    lines: [1, 2, 1],
    label: "1-2-1",
    rarity: "rare",
    common: false,
    featured: false,
    includeGk: false,
    roles: ["drive", "reves", "drive", "reves"],
  },
];

export const FORMATIONS_CATALOG: FormationEntry[] = [
  ...FUTBOL_5V5,
  ...FUTBOL_6V6,
  ...FUTBOL_7V7,
  ...FUTBOL_8V8,
  ...FUTBOL_11V11,
  ...FUTSAL,
  ...BASQUET_5,
  ...BASQUET_3,
  ...VOLEY_6,
  ...VOLEY_2,
  ...PADEL_2,
  ...PADEL_4,
];

const BY_ID = new Map(FORMATIONS_CATALOG.map((f) => [f.id, f]));

export function getFormationById(id: string | null | undefined): FormationEntry | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

export function formationsForSportFormat(sport: Sport, format: Format): FormationEntry[] {
  return FORMATIONS_CATALOG.filter((f) => f.sport === sport && f.format === format);
}

export function featuredFormations(sport: Sport, format: Format): FormationEntry[] {
  const all = formationsForSportFormat(sport, format);
  const featured = all.filter((f) => f.featured);
  return featured.length > 0 ? featured : all.filter((f) => f.common).slice(0, 4);
}

export function defaultFormationId(sport: Sport, format: Format): string {
  const featured = featuredFormations(sport, format);
  return featured[0]?.id ?? formationsForSportFormat(sport, format)[0]?.id ?? "";
}

export function resolveFormation(
  sport: Sport,
  format: Format,
  formationId?: string | null,
): FormationEntry {
  const byId = getFormationById(formationId);
  if (byId && byId.sport === sport && byId.format === format) return byId;
  const fallbackId = defaultFormationId(sport, format);
  const fallback = getFormationById(fallbackId);
  if (fallback) return fallback;
  // Último recurso: forma genérica
  const perSide = playersPerSideFromFormat(format);
  const includeGk = sport === "futbol" || sport === "futbol_sala";
  const of = includeGk ? perSide - 1 : perSide;
  const lines = of <= 2 ? [of] : [Math.ceil(of / 2), Math.floor(of / 2)];
  return {
    id: `${sport}-${format}-fallback`,
    sport,
    format,
    lines,
    label: linesLabel(lines),
    featured: true,
    common: true,
    rarity: "mvp",
    includeGk,
  };
}

export function formationSlotCount(entry: FormationEntry): number {
  return outfieldSum(entry.lines) + (entry.includeGk ? 1 : 0);
}

export function suggestedRoleAt(entry: FormationEntry, pitchIndex: number): Position {
  const roles = entry.roles;
  if (roles && roles[pitchIndex]) return roles[pitchIndex]!;
  return "any";
}

/** Agrupa formaciones de fútbol por formato para pitch-config / hero. */
export function soccerFormationsByFormat(): Record<
  "5v5" | "6v6" | "7v7" | "8v8" | "11v11",
  number[][]
> {
  const formats = ["5v5", "6v6", "7v7", "8v8", "11v11"] as const;
  const out = {} as Record<(typeof formats)[number], number[][]>;
  for (const format of formats) {
    out[format] = formationsForSportFormat("futbol", format).map((f) => f.lines);
  }
  return out;
}

export function catalogStats() {
  const bySport: Record<string, number> = {};
  for (const f of FORMATIONS_CATALOG) {
    const key = `${f.sport}/${f.format}`;
    bySport[key] = (bySport[key] ?? 0) + 1;
  }
  return { total: FORMATIONS_CATALOG.length, bySport };
}
