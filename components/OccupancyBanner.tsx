"use client";

import Link from "next/link";
import { useState } from "react";
import { MatchPitchBoard } from "@/components/MatchPitchBoard";
import { OpenSideBForm } from "@/components/OpenSideBForm";
import { formatWhen } from "@/lib/format";
import { buildFormationFromOccupancy } from "@/lib/match-formation";
import type { OccupancyConflict } from "@/lib/occupancy";
import { isSport, type Sport } from "@/lib/sport-rules";

export function OccupancyBanner({
  occupancy,
  timeZone,
  sport,
  isEdit = false,
}: {
  occupancy: OccupancyConflict;
  timeZone: string;
  sport: Sport;
  isEdit?: boolean;
}) {
  const [choice, setChoice] = useState<"join" | "rival" | null>(null);
  const when = formatWhen(occupancy.starts_at, timeZone);
  const showJoin = occupancy.open_slot_count > 0 && occupancy.reason !== "own";
  const showOpenB = !occupancy.has_side_b && occupancy.reason !== "own" && !isEdit;
  const boardSport = isSport(occupancy.sport) ? occupancy.sport : sport;
  const formSport = boardSport;
  const board = buildFormationFromOccupancy({
    sport: boardSport,
    format: occupancy.format,
    openSlotCount: occupancy.open_slot_count,
    hasSideB: occupancy.has_side_b,
  });
  const matchHref = `/p/${occupancy.share_code}`;

  if (occupancy.reason === "own") {
    return (
      <div className="occupancy-banner" role="status">
        <div className="occupancy-banner-copy">
          <p className="occupancy-banner-kicker">Misma cancha · misma hora</p>
          <p className="occupancy-banner-title">Esa pateada ya es tuya</p>
          <p>
            Publicaste a las {when} en {occupancy.venue_name}. Editá o compartí el link; no lo
            publiques de nuevo.
          </p>
        </div>
        <MatchPitchBoard
          board={board}
          compact
          sideATitle="Tu equipo"
          sideBTitle="En contra"
          sideBEmptyHint={occupancy.has_side_b ? undefined : "El rival aún no se armó"}
        />
        <p className="occupancy-banner-own">
          <Link className="btn-bib" href={matchHref}>
            Ver tu partido
          </Link>
          <Link className="btn-ghost" href={`${matchHref}/editar`}>
            Editar
          </Link>
        </p>
      </div>
    );
  }

  if (occupancy.reason === "blocked") {
    return (
      <div className="occupancy-banner" role="status">
        <div className="occupancy-banner-copy">
          <p className="occupancy-banner-kicker">
            {when} · {occupancy.venue_name}
          </p>
          <p className="occupancy-banner-title">Esa cancha y hora ya están llenas</p>
          <p>No quedan cupos ni rival por abrir. Miralo o elegí otra hora.</p>
        </div>
        <MatchPitchBoard board={board} compact sideATitle="Con ellos" sideBTitle="En contra" />
        <div className="occupancy-banner-actions">
          <Link className="btn-ghost" href={matchHref}>
            Ver la pateada
          </Link>
        </div>
      </div>
    );
  }

  const needsChoice = showJoin && showOpenB;
  const showRivalForm = showOpenB && (choice === "rival" || !showJoin);

  return (
    <div className="occupancy-banner occupancy-banner-choice" role="status">
      <div className="occupancy-banner-copy">
        <p className="occupancy-banner-kicker">
          {when} · {occupancy.venue_name}
        </p>
        <p className="occupancy-banner-title">
          {needsChoice
            ? "¿Vas con ellos o en contra?"
            : showJoin
              ? "Ya hay equipo: pedí un cupo"
              : "El equipo está armado: jugales"}
        </p>
        <p>
          {needsChoice
            ? "Misma cancha y hora. Una sola pateada: o te sumás a ese equipo, o armás el rival."
            : showJoin
              ? `Faltan ${occupancy.open_slot_count} en esa formación. Pedí cupo ahí — no publiques encima.`
              : "Ese equipo ya no pide gente. Armá el rival en esta misma pateada."}
        </p>
      </div>

      <MatchPitchBoard
        board={board}
        compact
        sideATitle="Con ellos"
        sideBTitle="En contra"
        sideBEmptyHint="Tocá derecha = armar rival"
        activeSide={choice === "join" ? "a" : choice === "rival" ? "b" : null}
        sideAHit={
          showJoin
            ? { kind: "link", href: matchHref, label: "Voy con ellos" }
            : { kind: "disabled", label: "Lleno" }
        }
        sideBHit={
          showOpenB
            ? {
                kind: "button",
                label: "Voy en contra",
                onClick: () => setChoice("rival"),
              }
            : occupancy.has_side_b
              ? { kind: "link", href: matchHref, label: "Ver rival" }
              : { kind: "disabled", label: "Cerrado" }
        }
      />

      {needsChoice || showJoin || showOpenB ? (
        <div className="occupancy-choice-grid" role="group" aria-label="Elegí qué hacer">
          {showJoin ? (
            <Link
              className={`occupancy-choice is-join ${choice === "join" ? "is-on" : ""}`}
              href={matchHref}
              onClick={() => setChoice("join")}
            >
              <span className="occupancy-choice-kicker">Misma formación</span>
              <strong>Voy con ellos</strong>
              <span className="occupancy-choice-result">
                Te pedís un cupo en ese equipo
                {occupancy.open_slot_count > 0 ? ` · faltan ${occupancy.open_slot_count}` : ""}
              </span>
            </Link>
          ) : null}

          {showOpenB ? (
            <button
              type="button"
              className={`occupancy-choice is-rival ${choice === "rival" || (!showJoin && showOpenB) ? "is-on" : ""}`}
              onClick={() => setChoice("rival")}
            >
              <span className="occupancy-choice-kicker">Misma pateada</span>
              <strong>Voy en contra</strong>
              <span className="occupancy-choice-result">Armás el rival en esta cancha y hora</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {showRivalForm ? (
        <div className="occupancy-banner-rival" id="occupancy-rival">
          <OpenSideBForm
            matchId={occupancy.match_id}
            shareCode={occupancy.share_code}
            sport={formSport}
            compact
          />
        </div>
      ) : null}

      {!showJoin && !showOpenB ? (
        <div className="occupancy-banner-actions">
          <Link className="btn-ghost" href={matchHref}>
            Ver la pateada
          </Link>
        </div>
      ) : null}
    </div>
  );
}
