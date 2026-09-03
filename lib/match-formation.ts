import type { Format, Sport } from "@/lib/constants";
import {
  PITCH_VIEWBOX_WIDTH,
  SOCCER_FORMATIONS,
  type DotPosition,
  type PitchSetup,
} from "@/lib/pitch-config";
import { isFormat, isSport } from "@/lib/sport-rules";
import { slotIsOpen, type SlotWithClaims } from "@/lib/types";

export type FormationDotState = "filled" | "open" | "ghost" | "invite";

export type FormationDot = DotPosition & {
  state: FormationDotState;
  side: "a" | "b";
  label?: string;
  slotId?: string;
};

export type MatchFormationBoard = {
  sport: Sport;
  format: Format | null;
  label: string;
  dots: FormationDot[];
  sideAOpen: number;
  sideBOpen: number;
  hasSideB: boolean;
  playersPerSide: number;
};

const FUTSAL_DEFAULT: number[] = [1, 2, 1];
const BASKET_5: number[] = [2, 1, 2];
const BASKET_3: number[] = [1, 1, 1];
const VOLLEY_6: number[] = [3, 3];
const VOLLEY_2: number[] = [1, 1];
const PADEL_2: number[] = [2];
const PADEL_4: number[] = [2, 2];

export function playersPerSideFromFormat(format: string | null | undefined): number {
  const match = /^(\d+)v(\d+)$/i.exec(format?.trim() ?? "");
  if (!match) return 5;
  return Math.max(1, Number(match[1]));
}

function formatFormationLabel(formation: number[]): string {
  return formation.filter((n) => n > 0).join("-") || "1";
}

function pickFormation(sport: Sport, format: Format | null): { formation: number[]; includeGk: boolean } {
  if (sport === "futbol") {
    const key = (format ?? "5v5") as keyof typeof SOCCER_FORMATIONS;
    const options = SOCCER_FORMATIONS[key] ?? SOCCER_FORMATIONS["5v5"];
    return { formation: options[0]!, includeGk: true };
  }
  if (sport === "futbol_sala") {
    return { formation: FUTSAL_DEFAULT, includeGk: true };
  }
  if (sport === "basquet") {
    return {
      formation: format === "3v3" ? BASKET_3 : BASKET_5,
      includeGk: false,
    };
  }
  if (sport === "voleibol") {
    return {
      formation: format === "2v2" ? VOLLEY_2 : VOLLEY_6,
      includeGk: false,
    };
  }
  return {
    formation: format === "4v4" ? PADEL_4 : PADEL_2,
    includeGk: false,
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

type SlotMark = { state: FormationDotState; label?: string; slotId?: string };

function baseDotsForHalf(setup: PitchSetup): Omit<FormationDot, "state" | "side" | "label" | "slotId">[] {
  const { sport, formation, includeGk } = setup;
  const activeLines = formation.filter((n) => n > 0).length;
  const dots: Omit<FormationDot, "state" | "side" | "label" | "slotId">[] = [];

  if (sport === "voleibol") {
    const [front, back] = formation.length >= 2 ? formation : [3, 3];
    spreadY(front ?? 3).forEach((y) => dots.push({ x: 150, y }));
    spreadY(back ?? 3).forEach((y) => dots.push({ x: 105, y }));
    return dots;
  }

  if (sport === "padel") {
    if (formation.length >= 2) {
      formation.forEach((count, lineIndex) => {
        const x = lineIndex === 0 ? 100 : 145;
        spreadY(count, 78, 142).forEach((y) => dots.push({ x, y }));
      });
    } else {
      spreadY(formation[0] ?? 2, 78, 142).forEach((y) => dots.push({ x: 118, y }));
    }
    return dots;
  }

  const left = sport === "basquet" ? 70 : sport === "futbol_sala" ? 95 : 88;
  const right = sport === "basquet" ? 155 : sport === "futbol_sala" ? 165 : 168;
  const gkX = sport === "basquet" ? 48 : sport === "futbol_sala" ? 52 : 46;
  const lines = lineXs(Math.max(activeLines, formation.length), left, right);

  if (includeGk) {
    dots.push({ x: gkX, y: 110 });
  }
  formation.forEach((count, lineIndex) => {
    if (count <= 0) return;
    const x = lines[lineIndex] ?? lines[lines.length - 1]!;
    spreadY(count).forEach((y) => dots.push({ x, y }));
  });
  return dots;
}

function applyMarksToHalf(
  base: Omit<FormationDot, "state" | "side" | "label" | "slotId">[],
  marks: SlotMark[],
  side: "a" | "b",
  mirror: boolean,
): FormationDot[] {
  const capacity = Math.max(base.length, marks.length);
  const out: FormationDot[] = [];
  for (let i = 0; i < capacity; i += 1) {
    const point = base[i] ?? {
      x: 120,
      y: 52 + (i % 6) * 22,
    };
    const mark = marks[i];
    out.push({
      x: mirror ? mirrorX(point.x) : point.x,
      y: point.y,
      side,
      state: mark?.state ?? "ghost",
      label: mark?.label,
      slotId: mark?.slotId,
      isHole: mark?.state === "open" || mark?.state === "invite",
    });
  }
  return out;
}

function marksFromSlots(slots: SlotWithClaims[]): SlotMark[] {
  return slots.map((slot) => ({
    state: slotIsOpen(slot) ? "open" : "filled",
    label: slot.position === "any" ? undefined : slot.position,
    slotId: slot.id,
  }));
}

function marksFromCounts(openCount: number, filledHint: number, capacity: number): SlotMark[] {
  const open = Math.max(0, openCount);
  const filled = Math.max(0, Math.min(filledHint, Math.max(0, capacity - open)));
  const marks: SlotMark[] = [];
  for (let i = 0; i < filled; i += 1) marks.push({ state: "filled" });
  for (let i = 0; i < open; i += 1) marks.push({ state: "open" });
  while (marks.length < capacity) marks.push({ state: "ghost" });
  return marks;
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
}): MatchFormationBoard {
  const { sport, format } = resolveSportFormat(input.sport, input.format);
  const { formation, includeGk } = pickFormation(sport, format);
  const setup: PitchSetup = {
    sport,
    format,
    formation,
    includeGk,
    label: `${format ?? sport} · ${formatFormationLabel(formation)}`,
  };
  const base = baseDotsForHalf(setup);
  const sideA = input.slots
    .filter((slot) => slot.side !== "b")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const sideB = input.slots
    .filter((slot) => slot.side === "b")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const hasSideB = input.hasSideB ?? sideB.length > 0;
  const aMarks = marksFromSlots(sideA);
  const bMarks = hasSideB
    ? marksFromSlots(sideB)
    : Array.from({ length: Math.min(2, playersPerSideFromFormat(format)) }, () => ({
        state: "invite" as const,
      }));

  const dots = [
    ...applyMarksToHalf(base, aMarks, "a", false),
    ...applyMarksToHalf(base, bMarks, "b", true),
  ];

  return {
    sport,
    format,
    label: setup.label,
    dots,
    sideAOpen: aMarks.filter((m) => m.state === "open").length,
    sideBOpen: bMarks.filter((m) => m.state === "open" || m.state === "invite").length,
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
}): MatchFormationBoard {
  const { sport, format } = resolveSportFormat(input.sport, input.format);
  const { formation, includeGk } = pickFormation(sport, format);
  const setup: PitchSetup = {
    sport,
    format,
    formation,
    includeGk,
    label: `${format ?? sport} · ${formatFormationLabel(formation)}`,
  };
  const base = baseDotsForHalf(setup);
  const perSide = Math.max(base.length, playersPerSideFromFormat(format));
  const open = Math.max(0, input.openSlotCount);
  // Sin detalle de filled: mostramos huecos abiertos + fantasma del resto del bando.
  const aMarks = marksFromCounts(open, Math.max(0, perSide - open), perSide);
  const bMarks = input.hasSideB
    ? marksFromCounts(Math.min(2, open > 0 ? 1 : 2), 0, Math.min(2, perSide))
    : Array.from({ length: Math.min(2, perSide) }, () => ({ state: "invite" as const }));

  return {
    sport,
    format,
    label: setup.label,
    dots: [
      ...applyMarksToHalf(base, aMarks, "a", false),
      ...applyMarksToHalf(base, bMarks, "b", true),
    ],
    sideAOpen: open,
    sideBOpen: bMarks.filter((m) => m.state === "open" || m.state === "invite").length,
    hasSideB: input.hasSideB,
    playersPerSide: perSide,
  };
}
