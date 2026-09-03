import { SPORTS, type Format, type Sport } from "@/lib/constants";
import {
  formationsForSportFormat,
  soccerFormationsByFormat,
  type FormationEntry,
} from "@/lib/formations-catalog";
import {
  BASQUET_SLOT_ROLES,
  getHeroHeadline,
  type HeroMissingRole,
  type HeroRoleBySport,
} from "@/lib/hero-copy";
import { formatsForSport } from "@/lib/sport-rules";

export type DotPosition = { x: number; y: number; isHole?: boolean };

export type PitchSetup = {
  sport: Sport;
  format: Format | null;
  formation: number[];
  label: string;
  includeGk: boolean;
  formationId?: string;
};

/** Ancho del viewBox SVG — usado para espejar formación al lado derecho. */
export const PITCH_VIEWBOX_WIDTH = 360;

type SoccerFormat = "5v5" | "6v6" | "7v7" | "8v8" | "11v11";

/** Formaciones realistas por formato (líneas de campo sin arquero). */
export const SOCCER_FORMATIONS: Record<SoccerFormat, number[][]> = soccerFormationsByFormat();

function linesFromCatalog(sport: Sport, format: Format | null): number[][] {
  if (!format) return [[2, 1, 2]];
  return formationsForSportFormat(sport, format).map((f) => f.lines);
}

const FUTSAL_FORMATIONS: number[][] = linesFromCatalog("futbol_sala", "5v5");
const BASKET_FORMATIONS: number[][] = linesFromCatalog("basquet", "5v5");
const VOLLEY_FORMATIONS: number[][] = linesFromCatalog("voleibol", "6v6");
const PADEL_FORMATIONS: number[][] = linesFromCatalog("padel", "2v2");

export function pitchSetupFromEntry(entry: FormationEntry): PitchSetup {
  return {
    sport: entry.sport,
    format: entry.format,
    formation: entry.lines,
    label: entry.name ? `${entry.label} · ${entry.name}` : entry.label,
    includeGk: entry.includeGk,
    formationId: entry.id,
  };
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function formatFormationLabel(formation: number[]): string {
  return formation.filter((n) => n > 0).join("-") || "1";
}

function spreadY(count: number, top = 62, bottom = 158): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(top + bottom) / 2];
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => top + step * i);
}

/** Distribuye ejes X de líneas de campo entre left y right (mitad izquierda del SVG). */
function lineXs(count: number, left: number, right: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(left + right) / 2];
  const step = (right - left) / (count - 1);
  return Array.from({ length: count }, (_, i) => left + step * i);
}

/** Espeja coordenadas X para mostrar la formación en la mitad derecha de la cancha. */
function mirrorToRightHalf(dots: DotPosition[]): DotPosition[] {
  return dots.map((dot) => ({
    ...dot,
    x: PITCH_VIEWBOX_WIDTH - dot.x,
  }));
}

export type SlotRef = { kind: "gk" | "line"; lineIndex?: number; playerIndex?: number };

function buildSlots(formation: number[], includeGk: boolean): SlotRef[] {
  const slots: SlotRef[] = [];
  if (includeGk) slots.push({ kind: "gk" });
  formation.forEach((count, lineIndex) => {
    for (let playerIndex = 0; playerIndex < count; playerIndex += 1) {
      slots.push({ kind: "line", lineIndex, playerIndex });
    }
  });
  return slots;
}

function slotMatches(a: SlotRef, b: SlotRef): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "gk") return true;
  return a.lineIndex === b.lineIndex && a.playerIndex === b.playerIndex;
}

type ActiveLine = { count: number; lineIndex: number };

function activeLineIndices(formation: number[]): ActiveLine[] {
  return formation
    .map((count, lineIndex) => ({ count, lineIndex }))
    .filter((line) => line.count > 0);
}

function linePositionInFormation(formation: number[], lineIndex: number): number {
  return activeLineIndices(formation).findIndex((l) => l.lineIndex === lineIndex);
}

/** Mapea un slot táctico al rol faltante que alimenta el headline. */
export function getMissingRoleForSlot<S extends Sport>(
  setup: PitchSetup & { sport: S },
  slot: SlotRef,
): HeroRoleBySport[S] {
  const { sport, formation, includeGk } = setup;

  if (sport === "futbol") {
    if (slot.kind === "gk") return "arquero" as HeroRoleBySport[S];
    const pos = linePositionInFormation(formation, slot.lineIndex!);
    const total = activeLineIndices(formation).length;
    if (pos === 0) return "lateral" as HeroRoleBySport[S];
    if (pos === total - 1) return "delantero" as HeroRoleBySport[S];
    return "medio" as HeroRoleBySport[S];
  }

  if (sport === "futbol_sala") {
    if (slot.kind === "gk") return "arquero" as HeroRoleBySport[S];
    const pos = linePositionInFormation(formation, slot.lineIndex!);
    const total = activeLineIndices(formation).length;
    if (pos === 0) return "cierre" as HeroRoleBySport[S];
    if (pos === total - 1) return "pivot" as HeroRoleBySport[S];
    return "ala" as HeroRoleBySport[S];
  }

  if (sport === "basquet") {
    const slots = buildSlots(formation, false);
    const idx = slots.findIndex((s) => slotMatches(s, slot));
    return (BASQUET_SLOT_ROLES[idx] ?? "base") as HeroRoleBySport[S];
  }

  if (sport === "voleibol") {
    const lineIndex = slot.lineIndex ?? 0;
    const playerIndex = slot.playerIndex ?? 0;
    const roleMap: VoleibolSlotRole[][] = [
      ["receptor", "central", "opuesto"],
      ["armador", "libero", "central"],
    ];
    return (roleMap[lineIndex]?.[playerIndex] ?? "central") as HeroRoleBySport[S];
  }

  const slots = buildSlots(formation, includeGk);
  const idx = slots.findIndex((s) => slotMatches(s, slot));
  return (idx === 0 ? "pareja" : "companero") as HeroRoleBySport[S];
}

type VoleibolSlotRole = "armador" | "central" | "opuesto" | "receptor" | "libero";

function getLinePositions(
  formation: number[],
  includeGk: boolean,
  hole: SlotRef,
  lineX: { gk: number; lines: number[] },
): DotPosition[] {
  const dots: DotPosition[] = [];

  if (includeGk) {
    dots.push({ x: lineX.gk, y: 110, isHole: slotMatches(hole, { kind: "gk" }) });
  }

  formation.forEach((count, lineIndex) => {
    if (count <= 0) return;
    const x = lineX.lines[lineIndex] ?? lineX.lines[lineX.lines.length - 1]!;
    spreadY(count).forEach((y, playerIndex) => {
      dots.push({
        x,
        y,
        isHole: slotMatches(hole, { kind: "line", lineIndex, playerIndex }),
      });
    });
  });

  return dots;
}

export function getDotPositions(setup: PitchSetup, hole: SlotRef): DotPosition[] {
  const { sport, formation, includeGk } = setup;
  const activeLines = formation.filter((n) => n > 0).length;
  let dots: DotPosition[];

  if (sport === "voleibol") {
    const frontX = 158;
    const backX = 98;
    dots = [];
    const [front, back] = formation.length >= 2 ? formation : [3, 3];

    spreadY(front ?? 3, 52, 168).forEach((y, i) => {
      dots.push({
        x: frontX,
        y,
        isHole: slotMatches(hole, { kind: "line", lineIndex: 0, playerIndex: i }),
      });
    });
    spreadY(back ?? 3, 52, 168).forEach((y, i) => {
      dots.push({
        x: backX,
        y,
        isHole: slotMatches(hole, { kind: "line", lineIndex: 1, playerIndex: i }),
      });
    });
  } else if (sport === "padel") {
    if (formation.length >= 2) {
      dots = formation.flatMap((count, lineIndex) => {
        const x = lineIndex === 0 ? 100 : 145;
        return spreadY(count, 78, 142).map((y, playerIndex) => ({
          x,
          y,
          isHole: slotMatches(hole, { kind: "line", lineIndex, playerIndex }),
        }));
      });
    } else {
      const count = formation[0] ?? 2;
      dots = spreadY(count, 78, 142).map((y, i) => ({
        x: 118,
        y,
        isHole: slotMatches(hole, { kind: "line", lineIndex: 0, playerIndex: i }),
      }));
    }
  } else if (sport === "basquet") {
    dots = getLinePositions(formation, false, hole, {
      gk: 48,
      lines: lineXs(Math.max(activeLines, formation.length), 70, 155),
    });
  } else if (sport === "futbol_sala") {
    dots = getLinePositions(formation, includeGk, hole, {
      gk: 52,
      lines: lineXs(Math.max(activeLines, formation.length), 95, 165),
    });
  } else {
    dots = getLinePositions(formation, includeGk, hole, {
      gk: 46,
      lines: lineXs(Math.max(activeLines, formation.length), 88, 168),
    });
  }

  return mirrorToRightHalf(dots);
}

export function pickRandomPitchSetup(): PitchSetup {
  const sport = pickRandom(SPORTS);

  if (sport === "futbol") {
    const format = pickRandom(formatsForSport("futbol")) as SoccerFormat;
    const formation = pickRandom(SOCCER_FORMATIONS[format]);
    return {
      sport,
      format,
      formation,
      label: `${format} · ${formatFormationLabel(formation)}`,
      includeGk: true,
    };
  }

  if (sport === "futbol_sala") {
    const formation = pickRandom(FUTSAL_FORMATIONS);
    return {
      sport,
      format: "5v5",
      formation,
      label: `Futsal · ${formatFormationLabel(formation)}`,
      includeGk: true,
    };
  }

  if (sport === "basquet") {
    const formation = pickRandom(BASKET_FORMATIONS);
    return {
      sport,
      format: null,
      formation,
      label: `Básquet · ${formatFormationLabel(formation)}`,
      includeGk: false,
    };
  }

  if (sport === "voleibol") {
    const formation = pickRandom(VOLLEY_FORMATIONS);
    return {
      sport,
      format: null,
      formation,
      label: "Voleibol · 3-3",
      includeGk: false,
    };
  }

  const formation = pickRandom(PADEL_FORMATIONS);
  return {
    sport,
    format: null,
    formation,
    label: `Pádel · ${formatFormationLabel(formation)}`,
    includeGk: false,
  };
}

export function pickRandomHole(setup: PitchSetup): SlotRef {
  const slots = buildSlots(setup.formation, setup.includeGk);
  return pickRandom(slots);
}

export type HeroTick = {
  setup: PitchSetup;
  hole: SlotRef;
  missingRole: HeroMissingRole;
  dots: DotPosition[];
};

/** Un tick de rotación coherente: deporte, formación, hueco, rol y puntos en cancha. */
export function pickRandomHeroTick(excludeHeadline?: string): HeroTick {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const setup = pickRandomPitchSetup();
    const hole = pickRandomHole(setup);
    const missingRole = getMissingRoleForSlot(setup, hole);
    const dots = getDotPositions(setup, hole);
    if (!excludeHeadline) {
      return { setup, hole, missingRole, dots };
    }
    const headline = getHeroHeadline(
      setup.sport,
      missingRole as HeroRoleBySport[typeof setup.sport],
    );
    if (headline !== excludeHeadline) {
      return { setup, hole, missingRole, dots };
    }
  }

  const setup = pickRandomPitchSetup();
  const hole = pickRandomHole(setup);
  return {
    setup,
    hole,
    missingRole: getMissingRoleForSlot(setup, hole),
    dots: getDotPositions(setup, hole),
  };
}
