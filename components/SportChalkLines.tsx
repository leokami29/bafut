"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/sport-rules";

const ROTATION: Sport[] = ["futbol", "basquet", "voleibol", "padel", "futbol_sala"];

function draw(delay: number): CSSProperties {
  return { animationDelay: `${delay}ms` };
}

function SoccerLines() {
  return (
    <g>
      <rect x="40" y="30" width="1120" height="560" fill="none" pathLength={1} className="vr-d" style={draw(0)} />
      <line x1="600" y1="30" x2="600" y2="590" pathLength={1} className="vr-d" style={draw(180)} />
      <circle cx="600" cy="310" r="92" fill="none" pathLength={1} className="vr-d" style={draw(280)} />
      <circle cx="600" cy="310" r="4" className="vr-f" style={draw(430)} />
      <rect x="40" y="170" width="150" height="280" fill="none" pathLength={1} className="vr-d" style={draw(340)} />
      <rect x="1010" y="170" width="150" height="280" fill="none" pathLength={1} className="vr-d" style={draw(380)} />
      <rect x="40" y="240" width="55" height="140" fill="none" pathLength={1} className="vr-d" style={draw(520)} />
      <rect x="1105" y="240" width="55" height="140" fill="none" pathLength={1} className="vr-d" style={draw(560)} />
    </g>
  );
}

function BasquetLines() {
  return (
    <g>
      <rect x="100" y="60" width="1000" height="500" fill="none" pathLength={1} className="vr-d" style={draw(0)} />
      <line x1="600" y1="60" x2="600" y2="560" pathLength={1} className="vr-d" style={draw(180)} />
      <circle cx="600" cy="310" r="45" fill="none" pathLength={1} className="vr-d" style={draw(280)} />
      <rect x="100" y="190" width="190" height="240" fill="none" pathLength={1} className="vr-d" style={draw(340)} />
      <rect x="910" y="190" width="190" height="240" fill="none" pathLength={1} className="vr-d" style={draw(380)} />
      <circle cx="290" cy="310" r="120" fill="none" pathLength={1} className="vr-d" style={draw(470)} />
      <circle cx="910" cy="310" r="120" fill="none" pathLength={1} className="vr-d" style={draw(510)} />
      <path
        d="M100 140 L200 140 A170 170 0 0 1 200 480 L100 480"
        fill="none"
        pathLength={1}
        className="vr-d"
        style={draw(580)}
      />
      <path
        d="M1100 140 L1000 140 A170 170 0 0 0 1000 480 L1100 480"
        fill="none"
        pathLength={1}
        className="vr-d"
        style={draw(640)}
      />
    </g>
  );
}

function VoleibolLines() {
  return (
    <g>
      <rect x="100" y="60" width="1000" height="500" fill="none" className="vr-hatch" style={draw(0)} />
      <rect x="250" y="150" width="700" height="320" fill="none" pathLength={1} className="vr-d" style={draw(160)} />
      <line x1="600" y1="150" x2="600" y2="470" pathLength={1} className="vr-d vr-net" style={draw(320)} />
      <line x1="406" y1="150" x2="406" y2="470" pathLength={1} className="vr-d" style={draw(430)} />
      <line x1="794" y1="150" x2="794" y2="470" pathLength={1} className="vr-d" style={draw(470)} />
      <circle cx="600" cy="150" r="6" className="vr-f" style={draw(560)} />
      <circle cx="600" cy="470" r="6" className="vr-f" style={draw(600)} />
    </g>
  );
}

function PadelLines() {
  return (
    <g>
      <rect x="142" y="72" width="916" height="476" fill="none" pathLength={1} className="vr-d" style={draw(0)} />
      <rect x="150" y="80" width="900" height="460" fill="none" pathLength={1} className="vr-d" style={draw(120)} />
      <line x1="600" y1="80" x2="600" y2="540" pathLength={1} className="vr-d vr-net" style={draw(280)} />
      <line x1="330" y1="80" x2="330" y2="540" pathLength={1} className="vr-d" style={draw(380)} />
      <line x1="870" y1="80" x2="870" y2="540" pathLength={1} className="vr-d" style={draw(420)} />
      <line x1="150" y1="310" x2="330" y2="310" pathLength={1} className="vr-d" style={draw(500)} />
      <line x1="870" y1="310" x2="1050" y2="310" pathLength={1} className="vr-d" style={draw(540)} />
      <circle cx="600" cy="80" r="5" className="vr-f" style={draw(620)} />
      <circle cx="600" cy="540" r="5" className="vr-f" style={draw(660)} />
    </g>
  );
}

function SalaLines() {
  return (
    <g>
      <rect x="100" y="60" width="1000" height="500" fill="none" pathLength={1} className="vr-d" style={draw(0)} />
      <line x1="600" y1="60" x2="600" y2="560" pathLength={1} className="vr-d" style={draw(180)} />
      <circle cx="600" cy="310" r="70" fill="none" pathLength={1} className="vr-d" style={draw(280)} />
      <line x1="270" y1="150" x2="270" y2="470" pathLength={1} className="vr-d" style={draw(380)} />
      <line x1="930" y1="150" x2="930" y2="470" pathLength={1} className="vr-d" style={draw(420)} />
      <circle cx="370" cy="310" r="6" className="vr-f" style={draw(520)} />
      <circle cx="830" cy="310" r="6" className="vr-f" style={draw(560)} />
    </g>
  );
}

function PitchGeometry({ sport }: { sport: Sport }) {
  switch (sport) {
    case "basquet":
      return <BasquetLines />;
    case "voleibol":
      return <VoleibolLines />;
    case "padel":
      return <PadelLines />;
    case "futbol_sala":
      return <SalaLines />;
    default:
      return <SoccerLines />;
  }
}

type SportChalkLinesProps = {
  /** Clase contextual del envoltorio (posicionamiento/visuales del sitio). */
  className?: string;
  /** Etiqueta mono con el deporte actual (hero de registro). */
  showLabel?: boolean;
  intervalMs?: number;
  /** "slice" para llenar un hero absoluto; "meet" para contenedores con aspect fijo. */
  fit?: "slice" | "meet";
};

export function SportChalkLines({
  className = "vr-sport-lines",
  showLabel = true,
  intervalMs = 4200,
  fit = "slice",
}: SportChalkLinesProps) {
  const [index, setIndex] = useState(0);
  const [rotating, setRotating] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setRotating(!mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!rotating) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % ROTATION.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [rotating, intervalMs]);

  const sport = ROTATION[index];

  return (
    <div className={`sport-chalk ${className}`} aria-hidden="true">
      <svg viewBox="0 0 1200 620" preserveAspectRatio={`xMidYMid ${fit}`}>
        <g key={sport}>
          <PitchGeometry sport={sport} />
        </g>
      </svg>
      {showLabel ? (
        <p key={`label-${sport}`} className="sport-chalk-label">
          {sportLabel[sport]}
        </p>
      ) : null}
    </div>
  );
}
