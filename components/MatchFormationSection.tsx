"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MatchPitchBoard } from "@/components/MatchPitchBoard";
import { OpenSideBForm } from "@/components/OpenSideBForm";
import type { MatchFormationBoard } from "@/lib/match-formation";
import type { Sport } from "@/lib/sport-rules";

export function MatchFormationSection({
  board,
  matchId,
  shareCode,
  sport,
  canOpenRival,
  userId,
  cancelled,
}: {
  board: MatchFormationBoard;
  matchId: string;
  shareCode: string;
  sport: Sport;
  canOpenRival: boolean;
  userId: string | null;
  cancelled: boolean;
}) {
  const [showRival, setShowRival] = useState(false);
  const cuposHref = `#cupos`;

  useEffect(() => {
    if (!canOpenRival) return;
    if (window.location.hash !== "#armar-rival") return;
    const timer = window.setTimeout(() => setShowRival(true), 0);
    return () => window.clearTimeout(timer);
  }, [canOpenRival]);

  const openForm = () => {
    setShowRival(true);
    queueMicrotask(() => {
      document.getElementById("armar-rival")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <section className="match-formation-section" aria-labelledby="match-formation-heading">
      <h2 className="subhead" id="match-formation-heading">
        Formación
      </h2>
      <p className="match-formation-lead">
        {canOpenRival
          ? "Mitad izquierda = pedir cupo con ellos. Mitad derecha = armar el rival."
          : board.hasSideB
            ? "Dos equipos en la misma cancha y hora. Pedí cupo en el que te toque."
            : "Así va la formación de esta pateada."}
      </p>

      <MatchPitchBoard
        board={board}
        sideATitle="Con ellos"
        sideBTitle="En contra"
        sideBEmptyHint={canOpenRival ? "¿Jugás en contra? Tocá acá" : "Rival aún no armado"}
        activeSide={showRival ? "b" : null}
        sideAHit={
          cancelled
            ? { kind: "disabled", label: "Cancelado" }
            : { kind: "link", href: cuposHref, label: "Voy con ellos" }
        }
        sideBHit={
          cancelled
            ? { kind: "disabled", label: "Cancelado" }
            : canOpenRival
              ? { kind: "button", onClick: openForm, label: "Voy en contra" }
              : board.hasSideB
                ? { kind: "link", href: cuposHref, label: "Ver cupos" }
                : { kind: "disabled", label: "Sin rival" }
        }
      />

      {canOpenRival ? (
        <div className="match-choice-grid" role="group" aria-label="¿Vas con ellos o en contra?">
          <a className="occupancy-choice is-join" href={cuposHref}>
            <span className="occupancy-choice-kicker">Misma formación</span>
            <strong>Voy con ellos</strong>
            <span className="occupancy-choice-result">Pedís un cupo en el equipo que publicó</span>
          </a>
          <button
            type="button"
            className={`occupancy-choice is-rival ${showRival ? "is-on" : ""}`}
            onClick={openForm}
          >
            <span className="occupancy-choice-kicker">Misma pateada</span>
            <strong>Voy en contra</strong>
            <span className="occupancy-choice-result">Armás el rival en esta cancha y hora</span>
          </button>
        </div>
      ) : null}

      {canOpenRival && showRival ? (
        <div className="open-side-b-block" id="armar-rival" aria-labelledby="open-side-b-heading">
          <h3 className="subhead" id="open-side-b-heading">
            Armar el rival
          </h3>
          {userId ? (
            <OpenSideBForm matchId={matchId} shareCode={shareCode} sport={sport} />
          ) : (
            <p className="open-side-b-lead">
              Entrá para pedir cupos del rival en esta misma pateada.{" "}
              <Link href={`/entrar?next=/p/${shareCode}`}>Entrar</Link>
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}
