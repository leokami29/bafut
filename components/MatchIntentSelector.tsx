"use client";

import React, { useId, useRef } from "react";
import {
  ROTATION_RULES,
  LEVELS,
  type Level,
  type Format,
  type Sport,
} from "@/lib/constants";
import { levelLabel } from "@/lib/labels";
import { playersPerSideFromFormat } from "@/lib/formations-catalog";
import type {
  MatchCreationIntent,
  ChallengeModeType,
} from "@/lib/match-intent-payload";

export interface MatchIntentSelectorProps {
  sport: Sport | string;
  format: Format | string;
  selectedIntent: MatchCreationIntent;
  onIntentChange: (intent: MatchCreationIntent) => void;
  benchCount: number;
  onBenchCountChange: (count: number) => void;
  rotationRule: string;
  onRotationRuleChange: (rule: string) => void;
  hostTeamName: string;
  onHostTeamNameChange: (name: string) => void;
  challengeModeType: ChallengeModeType;
  onChallengeModeTypeChange: (mode: ChallengeModeType) => void;
  challengeTargetLevel: Level;
  onChallengeTargetLevelChange: (level: Level) => void;
  openStarterCount?: number;
  onOpenStarterCountChange?: (count: number) => void;
  pitchSlotsCount?: number;
  readOnly?: boolean;
}

// ----------------------------------------------------------------------------
// Pure SVG Vector Icons (No emojis, WCAG 2.2 AA compliant)
// ----------------------------------------------------------------------------

function IconStarterSlots({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      width="24"
      height="24"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconBenchOnly({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      width="24"
      height="24"
    >
      <path d="M7 10v12" />
      <path d="M17 10v12" />
      <path d="M3 14h18" />
      <path d="M3 10h18" />
      <path d="M5 6l3-3 3 3" />
      <path d="M19 6l-3-3-3 3" />
    </svg>
  );
}

function IconChallenge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      width="24"
      height="24"
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6 2 2-6-4.5-4.5" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
      <path d="M11 5L5 3 3 9l4.5 4.5" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// MatchIntentSelector Component
// ----------------------------------------------------------------------------

export function MatchIntentSelector({
  sport,
  format,
  selectedIntent,
  onIntentChange,
  benchCount,
  onBenchCountChange,
  rotationRule,
  onRotationRuleChange,
  hostTeamName,
  onHostTeamNameChange,
  challengeModeType,
  onChallengeModeTypeChange,
  challengeTargetLevel,
  onChallengeTargetLevelChange,
  openStarterCount = 2,
  onOpenStarterCountChange,
  pitchSlotsCount = 0,
  readOnly = false,
}: MatchIntentSelectorProps) {
  const uid = useId();
  const cardRefs = {
    starter_slots: useRef<HTMLDivElement>(null),
    bench_only: useRef<HTMLDivElement>(null),
    challenge: useRef<HTMLDivElement>(null),
  };

  const playersPerSide = playersPerSideFromFormat(format);

  const intents: Array<{
    id: MatchCreationIntent;
    title: string;
    badge: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: "starter_slots",
      title: "Completar Titulares",
      badge: "Equipo A",
      description: "Faltan 1 o más jugadores en cancha para completar la formación.",
      icon: <IconStarterSlots className="intent-card-icon" />,
    },
    {
      id: "bench_only",
      title: "Solo Banca / Rotación",
      badge: "Suplentes",
      description: "Los titulares están listos. Buscamos suplentes con pacto de rotación.",
      icon: <IconBenchOnly className="intent-card-icon" />,
    },
    {
      id: "challenge",
      title: "Buscar Equipo Rival",
      badge: "Reto",
      description: `Tu equipo (${playersPerSide}) está listo. Buscamos rival (${playersPerSide}) para jugar.`,
      icon: <IconChallenge className="intent-card-icon" />,
    },
  ];

  // Roving tabindex keyboard navigation (ArrowLeft / ArrowRight / ArrowUp / ArrowDown)
  function handleKeyDown(
    e: React.KeyboardEvent<HTMLDivElement>,
    currentIndex: number,
  ) {
    if (readOnly) return;
    const order: MatchCreationIntent[] = [
      "starter_slots",
      "bench_only",
      "challenge",
    ];
    let nextIndex = -1;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % order.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + order.length) % order.length;
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      onIntentChange(order[currentIndex]);
      return;
    }

    if (nextIndex >= 0) {
      const nextIntent = order[nextIndex];
      onIntentChange(nextIntent);
      cardRefs[nextIntent].current?.focus();
    }
  }

  return (
    <div className="match-intent-selector">
      <div className="match-intent-header">
        <p className="match-compose-field-label" id={`${uid}-legend`}>
          ¿Qué necesitas para armar este partido?
        </p>
        <span className="sr-only" aria-live="polite">
          {selectedIntent === "starter_slots"
            ? "Modo seleccionado: Completar titulares de mi equipo."
            : selectedIntent === "bench_only"
            ? "Modo seleccionado: Solo banca y suplentes para rotación."
            : `Modo seleccionado: Reto a equipo rival. Se abrirán ${playersPerSide} cupos para rivales.`}
        </span>
      </div>

      {/* 1. Accessible Intent Cards Grid */}
      <div
        className="intent-cards-grid"
        role="radiogroup"
        aria-labelledby={`${uid}-legend`}
      >
        {intents.map((item, index) => {
          const isSelected = selectedIntent === item.id;
          return (
            <div
              key={item.id}
              ref={cardRefs[item.id]}
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`intent-card ${isSelected ? "is-selected" : ""}`}
              onClick={() => {
                if (!readOnly) onIntentChange(item.id);
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <div className="intent-card-top">
                <div className="intent-card-icon-wrap">{item.icon}</div>
                <span className="intent-card-badge">{item.badge}</span>
              </div>
              <p className="intent-card-title">{item.title}</p>
              <p className="intent-card-desc">{item.description}</p>
              <div className="intent-card-indicator" aria-hidden="true">
                <span className="intent-card-radio-circle" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 2. Sub-controls for Selected Intent */}
      <div className="intent-subcontrols-panel" aria-live="polite">
        {/* INTENT 1: STARTER SLOTS */}
        {selectedIntent === "starter_slots" && (
          <div className="intent-sub-section is-starter-slots">
            <div className="intent-starter-meta">
              <p className="intent-sub-label">
                Cupos titulares que faltan en tu equipo
              </p>
              <p className="intent-sub-help">
                {pitchSlotsCount > 0
                  ? `Estás usando ${pitchSlotsCount} hueco(s) marcados directamente en la cancha interactiva.`
                  : "Elige cuántos jugadores necesitas o tócalos en la cancha táctica:"}
              </p>

              {pitchSlotsCount === 0 && onOpenStarterCountChange && (
                <div className="intent-chips-row">
                  {[1, 2, 3, 4, 5, Math.min(6, playersPerSide)].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`chip-btn ${openStarterCount === n ? "is-on" : ""}`}
                      aria-pressed={openStarterCount === n}
                      onClick={() => onOpenStarterCountChange(n)}
                    >
                      {n} {n === 1 ? "cupo" : "cupos"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Optional bench toggle for starters */}
            <div className="intent-bench-accordion">
              <p className="intent-sub-label">Suplentes para rotar (opcional)</p>
              <div className="intent-chips-row">
                {[0, 1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`chip-btn ${benchCount === n ? "is-on" : ""}`}
                    aria-pressed={benchCount === n}
                    onClick={() => onBenchCountChange(n)}
                  >
                    {n === 0 ? "Sin banca" : `${n} banca`}
                  </button>
                ))}
              </div>
              {benchCount > 0 && (
                <div className="intent-rotation-wrap">
                  <label
                    htmlFor={`${uid}-starter-rot`}
                    className="intent-sub-label"
                  >
                    Pacto de rotación
                  </label>
                  <select
                    id={`${uid}-starter-rot`}
                    value={rotationRule}
                    onChange={(e) => onRotationRuleChange(e.target.value)}
                    className="intent-select"
                  >
                    {ROTATION_RULES.map((rule) => (
                      <option key={rule} value={rule}>
                        {rule}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTENT 2: BENCH ONLY */}
        {selectedIntent === "bench_only" && (
          <div className="intent-sub-section is-bench-only">
            <div className="intent-notice-box">
              <p className="intent-notice-text">
                <strong>Titulares completos:</strong> Tu alineación principal
                ya está armada por fuera. La app solo publicará cupos para
                jugadores de recambio con pacto de rotación claro.
              </p>
            </div>

            <div className="intent-bench-counter">
              <p className="intent-sub-label">
                ¿Cuántos suplentes necesitan? <span className="req-mark">*</span>
              </p>
              <div className="intent-chips-row">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`chip-btn ${benchCount === n ? "is-on" : ""}`}
                    aria-pressed={benchCount === n}
                    onClick={() => onBenchCountChange(n)}
                  >
                    {n} {n === 1 ? "suplente" : "suplentes"}
                  </button>
                ))}
              </div>
            </div>

            <div className="intent-rotation-wrap">
              <label htmlFor={`${uid}-bench-rot`} className="intent-sub-label">
                Pacto de rotación obligatorio <span className="req-mark">*</span>
              </label>
              <select
                id={`${uid}-bench-rot`}
                value={rotationRule}
                onChange={(e) => onRotationRuleChange(e.target.value)}
                className="intent-select"
              >
                {ROTATION_RULES.map((rule) => (
                  <option key={rule} value={rule}>
                    {rule}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* INTENT 3: CHALLENGE */}
        {selectedIntent === "challenge" && (
          <div className="intent-sub-section is-challenge">
            <div className="intent-challenge-banner">
              <p className="intent-challenge-badge">Enfrentamiento</p>
              <p className="intent-challenge-info">
                Tu equipo ({playersPerSide} titulares) está listo. Se abrirán{" "}
                <strong>{playersPerSide} cupos en el Equipo Rival</strong> para
                que la comunidad acepte el reto.
              </p>
            </div>

            <div className="form-split">
              <label htmlFor={`${uid}-team-name`}>
                Nombre de tu equipo (opcional)
                <input
                  id={`${uid}-team-name`}
                  type="text"
                  maxLength={60}
                  placeholder="Ej: Los Galácticos"
                  value={hostTeamName}
                  onChange={(e) => onHostTeamNameChange(e.target.value)}
                />
              </label>

              <label htmlFor={`${uid}-target-level`}>
                Nivel esperado del rival
                <select
                  id={`${uid}-target-level`}
                  value={challengeTargetLevel}
                  onChange={(e) =>
                    onChallengeTargetLevelChange(e.target.value as Level)
                  }
                >
                  {LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {levelLabel[lvl]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="intent-challenge-mode-toggle">
              <p className="intent-sub-label">Modalidad para completar el rival</p>
              <div className="intent-chips-row" role="group">
                <button
                  type="button"
                  className={`chip-btn ${challengeModeType === "full_team" ? "is-on" : ""}`}
                  aria-pressed={challengeModeType === "full_team"}
                  onClick={() => onChallengeModeTypeChange("full_team")}
                >
                  Reto a equipo completo (capitán rival)
                </button>
                <button
                  type="button"
                  className={`chip-btn ${challengeModeType === "open_slots" ? "is-on" : ""}`}
                  aria-pressed={challengeModeType === "open_slots"}
                  onClick={() => onChallengeModeTypeChange("open_slots")}
                >
                  Rivales libres (jugadores individuales)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scoped CSS Styles for MatchIntentSelector */}
      <style>{`
        .match-intent-selector {
          display: grid;
          gap: 0.85rem;
          margin-bottom: 1.25rem;
        }
        .match-intent-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .intent-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 0.75rem;
        }
        .intent-card {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 1rem;
          border-radius: 6px;
          border: 2px solid color-mix(in oklab, var(--turf, #0c6b4c) 25%, transparent);
          background: var(--paper, #dff3e6);
          color: var(--ink, #10231c);
          cursor: pointer;
          transition: all 0.18s ease;
          outline: none;
          min-height: 120px;
        }
        .intent-card:hover {
          border-color: var(--turf, #0c6b4c);
          transform: translateY(-1px);
        }
        .intent-card:focus-visible {
          outline: 2.5px solid var(--flood, #ffd25a);
          outline-offset: 2px;
          border-color: var(--turf, #0c6b4c);
        }
        .intent-card.is-selected {
          border-color: var(--turf, #0c6b4c);
          background: color-mix(in oklab, var(--turf, #0c6b4c) 8%, var(--paper, #dff3e6));
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
        }
        .intent-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .intent-card-icon-wrap {
          color: var(--turf, #0c6b4c);
          display: flex;
          align-items: center;
        }
        .intent-card.is-selected .intent-card-icon-wrap {
          color: var(--turf-deep, #073828);
        }
        .intent-card-badge {
          font-family: var(--font-mono, monospace);
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0.15rem 0.45rem;
          background: color-mix(in oklab, var(--turf, #0c6b4c) 15%, transparent);
          border-radius: 3px;
          color: var(--turf-deep, #073828);
        }
        .intent-card-title {
          font-size: 0.98rem;
          font-weight: 700;
          margin: 0 0 0.25rem;
          color: var(--ink, #10231c);
        }
        .intent-card-desc {
          font-size: 0.8rem;
          line-height: 1.35;
          margin: 0;
          color: color-mix(in oklab, var(--ink, #10231c) 75%, transparent);
          flex-grow: 1;
        }
        .intent-card-indicator {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.5rem;
        }
        .intent-card-radio-circle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid color-mix(in oklab, var(--turf, #0c6b4c) 40%, transparent);
          transition: all 0.15s ease;
        }
        .intent-card.is-selected .intent-card-radio-circle {
          border-color: var(--turf, #0c6b4c);
          background: var(--turf, #0c6b4c);
          box-shadow: inset 0 0 0 2px var(--paper, #dff3e6);
        }
        .intent-subcontrols-panel {
          padding: 1rem;
          background: color-mix(in oklab, var(--turf, #0c6b4c) 5%, var(--paper, #dff3e6));
          border-left: 3px solid var(--turf, #0c6b4c);
          border-radius: 0 4px 4px 0;
          display: grid;
          gap: 0.85rem;
        }
        .intent-sub-label {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0 0 0.35rem;
          color: var(--ink, #10231c);
        }
        .intent-sub-help {
          font-size: 0.8rem;
          margin: 0 0 0.5rem;
          color: color-mix(in oklab, var(--ink, #10231c) 75%, transparent);
        }
        .intent-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .chip-btn {
          padding: 0.35rem 0.75rem;
          min-height: 38px;
          font-size: 0.85rem;
          border-radius: 4px;
          border: 1px solid color-mix(in oklab, var(--turf, #0c6b4c) 30%, transparent);
          background: var(--paper, #dff3e6);
          color: var(--ink, #10231c);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .chip-btn:hover {
          border-color: var(--turf, #0c6b4c);
        }
        .chip-btn.is-on {
          background: var(--turf, #0c6b4c);
          color: #fff;
          font-weight: 650;
          border-color: var(--turf, #0c6b4c);
        }
        .intent-select {
          width: 100%;
          max-width: 400px;
          padding: 0.5rem;
          font-size: 0.88rem;
          border-radius: 4px;
          border: 1px solid color-mix(in oklab, var(--turf, #0c6b4c) 35%, transparent);
          background: var(--paper, #dff3e6);
          color: var(--ink, #10231c);
        }
        .intent-notice-box {
          padding: 0.75rem 0.85rem;
          background: color-mix(in oklab, var(--flood, #ffd25a) 15%, var(--paper, #dff3e6));
          border: 1px solid color-mix(in oklab, var(--flood, #ffd25a) 40%, transparent);
          border-radius: 4px;
        }
        .intent-notice-text {
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
          color: var(--ink, #10231c);
        }
        .intent-challenge-banner {
          padding: 0.75rem 0.85rem;
          background: color-mix(in oklab, var(--turf, #0c6b4c) 12%, var(--paper, #dff3e6));
          border-radius: 4px;
        }
        .intent-challenge-badge {
          font-family: var(--font-mono, monospace);
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--turf-deep, #073828);
          margin: 0 0 0.25rem;
        }
        .intent-challenge-info {
          font-size: 0.85rem;
          margin: 0;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}

export default MatchIntentSelector;
