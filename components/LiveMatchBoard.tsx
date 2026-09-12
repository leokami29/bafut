"use client";

import React, { useId } from "react";
import {
  defaultFormatForSport,
  isFormat,
  isSport,
  type Format,
  type Sport,
} from "@/lib/sport-rules";
import {
  playersPerSideFromFormat,
  resolveFormation,
  suggestedRoleAt,
} from "@/lib/formations-catalog";
import { baseDotsForHalf } from "@/lib/match-formation";
import type { MatchCreationIntent, ChallengeModeType } from "@/lib/match-intent-payload";

// ----------------------------------------------------------------------------
// Types & Interfaces
// ----------------------------------------------------------------------------

export interface PitchSpotSelection {
  pitchIndex: number;
  position?: string;
  level?: string;
}

export interface LiveMatchBoardProps {
  sport: Sport | string;
  format: Format | string;
  intent: MatchCreationIntent;
  formationId: string | null;
  selectedPitchSlots: PitchSpotSelection[];
  onTogglePitchSlot?: (pitchIndex: number, role: string) => void;
  benchCount: number;
  onBenchCountChange?: (count: number) => void;
  rotationRule?: string | null;
  onRotationRuleChange?: (rule: string) => void;
  challengeModeType?: ChallengeModeType;
  hostTeamName?: string;
  ariaLiveMessage?: string;
  readOnly?: boolean;
  className?: string;
  compact?: boolean;
}

// ----------------------------------------------------------------------------
// Position Label Dictionaries
// ----------------------------------------------------------------------------

export const POSITION_SHORT_LABELS: Record<string, string> = {
  gk: "ARQ",
  def: "DEF",
  mid: "MED",
  fwd: "DEL",
  cierre: "CIE",
  ala: "ALA",
  pivot: "PIV",
  base: "BAS",
  escolta: "ESC",
  ala_pivot: "A-P",
  armador: "ARM",
  central: "CEN",
  opuesto: "OPU",
  receptor: "REC",
  libero: "LIB",
  drive: "DRI",
  reves: "REV",
  any: "CUA",
};

export const POSITION_FULL_LABELS: Record<string, string> = {
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
  any: "Cualquiera",
};

const SPORT_DISPLAY_NAMES: Record<string, string> = {
  futbol: "Fútbol",
  futbol_sala: "Fútbol sala",
  basquet: "Básquet",
  voleibol: "Voleibol",
  padel: "Pádel",
};

const INTENT_DISPLAY_NAMES: Record<MatchCreationIntent, string> = {
  starter_slots: "Convocatoria Completar Titulares",
  bench_only: "Convocatoria Solo Banca / Suplentes",
  challenge: "Convocatoria Reto a Equipo Rival",
};

// ----------------------------------------------------------------------------
// Vector SVG Icons (aria-hidden="true", Zero Emojis)
// ----------------------------------------------------------------------------

export function IconGoalkeeper({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4m-2-2h4" />
    </svg>
  );
}

export function IconDefender({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M8 11h8" />
    </svg>
  );
}

export function IconMidfielder({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <polygon points="12 2 22 12 12 22 2 12" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconForward({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="3" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="21" y2="12" />
    </svg>
  );
}

export function IconRotationPact({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M7 16V4m0 0L3 8m4-4l4 4m10 4v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export function IconSwordsChallenge({
  className = "w-5 h-5",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6M19 13l2 2-6 6-2-2" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6M5 11l-2-2 6-6 2 2" />
    </svg>
  );
}

export function IconConfirmedCheck({
  className = "w-4 h-4",
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Helper: Format Caption
// ----------------------------------------------------------------------------

export function getFormatCaption(
  sport: Sport | string,
  format: string,
  formationLabel?: string
): {
  headline: string;
  detail: string;
  perSide: number;
} {
  const perSide = playersPerSideFromFormat(format);

  switch (sport) {
    case "voleibol":
      return {
        headline: `Vóley ${format}: ${perSide} titulares por lado`,
        detail:
          format === "6v6"
            ? "3 en zona de red (ataque) y 3 en zona zaguero (defensa)"
            : "2 jugadores en cancha en cobertura paralela o diagonal",
        perSide,
      };
    case "basquet":
      return {
        headline: `Básquet ${format}: ${perSide} jugadores por lado`,
        detail:
          format === "3v3"
            ? "Media cancha con posesión alternada"
            : "Cancha completa con quinteto titular",
        perSide,
      };
    case "padel":
      return {
        headline: `Pádel ${format}: ${perSide} jugadores por lado`,
        detail:
          format === "2v2"
            ? "Pareja clásica (jugador de Drive + jugador de Revés)"
            : "4 jugadores en modalidad americana / equipos",
        perSide,
      };
    case "futbol_sala":
      return {
        headline: `Futsal ${format}: 5 titulares por lado`,
        detail: "1 arquero + 4 jugadores de campo (cierre, alas y pivot)",
        perSide: 5,
      };
    case "futbol":
    default: {
      const outfield = perSide - 1;
      return {
        headline: `Fútbol ${format}: ${perSide} titulares por lado`,
        detail: `1 arquero + ${outfield} jugadores de campo${
          formationLabel ? ` (dibujo táctico ${formationLabel})` : ""
        }`,
        perSide,
      };
    }
  }
}

// ----------------------------------------------------------------------------
// Helper: Live Announcements
// ----------------------------------------------------------------------------

export function generateLiveBoardAnnouncement(params: {
  action: "intent_switch" | "toggle_spot" | "bench_change" | "sport_change";
  intent?: MatchCreationIntent;
  sportLabel?: string;
  format?: string;
  pitchIndex?: number;
  positionLabel?: string;
  isOpen?: boolean;
  benchCount?: number;
  rotationRule?: string | null;
  rivalCount?: number;
}): string {
  switch (params.action) {
    case "intent_switch":
      if (params.intent === "starter_slots") {
        return "Pizarra táctica: Modo completar titulares activado. Tocá los puestos en la cancha para definir los cupos faltantes.";
      }
      if (params.intent === "bench_only") {
        return `Pizarra táctica: Modo solo banca activado. Titulares completos en cancha. ${
          params.benchCount ?? 2
        } suplentes asignados para rotación.`;
      }
      if (params.intent === "challenge") {
        return `Pizarra táctica: Modo reto a rival activado. Se convocan ${
          params.rivalCount ?? 5
        } jugadores para el equipo rival en Lado B.`;
      }
      break;

    case "toggle_spot":
      if (params.isOpen) {
        return `Puesto ${Number(params.pitchIndex) + 1}, posición ${
          params.positionLabel ?? "jugador"
        }: marcado como cupo abierto en cancha.`;
      } else {
        return `Puesto ${Number(params.pitchIndex) + 1}, posición ${
          params.positionLabel ?? "jugador"
        }: desmarcado, confirmado como titular offline.`;
      }

    case "bench_change":
      if ((params.benchCount ?? 0) > 0) {
        return `${params.benchCount} suplente(s) en banca configurados. Pacto de rotación: ${
          params.rotationRule ?? "Rotación activa continua"
        }.`;
      } else {
        return "Sin suplentes de banca en esta convocatoria.";
      }

    case "sport_change":
      return `Deporte cambiado a ${params.sportLabel}, formato ${params.format}. Tablero táctico actualizado.`;
  }
  return "";
}

// ----------------------------------------------------------------------------
// Helper: Keyboard Handler
// ----------------------------------------------------------------------------

export function handleTacticalSpotKeyDown(
  e: React.KeyboardEvent,
  pitchIndex: number,
  role: string,
  onToggle?: (pitchIndex: number, role: string) => void
): boolean {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    if (onToggle) {
      onToggle(pitchIndex, role);
    }
    return true;
  }
  return false;
}

// ----------------------------------------------------------------------------
// Court Lines Component (All 5 Sports)
// ----------------------------------------------------------------------------

export function CourtLines({ sport }: { sport: Sport | string }) {
  switch (sport) {
    case "futbol_sala":
      return (
        <>
          <rect x="24" y="24" width="312" height="172" rx="2" />
          <line x1="180" y1="24" x2="180" y2="196" />
          <circle cx="180" cy="110" r="20" />
          <circle cx="180" cy="110" r="2" fill="currentColor" stroke="none" />
          <rect x="24" y="70" width="38" height="80" rx="14" />
          <rect x="298" y="70" width="38" height="80" rx="14" />
        </>
      );
    case "basquet":
      return (
        <>
          <rect x="18" y="18" width="324" height="184" rx="2" />
          <line x1="180" y1="18" x2="180" y2="202" />
          <rect x="18" y="62" width="78" height="96" />
          <rect x="264" y="62" width="78" height="96" />
          <circle cx="180" cy="110" r="22" />
        </>
      );
    case "voleibol":
      return (
        <>
          <rect x="28" y="28" width="304" height="164" rx="1" />
          <line x1="180" y1="28" x2="180" y2="192" strokeWidth="2.6" stroke="#ffffff" />
          <line x1="118" y1="28" x2="118" y2="192" strokeOpacity="0.55" />
          <line x1="242" y1="28" x2="242" y2="192" strokeOpacity="0.55" />
        </>
      );
    case "padel":
      return (
        <>
          <rect x="40" y="36" width="280" height="148" rx="2" />
          <line x1="180" y1="36" x2="180" y2="184" strokeWidth="2.6" stroke="#ffffff" />
          <line x1="40" y1="110" x2="320" y2="110" />
          <line x1="90" y1="36" x2="90" y2="184" strokeOpacity="0.7" />
          <line x1="270" y1="36" x2="270" y2="184" strokeOpacity="0.7" />
        </>
      );
    case "futbol":
    default:
      return (
        <>
          <rect x="18" y="18" width="324" height="184" rx="2" />
          <line x1="180" y1="18" x2="180" y2="202" />
          <circle cx="180" cy="110" r="28" />
          <circle cx="180" cy="110" r="2.2" fill="currentColor" stroke="none" />
          <rect x="18" y="62" width="42" height="96" />
          <rect x="300" y="62" width="42" height="96" />
        </>
      );
  }
}

// ----------------------------------------------------------------------------
// Main Component: LiveMatchBoard
// ----------------------------------------------------------------------------

export function LiveMatchBoard({
  sport,
  format,
  intent,
  formationId,
  selectedPitchSlots,
  onTogglePitchSlot,
  benchCount,
  rotationRule = "Rotación activa continua",
  challengeModeType = "full_team",
  hostTeamName,
  ariaLiveMessage,
  readOnly = false,
  className = "",
  compact = false,
}: LiveMatchBoardProps) {
  const turfGradId = useId();

  // 1. Resolve Safe Sport & Format
  const validSport: Sport = isSport(sport as string) ? (sport as Sport) : "futbol";
  const validFormat: Format = isFormat(format as string)
    ? (format as Format)
    : defaultFormatForSport(validSport);
  const perSide = playersPerSideFromFormat(validFormat);

  // 2. Resolve Formation & Base Half-Court Coordinates
  const entry = resolveFormation(validSport, validFormat, formationId);
  const setup = {
    sport: validSport,
    format: validFormat,
    formation: entry.lines,
    includeGk: entry.includeGk,
    formationId: entry.id,
    label: entry.name
      ? `${validFormat} · ${entry.label} · ${entry.name}`
      : `${validFormat} · ${entry.label}`,
  };
  const baseDots = baseDotsForHalf(setup);

  // 3. Side Summaries & Intent Details
  const sportName = SPORT_DISPLAY_NAMES[validSport] ?? "Fútbol";
  const intentName = INTENT_DISPLAY_NAMES[intent] ?? "Convocatoria";
  const hostLabel = hostTeamName?.trim() || "Mi Equipo";
  const activeRotationRule = rotationRule?.trim() || "Rotación activa continua";

  const selectedSet = new Set(selectedPitchSlots.map((s) => s.pitchIndex));
  const openCountA = intent === "starter_slots" ? selectedPitchSlots.length : 0;
  const confirmedCountA = perSide - openCountA;

  // 4. Live Announcement String
  const defaultLiveText =
    intent === "starter_slots"
      ? `Pizarra táctica: Modo completar titulares activado. ${openCountA} cupo(s) abierto(s) seleccionados. Tocá los puestos en la cancha para definir los cupos faltantes.`
      : intent === "bench_only"
      ? `Pizarra táctica: Modo solo banca activado. Titulares completos en cancha. ${benchCount} suplentes asignados para rotación.`
      : `Pizarra táctica: Modo reto a rival activado. Se convocan ${perSide} jugadores para el equipo rival en Lado B.`;
  const liveAnnouncement = ariaLiveMessage || defaultLiveText;

  // 5. Narrative Summaries for Figcaption
  const summaryA =
    intent === "starter_slots"
      ? `${confirmedCountA} titulares confirmados, ${openCountA} cupos abiertos en cancha${
          benchCount > 0 ? `, ${benchCount} suplente(s) de banca` : ""
        }.`
      : intent === "bench_only"
      ? `Titulares completos en cancha (${perSide}/${perSide} organizados por fuera de la app), ${benchCount} suplente(s) en rotación activa ("${activeRotationRule}").`
      : `Titulares completos listos para el reto (${perSide}/${perSide})${
          benchCount > 0 ? `, ${benchCount} suplente(s)` : ""
        }.`;

  const summaryB =
    intent === "starter_slots"
      ? "Modo equipo único (convocatoria de un solo lado; rival por definir)."
      : intent === "bench_only"
      ? "Rival por definir."
      : challengeModeType === "open_slots"
      ? `Reto abierto con ${perSide} cupos para rivales libres.`
      : `Reto a rival completo: esperando equipo rival completo de ${perSide} jugadores.`;

  return (
    <figure
      role="region"
      id="live-tactical-board"
      aria-label={`Pizarra táctica interactiva: ${sportName} ${validFormat}, ${intentName}`}
      aria-describedby="live-board-caption"
      className={`live-match-board match-pitch-board ${
        compact ? "is-compact" : ""
      } ${className}`.trim()}
    >
      {/* 1. Screen Reader Polite Live Region */}
      <div
        id="live-board-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>

      {/* 2. Visual Dual Side Header Bar */}
      <div className="live-board-header match-pitch-labels" aria-hidden="true">
        <span className="live-board-side-badge match-pitch-side-label is-home is-active">
          Lado A · {hostLabel}
        </span>
        <span className="live-board-vs-badge">VS</span>
        <span className="live-board-side-badge match-pitch-side-label is-away">
          Lado B · {intent === "challenge" ? "Equipo Rival" : "Rival"}
        </span>
      </div>

      {/* 3. SVG Tactical Pitch Canvas */}
      <div className="live-board-svg-wrap match-pitch-svg-wrap">
        <svg
          className="live-board-svg match-pitch-svg"
          viewBox="0 0 360 220"
          preserveAspectRatio="xMidYMid meet"
          role="group"
          aria-label={`Cancha táctica de ${sportName} ${validFormat}, Lado A y Lado B`}
        >
          <defs>
            <linearGradient id={turfGradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0a5c41" />
              <stop offset="45%" stopColor="#0c6b4c" />
              <stop offset="100%" stopColor="#084a35" />
            </linearGradient>
          </defs>

          {/* Turf Canvas */}
          <rect width="360" height="220" fill={`url(#${turfGradId})`} />

          {/* Court Markings */}
          <g
            className="live-board-lines match-pitch-lines"
            fill="none"
            stroke="#d9f2a5"
            strokeWidth="1.5"
            color="#d9f2a5"
          >
            <CourtLines sport={validSport} />
          </g>

          {/* Center VS Indicator in Challenge Mode */}
          {intent === "challenge" && (
            <g className="live-board-center-vs" pointerEvents="none">
              <circle cx="180" cy="110" r="14" fill="#073828" stroke="#d9f2a5" strokeWidth="1.5" />
              <text
                x="180"
                y="110"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#ffd25a"
                fontSize="8.5"
                fontWeight="900"
              >
                VS
              </text>
            </g>
          )}

          {/* Side A Tactical Spots (Host) */}
          <g className="live-board-spots-side-a" aria-label="Titulares Lado A">
            {baseDots.map((dot) => {
              const role = suggestedRoleAt(entry, dot.pitchIndex);
              const roleShort = POSITION_SHORT_LABELS[role] ?? role.toUpperCase();
              const roleFull = POSITION_FULL_LABELS[role] ?? role;
              const isOpen = intent === "starter_slots" && selectedSet.has(dot.pitchIndex);
              const isInteractive = intent === "starter_slots" && !readOnly;

              if (isInteractive) {
                return (
                  <g
                    key={`spot-a-${dot.pitchIndex}`}
                    className={`live-board-spot-group tactical-spot ${
                      isOpen ? "is-open" : "is-confirmed"
                    }`}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isOpen}
                    aria-label={`Puesto ${dot.pitchIndex + 1} en cancha: ${roleFull} (${roleShort}). ${
                      isOpen
                        ? "Marcado como cupo abierto. Presiona Enter o Espacio para desmarcar."
                        : "Titular cubierto offline. Presiona Enter o Espacio para marcar como cupo abierto."
                    }`}
                    data-pitch-index={dot.pitchIndex}
                    onClick={() => onTogglePitchSlot?.(dot.pitchIndex, role)}
                    onKeyDown={(e) =>
                      handleTacticalSpotKeyDown(e, dot.pitchIndex, role, onTogglePitchSlot)
                    }
                  >
                    {/* Concentric invisible touch hitbox (44x44px target) */}
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={22}
                      fill="transparent"
                      className="tactical-spot-hitbox live-board-hitbox"
                      pointerEvents="all"
                    />

                    {/* High-contrast focus visible ring (WCAG 2.4.7) */}
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={isOpen ? 14 : 12}
                      fill="none"
                      className="live-board-focus-ring tactical-spot-focus-ring"
                    />

                    {/* Visual tactical spot */}
                    <circle
                      cx={dot.x}
                      cy={dot.y}
                      r={isOpen ? 10 : 8}
                      className={`live-board-spot match-pitch-spot tactical-spot-visual is-side-a ${
                        isOpen ? "is-open" : "is-filled"
                      }`}
                    />

                    {/* Inner state mark */}
                    <text
                      x={dot.x}
                      y={dot.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="live-board-mark match-pitch-spot-mark"
                      pointerEvents="none"
                      fill={isOpen ? "var(--bib-ink, #fff8f5)" : "var(--turf-deep, #073828)"}
                      fontSize={isOpen ? "11" : "6.5"}
                      fontWeight="700"
                    >
                      {isOpen ? "?" : roleShort}
                    </text>
                  </g>
                );
              }

              // Non-interactive spots (Intent 2: Solo Banca, or Intent 3: Reto)
              return (
                <g
                  key={`spot-a-${dot.pitchIndex}`}
                  className="live-board-spot-group tactical-spot is-confirmed is-locked"
                  aria-label={`Puesto ${dot.pitchIndex + 1} en cancha: ${roleFull} (${roleShort}). Titular confirmado offline.`}
                  data-pitch-index={dot.pitchIndex}
                >
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r={8}
                    className="live-board-spot match-pitch-spot tactical-spot-visual is-side-a is-filled"
                  />
                  <text
                    x={dot.x}
                    y={dot.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="live-board-mark match-pitch-spot-mark is-role-mark"
                    pointerEvents="none"
                    fill="var(--turf-deep, #073828)"
                    fontSize="6.5"
                    fontWeight="700"
                  >
                    {roleShort}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Side B Tactical Spots (Rival) */}
          <g className="live-board-spots-side-b" aria-label="Lado B Equipo Rival">
            {baseDots.map((dot) => {
              const mirroredX = 360 - dot.x;
              const role = suggestedRoleAt(entry, dot.pitchIndex);
              const roleShort = POSITION_SHORT_LABELS[role] ?? role.toUpperCase();
              const roleFull = POSITION_FULL_LABELS[role] ?? role;

              if (intent === "challenge" && challengeModeType === "open_slots") {
                return (
                  <g
                    key={`spot-b-${dot.pitchIndex}`}
                    className="live-board-spot-group tactical-spot is-rival-open is-side-b"
                    aria-label={`Lado B - Cupo rival ${dot.pitchIndex + 1}: ${roleFull}. Cupo abierto para rival libre.`}
                  >
                    <circle
                      cx={mirroredX}
                      cy={dot.y}
                      r={9}
                      className="live-board-spot match-pitch-spot tactical-spot-visual is-side-b is-open"
                      stroke="#c42a16"
                      strokeWidth="1.8"
                      strokeDasharray="3 2"
                    />
                    <text
                      x={mirroredX}
                      y={dot.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="live-board-mark match-pitch-spot-mark"
                      fill="var(--bib-ink, #fff8f5)"
                      fontSize="6.5"
                      fontWeight="700"
                    >
                      {roleShort}
                    </text>
                  </g>
                );
              }

              // Ghost / Placeholder Spots on Side B
              return (
                <g
                  key={`spot-b-ghost-${dot.pitchIndex}`}
                  className="live-board-spot-group tactical-spot is-side-b is-ghost"
                  aria-hidden="true"
                >
                  <circle
                    cx={mirroredX}
                    cy={dot.y}
                    r={6}
                    className="live-board-spot match-pitch-spot tactical-spot-visual is-side-b is-ghost"
                  />
                </g>
              );
            })}

            {/* Intent 3: Full Team Challenge Squad Crest */}
            {intent === "challenge" && challengeModeType === "full_team" && (
              <g
                className="live-board-rival-crest is-side-b"
                role="img"
                aria-label={`Equipo rival completo (${perSide} jugadores)`}
              >
                <rect
                  x="226"
                  y="76"
                  width="88"
                  height="68"
                  rx="6"
                  fill="#073828"
                  fillOpacity="0.88"
                  stroke="#c42a16"
                  strokeWidth="2"
                />
                <circle cx="270" cy="98" r="13" fill="#c42a16" fillOpacity="0.35" />
                <text
                  x="270"
                  y="102"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#ffffff"
                  fontSize="12"
                  fontWeight="bold"
                >
                  ⚔
                </text>
                <text
                  x="270"
                  y="124"
                  textAnchor="middle"
                  fill="#fff8f5"
                  fontSize="7.5"
                  fontWeight="700"
                  letterSpacing="0.4"
                >
                  RIVAL COMPLETO ({perSide})
                </text>
              </g>
            )}

            {/* Single Team Watermark in Intent 1 & 2 */}
            {intent !== "challenge" && (
              <g className="live-board-single-team-hint" aria-hidden="true">
                <text
                  x="270"
                  y="110"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#d9f2a5"
                  fillOpacity="0.45"
                  fontSize="7.5"
                  fontFamily="var(--font-mono, monospace)"
                  letterSpacing="0.6"
                >
                  {intent === "bench_only" ? "RIVAL POR DEFINIR" : "MODO EQUIPO ÚNICO"}
                </text>
              </g>
            )}
          </g>

          {/* Bench Rotation Row (Banquillo) */}
          {(benchCount > 0 || intent === "bench_only") && (
            <g
              className={`live-board-bench-group match-pitch-bench-group ${
                intent === "bench_only" ? "is-hero-bench" : ""
              }`}
              aria-label="Banquillo de suplentes y pacto de rotación"
            >
              {/* Divider line */}
              <line
                x1="24"
                y1="192"
                x2="336"
                y2="192"
                stroke="#d9f2a5"
                strokeWidth="0.8"
                strokeDasharray="3 3"
                strokeOpacity="0.45"
              />
              <text
                x="180"
                y="190"
                textAnchor="middle"
                fill="#d9f2a5"
                fontSize="7"
                fillOpacity="0.75"
                letterSpacing="0.8"
              >
                BANQUILLO / ROTACIÓN
              </text>

              {/* Hero Background highlight for Intent 2 */}
              {intent === "bench_only" && (
                <rect
                  x="24"
                  y="195"
                  width="180"
                  height="22"
                  rx="3"
                  className="live-board-bench-hero"
                />
              )}

              {/* Side A Bench Spots */}
              {Array.from({ length: Math.max(1, benchCount) }, (_, i) => {
                const bx = 40 + i * 26;
                const by = 206;
                return (
                  <g
                    key={`bench-a-${i}`}
                    className="live-board-bench-spot is-side-a"
                    aria-label={`Suplente ${i + 1} en banca (Rotación)`}
                  >
                    <circle
                      cx={bx}
                      cy={by}
                      r={7}
                      className="live-board-spot match-pitch-spot is-bench is-side-a"
                      fill="color-mix(in oklab, var(--flood, #ffd25a) 25%, transparent)"
                      stroke="#ffd25a"
                      strokeWidth="1.6"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={bx}
                      y={by}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="7"
                      fontWeight="bold"
                      fill="var(--flood, #ffd25a)"
                    >
                      ⇄
                    </text>
                  </g>
                );
              })}

              {/* Side B Rival Bench Spots in Challenge Mode */}
              {intent === "challenge" &&
                benchCount > 0 &&
                Array.from({ length: benchCount }, (_, i) => {
                  const bx = 360 - 40 - i * 26;
                  const by = 206;
                  return (
                    <g
                      key={`bench-b-${i}`}
                      className="live-board-bench-spot is-side-b"
                      aria-label={`Suplente rival ${i + 1} en banca`}
                    >
                      <circle
                        cx={bx}
                        cy={by}
                        r={7}
                        className="live-board-spot match-pitch-spot is-bench is-side-b"
                        fill="color-mix(in oklab, var(--bib, #c42a16) 20%, transparent)"
                        stroke="#c42a16"
                        strokeWidth="1.6"
                        strokeDasharray="2 2"
                      />
                      <text
                        x={bx}
                        y={by}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize="7"
                        fontWeight="bold"
                        fill="#c42a16"
                      >
                        ⇄
                      </text>
                    </g>
                  );
                })}
            </g>
          )}
        </svg>
      </div>

      {/* 4. Dual-Modality Spot Action Bar (Guaranteed >= 44x44px Touch Target) */}
      {intent === "starter_slots" && !readOnly && (
        <div
          className="live-board-spot-chips"
          role="group"
          aria-label="Lista táctica de puestos en cancha"
        >
          {baseDots.map((dot) => {
            const role = suggestedRoleAt(entry, dot.pitchIndex);
            const roleShort = POSITION_SHORT_LABELS[role] ?? role.toUpperCase();
            const roleFull = POSITION_FULL_LABELS[role] ?? role;
            const isOpen = selectedSet.has(dot.pitchIndex);

            return (
              <button
                key={`chip-${dot.pitchIndex}`}
                type="button"
                className={`spot-chip ${isOpen ? "is-open" : "is-confirmed"}`}
                onClick={() => onTogglePitchSlot?.(dot.pitchIndex, role)}
                style={{ minHeight: "44px", minWidth: "44px" }}
                aria-pressed={isOpen}
                aria-label={`Puesto ${dot.pitchIndex + 1}: ${roleFull}. ${
                  isOpen ? "Cupo abierto" : "Titular listo"
                }. Toca para alternar.`}
              >
                <span className="spot-chip-badge">#{dot.pitchIndex + 1}</span>
                <span className="spot-chip-role">{roleShort}</span>
                <span className="spot-chip-status">{isOpen ? "Cupo Abierto (?)" : "Listo"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Rotation Pact Banner for Intent 2 */}
      {intent === "bench_only" && (
        <div
          className="live-board-pact-banner"
          role="note"
          aria-label={`Pacto de rotación activo: ${activeRotationRule}`}
          style={{
            padding: "0.55rem 0.75rem",
            background: "color-mix(in oklab, var(--paper, #dff3e6) 85%, var(--turf, #0c6b4c))",
            border: "1.5px solid var(--flood, #ffd25a)",
            borderRadius: "4px",
            fontSize: "0.85rem",
            color: "var(--turf-deep, #073828)",
          }}
        >
          <strong>Titulares completos en cancha.</strong> Pacto de Rotación activo:{" "}
          <span style={{ fontWeight: 700 }}>{activeRotationRule}</span> (Garantiza minutos equitativos a
          los {benchCount} suplentes).
        </div>
      )}

      {/* 6. Dynamic Accessible Figcaption */}
      <figcaption id="live-board-caption" className="live-board-caption match-pitch-caption">
        <div className="live-board-meta">
          <span className="live-board-formation-tag match-pitch-formation">
            {sportName} {validFormat} · {entry.label}
          </span>
          <span className="live-board-capacity-tag" style={{ marginLeft: "0.5rem" }}>
            {perSide * 2} jugadores en cancha ({perSide} por lado)
          </span>
        </div>
        <div className="live-board-narrative" style={{ marginTop: "0.25rem" }}>
          <p className="live-board-narrative-side-a" style={{ margin: "0.15rem 0" }}>
            <strong>Lado A ({hostLabel}):</strong> {summaryA}
          </p>
          <p className="live-board-narrative-side-b" style={{ margin: "0.15rem 0" }}>
            <strong>Lado B ({intent === "challenge" ? "Equipo Rival" : "Rival"}):</strong>{" "}
            {summaryB}
          </p>
        </div>
      </figcaption>

      {/* 7. Scoped A11y Styles & Focus Ring Token Integration */}
      <style>{`
        .live-match-board {
          display: grid;
          gap: 0.65rem;
          margin: 0 0 1.25rem;
          position: relative;
          scroll-margin-top: 85px;
          scroll-margin-bottom: 95px;
        }
        .live-board-svg-wrap {
          position: relative;
          border: 1px solid color-mix(in oklab, var(--turf-deep, #073828) 45%, transparent);
          border-radius: 4px;
          overflow: hidden;
          background: var(--turf-deep, #073828);
        }
        .live-board-svg {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 360 / 220;
        }
        .tactical-spot-hitbox {
          cursor: pointer;
        }
        .tactical-spot.is-locked .tactical-spot-hitbox {
          cursor: default;
        }
        .live-board-spot-group {
          outline: none;
          cursor: pointer;
        }
        .live-board-spot-group.is-locked {
          cursor: default;
        }
        .live-board-focus-ring {
          stroke: var(--flood, #ffd25a);
          stroke-width: 2.5px;
          opacity: 0;
          transition: opacity 0.15s ease, transform 0.15s ease;
          transform-origin: center;
        }
        .live-board-spot-group:focus-visible .live-board-focus-ring {
          opacity: 1;
          filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.7));
        }
        .live-board-spot-group:focus:not(:focus-visible) .live-board-focus-ring {
          opacity: 0;
        }
        .live-board-spot-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }
        .spot-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.75rem;
          min-height: 44px;
          min-width: 44px;
          font-family: var(--font-mono, monospace);
          font-size: 0.85rem;
          background: var(--paper, #dff3e6);
          color: var(--ink, #10231c);
          border: 1.5px solid color-mix(in oklab, var(--turf, #0c6b4c) 35%, transparent);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .spot-chip.is-open {
          border-color: var(--flood, #ffd25a);
          background: color-mix(in oklab, var(--flood, #ffd25a) 25%, var(--paper, #dff3e6));
          font-weight: 700;
        }
        .spot-chip:focus-visible {
          outline: 2px solid var(--flood, #ffd25a);
          outline-offset: 2px;
        }
        .live-board-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          font-family: var(--font-mono, monospace);
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--turf-deep, #073828);
        }
        .live-board-side-badge {
          padding: 0.2rem 0.5rem;
          background: var(--paper, #dff3e6);
          border: 1px solid color-mix(in oklab, var(--turf, #0c6b4c) 30%, transparent);
          border-radius: 3px;
        }
        .live-board-vs-badge {
          font-family: var(--font-display, sans-serif);
          font-size: 1.1rem;
          font-weight: 900;
          color: var(--turf-deep, #073828);
        }
        .live-board-bench-hero {
          fill: color-mix(in oklab, var(--flood, #ffd25a) 15%, transparent);
          stroke: var(--flood, #ffd25a);
          stroke-width: 1.5px;
          stroke-dasharray: 4 2;
        }
        @media (prefers-reduced-motion: reduce) {
          .live-board-spot,
          .match-pitch-spot,
          .spot-chip,
          .live-board-focus-ring {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </figure>
  );
}

export default LiveMatchBoard;
