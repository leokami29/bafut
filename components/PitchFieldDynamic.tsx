"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { DotPosition, PitchSetup } from "@/lib/pitch-config";
import type { Sport } from "@/lib/constants";

type PitchFieldDynamicProps = {
  className?: string;
  setup: PitchSetup | null;
  dots: DotPosition[];
  mounted: boolean;
  rotationKey?: number;
};

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
          <path d="M 62 70 A 28 40 0 0 1 62 150" />
          <path d="M 298 70 A 28 40 0 0 0 298 150" />
          <circle cx="56" cy="110" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="304" cy="110" r="1.8" fill="currentColor" stroke="none" />
        </>
      );
    case "basquet":
      return (
        <>
          <rect x="18" y="18" width="324" height="184" />
          <line x1="180" y1="18" x2="180" y2="202" />
          {/* Left key */}
          <rect x="18" y="62" width="78" height="96" />
          <rect x="18" y="86" width="42" height="48" />
          <path d="M 96 62 A 58 58 0 0 1 96 158" />
          <circle cx="54" cy="110" r="2" fill="currentColor" stroke="none" />
          {/* Right key */}
          <rect x="264" y="62" width="78" height="96" />
          <rect x="300" y="86" width="42" height="48" />
          <path d="M 264 62 A 58 58 0 0 0 264 158" />
          <circle cx="306" cy="110" r="2" fill="currentColor" stroke="none" />
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
          <line x1="28" y1="110" x2="332" y2="110" strokeDasharray="5 5" strokeOpacity="0.4" />
        </>
      );
    case "padel":
      return (
        <>
          <rect x="18" y="18" width="324" height="184" strokeOpacity="0.4" strokeDasharray="4 4" />
          <rect x="40" y="36" width="280" height="148" />
          <line x1="180" y1="36" x2="180" y2="184" />
          <line x1="40" y1="110" x2="320" y2="110" />
          <line x1="100" y1="36" x2="100" y2="184" strokeOpacity="0.55" />
          <line x1="260" y1="36" x2="260" y2="184" strokeOpacity="0.55" />
          <line x1="100" y1="78" x2="260" y2="78" strokeOpacity="0.45" />
          <line x1="100" y1="142" x2="260" y2="142" strokeOpacity="0.45" />
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
          <rect x="18" y="86" width="18" height="48" />
          <rect x="324" y="86" width="18" height="48" />
          <path d="M 60 62 A 36 48 0 0 1 60 158" />
          <path d="M 300 62 A 36 48 0 0 0 300 158" />
        </>
      );
  }
}

function PlayerDots({ dots }: { dots: DotPosition[] }) {
  return (
    <g className="pitch-spots">
      {dots.map((dot, index) => (
        <g key={`${dot.x}-${dot.y}-${index}`}>
          <circle
            className={dot.isHole ? "spot hole" : "spot"}
            cx={dot.x}
            cy={dot.y}
            r={dot.isHole ? 7 : 5.5}
            style={{
              animationDelay: `${0.35 + index * 0.055}s`,
              transformOrigin: `${dot.x}px ${dot.y}px`,
            }}
          />
          {dot.isHole ? (
            <text
              className="spot-question"
              x={dot.x}
              y={dot.y}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ animationDelay: `${0.42 + index * 0.055}s` }}
            >
              ?
            </text>
          ) : null}
        </g>
      ))}
    </g>
  );
}

export function PitchFieldDynamic({
  className = "",
  setup,
  dots,
  mounted,
  rotationKey = 0,
}: PitchFieldDynamicProps) {
  const turfId = useId();
  const shadeId = useId();
  const sport = setup?.sport ?? "futbol";
  const label = setup?.label ?? "";
  const [swapping, setSwapping] = useState(false);
  const prevRotationKey = useRef(rotationKey);

  useEffect(() => {
    if (rotationKey === 0 || rotationKey === prevRotationKey.current) return undefined;
    prevRotationKey.current = rotationKey;
    setSwapping(true);
    const timer = window.setTimeout(() => setSwapping(false), 420);
    return () => window.clearTimeout(timer);
  }, [rotationKey]);

  return (
    <div
      className={`pitch-field-wrap ${mounted ? "is-ready" : ""} ${swapping ? "is-swapping" : ""} ${className}`.trim()}
      aria-hidden="true"
    >
      <svg
        className="pitch-field"
        viewBox="0 0 360 220"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={turfId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a5c41" />
            <stop offset="45%" stopColor="#0c6b4c" />
            <stop offset="100%" stopColor="#084a35" />
          </linearGradient>
          {/* Oscurece solo el tercio inferior del SVG — sin overlay CSS sobre el texto */}
          <linearGradient id={shadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#073828" stopOpacity="0" />
            <stop offset="48%" stopColor="#073828" stopOpacity="0" />
            <stop offset="78%" stopColor="#052820" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#031810" stopOpacity="0.62" />
          </linearGradient>
        </defs>
        <rect width="360" height="220" fill={`url(#${turfId})`} />
        <rect width="360" height="220" fill={`url(#${shadeId})`} pointerEvents="none" />
        <g
          key={`${sport}-${rotationKey}`}
          className="pitch-lines"
          fill="none"
          stroke="#d9f2a5"
          strokeWidth="1.6"
          color="#d9f2a5"
        >
          <CourtLines sport={sport} />
        </g>
        {mounted ? <PlayerDots key={rotationKey} dots={dots} /> : null}
      </svg>
      {mounted && label ? (
        <span key={rotationKey} className="pitch-formation-label">
          {label}
        </span>
      ) : null}
    </div>
  );
}
