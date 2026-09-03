"use client";

import Link from "next/link";
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

type SideHit =
  | { kind: "link"; href: string; label: string }
  | { kind: "button"; onClick: () => void; label: string }
  | { kind: "disabled"; label: string };

export function MatchPitchBoard({
  board,
  className = "",
  compact = false,
  sideATitle = "Con ellos",
  sideBTitle = "En contra",
  sideBEmptyHint = "Tocá acá para armar el rival",
  sideAHit,
  sideBHit,
  activeSide,
}: {
  board: MatchFormationBoard;
  className?: string;
  compact?: boolean;
  sideATitle?: string;
  sideBTitle?: string;
  sideBEmptyHint?: string;
  sideAHit?: SideHit;
  sideBHit?: SideHit;
  activeSide?: "a" | "b" | null;
}) {
  const turfId = useId();
  const openA = board.sideAOpen;
  const openB = board.hasSideB
    ? board.dots.filter((d) => d.side === "b" && d.state === "open").length
    : 0;
  const interactive = Boolean(sideAHit || sideBHit);

  const summaryA =
    openA > 0 ? `Faltan ${openA} · pedí cupo` : "Equipo lleno";
  const summaryB = board.hasSideB
    ? openB > 0
      ? `Faltan ${openB} · pedí cupo`
      : "Rival lleno"
    : "Todavía libre · armá el rival";

  return (
    <figure
      className={`match-pitch-board ${compact ? "is-compact" : ""} ${interactive ? "is-interactive" : ""} ${className}`.trim()}
    >
      <div className="match-pitch-labels" aria-hidden="true">
        <span className={`match-pitch-side-label is-home ${activeSide === "a" ? "is-active" : ""}`}>
          {sideATitle}
        </span>
        <span className={`match-pitch-side-label is-away ${activeSide === "b" ? "is-active" : ""}`}>
          {sideBTitle}
        </span>
      </div>
      <div className="match-pitch-svg-wrap" aria-hidden={interactive ? undefined : true}>
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

        {interactive ? (
          <div className="match-pitch-hits" role="group" aria-label="Elegí mitad de la cancha">
            <PitchHit side="a" hit={sideAHit} active={activeSide === "a"} />
            <PitchHit side="b" hit={sideBHit} active={activeSide === "b"} />
          </div>
        ) : null}

        {!board.hasSideB ? (
          <p className="match-pitch-invite-chip">{sideBEmptyHint}</p>
        ) : null}
      </div>
      <figcaption className="match-pitch-caption">
        <span className="match-pitch-formation">{board.label}</span>
        <span className="match-pitch-summary">
          <span className="match-pitch-summary-side">{summaryA}</span>
          <span className="match-pitch-summary-sep" aria-hidden="true">
            ·
          </span>
          <span className="match-pitch-summary-side">{summaryB}</span>
        </span>
      </figcaption>
    </figure>
  );
}

function PitchHit({
  side,
  hit,
  active,
}: {
  side: "a" | "b";
  hit?: SideHit;
  active?: boolean;
}) {
  const className = `match-pitch-hit is-${side} ${active ? "is-active" : ""} ${!hit || hit.kind === "disabled" ? "is-disabled" : ""}`;

  if (!hit || hit.kind === "disabled") {
    return (
      <div className={className} aria-disabled="true">
        <span className="match-pitch-hit-label">{hit?.label ?? (side === "a" ? "Con ellos" : "En contra")}</span>
      </div>
    );
  }

  if (hit.kind === "link") {
    return (
      <Link className={className} href={hit.href}>
        <span className="match-pitch-hit-label">{hit.label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={hit.onClick}>
      <span className="match-pitch-hit-label">{hit.label}</span>
    </button>
  );
}
