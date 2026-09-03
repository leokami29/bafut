import type { Format, Sport } from "@/lib/constants";
import {
  formationSlotCount,
  playersPerSideFromFormat,
  resolveFormation,
  type FormationEntry,
} from "@/lib/formations-catalog";
import {
  PITCH_VIEWBOX_WIDTH,
  type DotPosition,
  type PitchSetup,
} from "@/lib/pitch-config";
import { isFormat, isSport } from "@/lib/sport-rules";
import { slotIsOpen, type SlotWithClaims } from "@/lib/types";

export { playersPerSideFromFormat };

export type FormationDotState = "filled" | "open" | "ghost" | "invite";

export type FormationDot = DotPosition & {
  state: FormationDotState;
  side: "a" | "b";
  label?: string;
  slotId?: string;
  pitchIndex?: number;
};

export type MatchFormationBoard = {
  sport: Sport;
  format: Format | null;
  label: string;
  formationId: string;
  dots: FormationDot[];
  sideAOpen: number;
  sideBOpen: number;
  hasSideB: boolean;
  playersPerSide: number;
};

function setupFromResolved(
  sport: Sport,
  format: Format | null,
  entry: FormationEntry,
): PitchSetup {
  return {
    sport,
    format,
    formation: entry.lines,
    includeGk: entry.includeGk,
    formationId: entry.id,
    label: entry.name
      ? `${format ?? sport} · ${entry.label} · ${entry.name}`
      : `${format ?? sport} · ${entry.label}`,
  };
}

function spreadY(count: number, top = 52, bottom = 168): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(top + bottom) / 2];
  const step = (bottom - top) / (count - 1);
  return Array.from({ length: count }, (_, i) => top + step * i);
}

function lineXs(count: number, left: number, right: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [(left + right) / 2];
  const step = (right - left) / (count - 1);
  return Array.from({ length: count }, (_, i) => left + step * i);
}

function mirrorX(x: number): number {
  return PITCH_VIEWBOX_WIDTH - x;
}

type SlotMark = {
  state: FormationDotState;
  label?: string;
  slotId?: string;
  pitchIndex?: number;
};

/** Coordenadas base (mitad izquierda) con índice de pitch. */
export function baseDotsForHalf(
  setup: PitchSetup,
): (Omit<FormationDot, "state" | "side" | "label" | "slotId"> & { pitchIndex: number })[] {
  const { sport, formation, includeGk } = setup;
  const activeLines = formation.filter((n) => n > 0).length;
  const dots: (Omit<FormationDot, "state" | "side" | "label" | "slotId"> & { pitchIndex: number })[] =
    [];
  let pitchIndex = 0;

  if (sport === "voleibol") {
    const [front, back] = formation.length >= 2 ? formation : [3, 3];
    spreadY(front ?? 3).forEach((y) => {
      dots.push({ x: 150, y, pitchIndex });
      pitchIndex += 1;
    });
    spreadY(back ?? 3).forEach((y) => {
      dots.push({ x: 105, y, pitchIndex });
      pitchIndex += 1;
    });
    return dots;
  }

  if (sport === "padel") {
    if (formation.length >= 2) {
      formation.forEach((count, lineIndex) => {
        const x = lineIndex === 0 ? 100 : 145;
        spreadY(count, 78, 142).forEach((y) => {
          dots.push({ x, y, pitchIndex });
          pitchIndex += 1;
        });
      });
    } else {
      spreadY(formation[0] ?? 2, 78, 142).forEach((y) => {
        dots.push({ x: 118, y, pitchIndex });
        pitchIndex += 1;
      });
    }
    return dots;
  }

  const left = sport === "basquet" ? 70 : sport === "futbol_sala" ? 95 : 88;
  const right = sport === "basquet" ? 155 : sport === "futbol_sala" ? 165 : 168;
  const gkX = sport === "basquet" ? 48 : sport === "futbol_sala" ? 52 : 46;
  const lines = lineXs(Math.max(activeLines, formation.length), left, right);

  if (includeGk) {
    dots.push({ x: gkX, y: 110, pitchIndex });
    pitchIndex += 1;
  }
  formation.forEach((count, lineIndex) => {
    if (count <= 0) return;
    const x = lines[lineIndex] ?? lines[lines.length - 1]!;
    spreadY(count).forEach((y) => {
      dots.push({ x, y, pitchIndex });
      pitchIndex += 1;
    });
  });
  return dots;
}

function applyMarksToHalf(
  base: (Omit<FormationDot, "state" | "side" | "label" | "slotId"> & { pitchIndex: number })[],
  marksByIndex: Map<number, SlotMark>,
  side: "a" | "b",
  mirror: boolean,
): FormationDot[] {
  return base.map((point) => {
    const mark = marksByIndex.get(point.pitchIndex);
    const state: FormationDotState = mark?.state ?? "ghost";
    return {
      x: mirror ? mirrorX(point.x) : point.x,
      y: point.y,
      side,
      state,
      label: mark?.label,
      slotId: mark?.slotId,
      pitchIndex: point.pitchIndex,
      isHole: state === "open" || state === "invite",
    };
  });
}

function marksMapFromSlots(
  slots: SlotWithClaims[],
  capacity: number,
): Map<number, SlotMark> {
  const map = new Map<number, SlotMark>();
  const ordered = [...slots].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let sequential = 0;
  for (const slot of ordered) {
    const raw = slot.pitch_index;
    const pitchIndex =
      typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw < capacity
        ? raw
        : sequential;
    sequential += 1;
    map.set(pitchIndex, {
      state: slotIsOpen(slot) ? "open" : "filled",
      label: slot.position === "any" ? undefined : slot.position,
      slotId: slot.id,
      pitchIndex,
    });
  }
  return map;
}

function marksMapFromCounts(openCount: number, capacity: number): Map<number, SlotMark> {
  const map = new Map<number, SlotMark>();
  const open = Math.max(0, Math.min(openCount, capacity));
  for (let i = 0; i < capacity; i += 1) {
    if (i < open) map.set(i, { state: "open", pitchIndex: i });
    else map.set(i, { state: "ghost", pitchIndex: i });
  }
  return map;
}

export function resolveSportFormat(
  sportRaw: string | null | undefined,
  formatRaw: string | null | undefined,
): { sport: Sport; format: Format | null } {
  let sport: Sport = "futbol";
  if (sportRaw && isSport(sportRaw)) sport = sportRaw;
  let format: Format | null = null;
  if (formatRaw && isFormat(formatRaw)) format = formatRaw;
  return { sport, format };
}

/** Tablero a partir de cupos reales (ficha partido). */
export function buildFormationFromSlots(input: {
  sport: string;
  format: string | null;
  slots: SlotWithClaims[];
  hasSideB?: boolean;
  formationId?: string | null;
}): MatchFormationBoard {
  const { sport, format } = resolveSportFormat(input.sport, input.format);
  const entry = resolveFormation(sport, format ?? "5v5", input.formationId);
  const setup = setupFromResolved(sport, format, entry);
  const base = baseDotsForHalf(setup);
  const capacity = Math.max(base.length, formationSlotCount(entry));

  const sideA = input.slots
    .filter((slot) => slot.side !== "b")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const sideB = input.slots
    .filter((slot) => slot.side === "b")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hasSideB = input.hasSideB ?? sideB.length > 0;

  const aMarks = marksMapFromSlots(sideA, capacity);
  const bMarks = hasSideB
    ? marksMapFromSlots(sideB, capacity)
    : new Map<number, SlotMark>(
        Array.from({ length: Math.min(2, playersPerSideFromFormat(format)) }, (_, i) => [
          i,
          { state: "invite" as const, pitchIndex: i },
        ]),
      );

  const dots = [
    ...applyMarksToHalf(base, aMarks, "a", false),
    ...applyMarksToHalf(base, bMarks, "b", true),
  ];

  return {
    sport,
    format,
    label: setup.label,
    formationId: entry.id,
    dots,
    sideAOpen: [...aMarks.values()].filter((m) => m.state === "open").length,
    sideBOpen: [...bMarks.values()].filter((m) => m.state === "open" || m.state === "invite").length,
    hasSideB,
    playersPerSide: playersPerSideFromFormat(format),
  };
}

/** Tablero resumido para banner de ocupación (sin lista de cupos). */
export function buildFormationFromOccupancy(input: {
  sport: string;
  format: string | null;
  openSlotCount: number;
  hasSideB: boolean;
  formationId?: string | null;
}): MatchFormationBoard {
  const { sport, format } = resolveSportFormat(input.sport, input.format);
  const entry = resolveFormation(sport, format ?? "5v5", input.formationId);
  const setup = setupFromResolved(sport, format, entry);
  const base = baseDotsForHalf(setup);
  const perSide = Math.max(base.length, playersPerSideFromFormat(format));
  const open = Math.max(0, input.openSlotCount);
  const aMarks = marksMapFromCounts(open, perSide);
  const bMarks = input.hasSideB
    ? marksMapFromCounts(Math.min(2, open > 0 ? 1 : 2), Math.min(2, perSide))
    : new Map<number, SlotMark>(
        Array.from({ length: Math.min(2, perSide) }, (_, i) => [
          i,
          { state: "invite" as const, pitchIndex: i },
        ]),
      );

  return {
    sport,
    format,
    label: setup.label,
    formationId: entry.id,
    dots: [
      ...applyMarksToHalf(base, aMarks, "a", false),
      ...applyMarksToHalf(base, bMarks, "b", true),
    ],
    sideAOpen: open,
    sideBOpen: [...bMarks.values()].filter((m) => m.state === "open" || m.state === "invite").length,
    hasSideB: input.hasSideB,
    playersPerSide: perSide,
  };
}

/** Preview de composición: huecos marcados por índice. */
export function buildFormationPreview(input: {
  sport: Sport;
  format: Format;
  formationId: string;
  openPitchIndexes: number[];
}): MatchFormationBoard {
  const entry = resolveFormation(input.sport, input.format, input.formationId);
  const setup = setupFromResolved(input.sport, input.format, entry);
  const base = baseDotsForHalf(setup);
  const openSet = new Set(input.openPitchIndexes);
  const aMarks = new Map<number, SlotMark>();
  base.forEach((dot) => {
    aMarks.set(dot.pitchIndex, {
      state: openSet.has(dot.pitchIndex) ? "open" : "ghost",
      pitchIndex: dot.pitchIndex,
    });
  });

  return {
    sport: input.sport,
    format: input.format,
    label: setup.label,
    formationId: entry.id,
    dots: applyMarksToHalf(base, aMarks, "a", false),
    sideAOpen: openSet.size,
    sideBOpen: 0,
    hasSideB: false,
    playersPerSide: playersPerSideFromFormat(input.format),
  };
}
