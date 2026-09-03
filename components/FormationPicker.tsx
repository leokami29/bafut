"use client";

import { useId, useMemo, useState } from "react";
import {
  featuredFormations,
  formationsForSportFormat,
  suggestedRoleAt,
  type FormationEntry,
} from "@/lib/formations-catalog";
import { buildFormationPreview } from "@/lib/match-formation";
import { positionLabel } from "@/lib/labels";
import type { Format, Position, Sport } from "@/lib/sport-rules";
import type { FormationDot } from "@/lib/match-formation";

export type PitchOpenSlot = {
  pitchIndex: number;
  position: Position;
};

export function FormationPicker({
  sport,
  format,
  formationId,
  onFormationIdChange,
  openSlots,
  onOpenSlotsChange,
  levelDefault = "any",
  interactive = true,
}: {
  sport: Sport;
  format: Format;
  formationId: string;
  onFormationIdChange: (id: string) => void;
  openSlots: PitchOpenSlot[];
  onOpenSlotsChange: (slots: PitchOpenSlot[]) => void;
  levelDefault?: string;
  interactive?: boolean;
}) {
  const uid = useId();
  const [showAll, setShowAll] = useState(false);
  const all = useMemo(() => formationsForSportFormat(sport, format), [sport, format]);
  const featured = useMemo(() => featuredFormations(sport, format), [sport, format]);
  const visible = showAll ? all : featured;
  const entry = all.find((f) => f.id === formationId) ?? featured[0] ?? all[0];
  const board = useMemo(
    () =>
      entry
        ? buildFormationPreview({
            sport,
            format,
            formationId: entry.id,
            openPitchIndexes: openSlots.map((s) => s.pitchIndex),
          })
        : null,
    [sport, format, entry, openSlots],
  );

  function selectFormation(next: FormationEntry) {
    onFormationIdChange(next.id);
    onOpenSlotsChange([]);
  }

  function toggleHole(dot: FormationDot) {
    if (dot.pitchIndex == null || !entry) return;
    const idx = dot.pitchIndex;
    const existing = openSlots.find((s) => s.pitchIndex === idx);
    if (existing) {
      onOpenSlotsChange(openSlots.filter((s) => s.pitchIndex !== idx));
      return;
    }
    if (openSlots.length >= 12) return;
    onOpenSlotsChange([
      ...openSlots,
      { pitchIndex: idx, position: suggestedRoleAt(entry, idx) },
    ]);
  }

  function updateSlotRole(pitchIndex: number, position: Position) {
    onOpenSlotsChange(
      openSlots.map((s) => (s.pitchIndex === pitchIndex ? { ...s, position } : s)),
    );
  }

  if (!entry || !board) return null;

  const positions = entry.roles
    ? Array.from(new Set(["any", ...entry.roles]))
    : (["any"] as Position[]);

  return (
    <div className="formation-picker">
      <p className="match-compose-field-label" id={`${uid}-formation`}>
        Formación
      </p>
      <p className="field-help">
        {interactive
          ? "Elegí el dibujo. Después tocá huecos en la cancha (o usá “N cupos cualquiera” abajo)."
          : "Elegí el dibujo táctico del partido."}
      </p>
      <div className="filter-chips match-compose-chips" role="group" aria-labelledby={`${uid}-formation`}>
        {visible.map((item) => (
          <button
            key={item.id}
            type="button"
            className={formationId === item.id ? "is-on" : undefined}
            aria-pressed={formationId === item.id}
            onClick={() => selectFormation(item)}
            title={item.name ?? item.label}
          >
            {item.label}
          </button>
        ))}
        {all.length > featured.length ? (
          <button type="button" className="is-ghost-chip" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Ver menos" : `Ver más (${all.length - featured.length})`}
          </button>
        ) : null}
      </div>

      <div className="formation-preview">
        <p className="formation-preview-label">
          {entry.label}
          {entry.name ? ` · ${entry.name}` : ""}
        </p>
        <svg
          className="formation-preview-svg"
          viewBox="0 0 360 220"
          role="img"
          aria-label={`Cancha ${entry.label}. Tocá una posición para marcar hueco.`}
        >
          <rect width="360" height="220" fill="#0c6b4c" />
          <g fill="none" stroke="#d9f2a5" strokeWidth="1.4" opacity="0.85">
            <rect x="40" y="28" width="140" height="164" />
            <line x1="180" y1="28" x2="180" y2="192" />
          </g>
          {board.dots
            .filter((d) => d.side === "a")
            .map((dot) => {
              const open = openSlots.some((s) => s.pitchIndex === dot.pitchIndex);
              return (
                <g key={`p-${dot.pitchIndex}`}>
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={open ? 11 : 8}
                    className={open ? "formation-hole is-open" : "formation-hole"}
                    role={interactive ? "button" : undefined}
                    tabIndex={interactive ? 0 : undefined}
                    onClick={interactive ? () => toggleHole(dot) : undefined}
                    onKeyDown={
                      interactive
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleHole(dot);
                            }
                          }
                        : undefined
                    }
                    style={{ cursor: interactive ? "pointer" : "default" }}
                  />
                  {open ? (
                    <text
                      x={dot.x}
                      y={dot.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="formation-hole-mark"
                      pointerEvents="none"
                    >
                      ?
                    </text>
                  ) : null}
                </g>
              );
            })}
        </svg>
        <p className="field-help">
          {!interactive
            ? "La formación se guarda al editar el partido."
            : openSlots.length > 0
              ? `${openSlots.length} hueco${openSlots.length === 1 ? "" : "s"} marcado${openSlots.length === 1 ? "" : "s"} en la cancha.`
              : "Sin huecos marcados: se usan los cupos rápidos de abajo."}
        </p>
      </div>

      {openSlots.length > 0 ? (
        <ul className="formation-open-list">
          {openSlots
            .slice()
            .sort((a, b) => a.pitchIndex - b.pitchIndex)
            .map((slot) => (
              <li key={slot.pitchIndex} className="formation-open-row">
                <span>Hueco #{slot.pitchIndex + 1}</span>
                <label>
                  Rol
                  <select
                    value={slot.position}
                    onChange={(e) => updateSlotRole(slot.pitchIndex, e.target.value as Position)}
                  >
                    {positions.map((pos) => (
                      <option key={pos} value={pos}>
                        {positionLabel[pos as keyof typeof positionLabel] ?? pos}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
        </ul>
      ) : null}

      <input type="hidden" name="formation_id" value={formationId} />
      <input
        type="hidden"
        name="pitch_slots_json"
        value={
          openSlots.length > 0
            ? JSON.stringify(
                openSlots.map((s) => ({
                  pitch_index: s.pitchIndex,
                  position: s.position,
                  level: levelDefault,
                })),
              )
            : ""
        }
      />
    </div>
  );
}
