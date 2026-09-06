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
  secondaryToClaim = false,
}: {
  board: MatchFormationBoard;
  matchId: string;
  shareCode: string;
  sport: Sport;
  canOpenRival: boolean;
  userId: string | null;
  cancelled: boolean;
  /** Si el CTA Pedir cupo ya está arriba, la formación se lee como secundaria. */
  secondaryToClaim?: boolean;
}) {
  const [showRival, setShowRival] = useState(false);
  const cuposHref = `#cupos`;

  useEffect(() => {
    if (!canOpenRival) return;
    if (window.location.hash !== "#armar-rival") return;
    const timer = window.setTimeout(() => {
      setShowRival(true);
      queueMicrotask(() => {
        document.getElementById("armar-rival")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canOpenRival]);

  const openForm = () => {
    setShowRival(true);
    queueMicrotask(() => {
      document.getElementById("armar-rival")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const lead = secondaryToClaim
    ? canOpenRival
      ? "Orientación: izquierda = con ellos · derecha = rival. El pedido de cupo va arriba."
      : board.hasSideB
        ? "Dos equipos en la misma cancha y hora. Pedí cupo arriba en el que te toque."
        : "Así va armada esta pateada (secundario al pedido de cupo)."
    : canOpenRival
      ? "Mitad izquierda = pedir cupo con ellos. Mitad derecha = armar el rival."
      : board.hasSideB
        ? "Dos equipos en la misma cancha y hora. Pedí cupo en el que te toque."
        : "Así va la formación de esta pateada.";

  return (
    <section className="match-formation-section" id="formacion" aria-labelledby="match-formation-heading">
      <h2 className="subhead" id="match-formation-heading">
        Formación
      </h2>
      <p className="match-formation-lead">{lead}</p>

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
        <p className="match-formation-secondary-links">
          <a href={cuposHref}>Pedí cupo con ellos</a>
          <span aria-hidden="true"> · </span>
          <button type="button" className="linkish" onClick={openForm}>
            Armá el rival
          </button>
        </p>
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
