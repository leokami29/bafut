"use client";

import { useId } from "react";
import type { MatchFormationBoard } from "@/lib/match-formation";
import type { Sport } from "@/lib/constants";

function CourtLines({ sport }: { sport: Sport }) {
  switch (sport) {
    case "futbol_sala":
      return (
        <>
          <rect x="24" y="24" width="312" height="172" />
          <line x1="180" y1="24" x2="180" y2="196" />
          <circle cx="180" cy="110" r="20" />
          <circle cx="180" cy="110" r="2" fill="currentColor" stroke="none" />
          <rect x="24" y="70" width="38" height="80" />
          <rect x="298" y="70" width="38" height="80" />
        </>
      );
    case "basquet":
      return (
        <>
          <rect x="18" y="18" width="324" height="184" />
          <line x1="180" y1="18" x2="180" y2="202" />
          <rect x="18" y="62" width="78" height="96" />
          <rect x="264" y="62" width="78" height="96" />
          <circle cx="180" cy="110" r="22" />
        </>
      );
    case "voleibol":
      return (
        <>
          <rect x="28" y="28" width="304" height="164" />
          <line x1="180" y1="28" x2="180" y2="192" strokeWidth="2.6" />
          <line x1="118" y1="28" x2="118" y2="192" strokeOpacity="0.55" />
          <line x1="242" y1="28" x2="242" y2="192" strokeOpacity="0.55" />
        </>
      );
    case "padel":
      return (
        <>
          <rect x="40" y="36" width="280" height="148" />
          <line x1="180" y1="36" x2="180" y2="184" />
          <line x1="40" y1="110" x2="320" y2="110" />
        </>
      );
    default:
      return (
        <>
          <rect x="18" y="18" width="324" height="184" />
          <line x1="180" y1="18" x2="180" y2="202" />
          <circle cx="180" cy="110" r="28" />
          <circle cx="180" cy="110" r="2.2" fill="currentColor" stroke="none" />
          <rect x="18" y="62" width="42" height="96" />
          <rect x="300" y="62" width="42" height="96" />
        </>
      );
  }
}

export function MatchPitchBoard({
  board,
  className = "",
  compact = false,
  sideATitle = "Tu equipo",
  sideBTitle = "El otro equipo",
  sideBEmptyHint = "¿Jugás en contra?",
}: {
  board: MatchFormationBoard;
  className?: string;
  compact?: boolean;
  sideATitle?: string;
  sideBTitle?: string;
  sideBEmptyHint?: string;
}) {
  const turfId = useId();
  const openA = board.sideAOpen;
  const openB = board.hasSideB
    ? board.dots.filter((d) => d.side === "b" && d.state === "open").length
    : 0;

  return (
    <figure className={`match-pitch-board ${compact ? "is-compact" : ""} ${className}`.trim()}>
      <div className="match-pitch-labels" aria-hidden="true">
        <span className="match-pitch-side-label is-home">{sideATitle}</span>
        <span className="match-pitch-side-label is-away">{sideBTitle}</span>
      </div>
      <div className="match-pitch-svg-wrap" aria-hidden="true">
        <svg className="match-pitch-svg" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id={turfId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0a5c41" />
              <stop offset="45%" stopColor="#0c6b4c" />
              <stop offset="100%" stopColor="#084a35" />
            </linearGradient>
          </defs>
          <rect width="360" height="220" fill={`url(#${turfId})`} />
          <g className="match-pitch-lines" fill="none" stroke="#d9f2a5" strokeWidth="1.5" color="#d9f2a5">
            <CourtLines sport={board.sport} />
          </g>
          <g className="match-pitch-spots">
            {board.dots.map((dot, index) => (
              <g key={`${dot.side}-${dot.x}-${dot.y}-${index}`}>
                <circle
                  className={`match-pitch-spot is-${dot.state} is-side-${dot.side}`}
                  cx={dot.x}
                  cy={dot.y}
                  r={dot.state === "open" || dot.state === "invite" ? 7 : 5.5}
                  style={{ animationDelay: `${0.08 + index * 0.04}s` }}
                />
                {dot.state === "open" || dot.state === "invite" ? (
                  <text
                    className="match-pitch-spot-mark"
                    x={dot.x}
                    y={dot.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {dot.state === "invite" ? "+" : "?"}
                  </text>
                ) : null}
              </g>
            ))}
          </g>
        </svg>
        {!board.hasSideB ? (
          <p className="match-pitch-invite-chip">{sideBEmptyHint}</p>
        ) : null}
      </div>
      <figcaption className="match-pitch-caption">
        <span className="match-pitch-formation">{board.label}</span>
        <span className="match-pitch-summary">
          {openA > 0
            ? `Faltan ${openA} en esta formación`
            : "Tu equipo está completo"}
          {board.hasSideB
            ? openB > 0
              ? ` · ${openB} en el otro`
              : " · el otro también completo"
            : " · el otro equipo todavía no se armó"}
        </span>
      </figcaption>
    </figure>
  );
}
