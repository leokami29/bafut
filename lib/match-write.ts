import { GENDERS, LEVELS, type Level, type Position } from "@/lib/constants";
import { isPosition, positionAllowedForSport, type Sport } from "@/lib/sport-rules";

export type SlotWrite = {
  id: string | null;
  position: Position;
  level: Level;
};

export function parseSlotsJson(raw: string, sport: Sport): { error: string } | { slots: SlotWrite[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Los cupos no son válidos." };
  }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 12) {
    return { error: "Los cupos deben ser un número entero entre 1 y 12." };
  }

  const slots: SlotWrite[] = [];
  const seen = new Set<string>();

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return { error: "Cupo inválido." };
    }
    const rec = item as Record<string, unknown>;
    const idRaw = rec.id;
    let id: string | null = null;
    if (typeof idRaw === "string" && idRaw.trim()) {
      if (!isUuid(idRaw.trim())) {
        return { error: "Cupo inválido." };
      }
      id = idRaw.trim();
      if (seen.has(id)) {
        return { error: "Cupos duplicados." };
      }
      seen.add(id);
    }

    const positionRaw = typeof rec.position === "string" ? rec.position : "any";
    if (!isPosition(positionRaw) || !positionAllowedForSport(sport, positionRaw)) {
      return { error: "Esa posición no aplica para el deporte." };
    }
    const levelRaw = typeof rec.level === "string" ? rec.level : "any";
    if (!(LEVELS as readonly string[]).includes(levelRaw)) {
      return { error: "Nivel no válido." };
    }

    slots.push({
      id,
      position: positionRaw,
      level: levelRaw as Level,
    });
  }

  return { slots };
}

export function parseCostPerPerson(raw: string): number | null | { error: string } {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  const value = Number(digits);
  if (!Number.isInteger(value) || value < 0 || value > 99_999_999) {
    return { error: "El precio no es válido." };
  }
  return value;
}

export function isGenderPolicy(value: string): value is (typeof GENDERS)[number] {
  return (GENDERS as readonly string[]).includes(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
