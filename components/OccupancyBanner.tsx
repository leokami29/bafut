"use client";

import Link from "next/link";
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

  const headline =
    occupancy.reason === "own"
      ? "Esa pateada ya es tuya"
      : occupancy.reason === "join"
        ? "Ya hay equipo en esta cancha y hora"
        : occupancy.reason === "open_b"
          ? "Hay pateada: podés armar el rival"
          : "Esa cancha y hora ya están tomadas";

  const body =
    occupancy.reason === "own"
      ? `Publicaste a las ${when} en ${occupancy.venue_name}. Editá o compartí el link; no lo publiques de nuevo.`
      : occupancy.reason === "join"
        ? `A las ${when} en ${occupancy.venue_name} ya hay formación. Unirse = pedir cupo en ese mismo equipo.`
        : occupancy.reason === "open_b"
          ? `A las ${when} en ${occupancy.venue_name} el equipo que publicó ya está. Armá el otro equipo en la misma pateada.`
          : `A las ${when} en ${occupancy.venue_name} no quedan cupos ni rival por abrir.`;

  return (
    <div className="occupancy-banner" role="status">
      <div className="occupancy-banner-copy">
        <p className="occupancy-banner-kicker">Misma cancha · misma hora</p>
        <p className="occupancy-banner-title">{headline}</p>
        <p>{body}</p>
      </div>

      <MatchPitchBoard
        board={board}
        compact
        sideATitle="Equipo publicado"
        sideBTitle="El otro equipo"
        sideBEmptyHint="¿Jugás en contra?"
      />

      {occupancy.reason === "own" ? (
        <p className="occupancy-banner-own">
          <Link href={`/p/${occupancy.share_code}`}>Ver tu partido</Link>
          {" · "}
          <Link href={`/p/${occupancy.share_code}/editar`}>Editar</Link>
        </p>
      ) : null}

      <div className="occupancy-banner-actions">
        {showJoin ? (
          <Link className="btn-bib" href={`/p/${occupancy.share_code}`}>
            Unirme a ese equipo
          </Link>
        ) : null}
        {!showJoin && occupancy.reason !== "own" ? (
          <Link className="btn-ghost" href={`/p/${occupancy.share_code}`}>
            Ver la pateada
          </Link>
        ) : null}
      </div>

      {showOpenB ? (
        <div className="occupancy-banner-rival">
          <p className="occupancy-banner-rival-title">O pedí cupos en el otro equipo</p>
          <OpenSideBForm matchId={occupancy.match_id} shareCode={occupancy.share_code} sport={formSport} />
        </div>
      ) : null}
    </div>
  );
}
