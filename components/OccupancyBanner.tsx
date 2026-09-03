"use client";

import Link from "next/link";
import { OpenSideBForm } from "@/components/OpenSideBForm";
import { formatWhen } from "@/lib/format";
import type { OccupancyConflict } from "@/lib/occupancy";
import type { Sport } from "@/lib/sport-rules";

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

  return (
    <div className="occupancy-banner" role="status">
      <p>
        Ya hay pateada a las {when} en {occupancy.venue_name}. Faltan {occupancy.open_slot_count}.
        {occupancy.reason === "blocked" ? " No se puede publicar encima." : null}
      </p>
      {occupancy.reason === "own" ? (
        <p>
          Ese hueco es tuyo.{" "}
          <Link href={`/p/${occupancy.share_code}`}>Ver</Link>
          {" · "}
          <Link href={`/p/${occupancy.share_code}/editar`}>Editar</Link>
          {isEdit ? " · no lo publiques de nuevo." : ". No publiques de nuevo."}
        </p>
      ) : null}
      <div className="occupancy-banner-actions">
        {showJoin ? (
          <Link className="btn-bib" href={`/p/${occupancy.share_code}`}>
            Unirse
          </Link>
        ) : occupancy.reason === "blocked" ? (
          <Link className="btn-ghost" href={`/p/${occupancy.share_code}`}>
            Ver el partido
          </Link>
        ) : occupancy.reason !== "own" ? (
          <Link className="btn-ghost" href={`/p/${occupancy.share_code}`}>
            Ver el partido
          </Link>
        ) : null}
      </div>
      {showOpenB ? (
        <OpenSideBForm matchId={occupancy.match_id} shareCode={occupancy.share_code} sport={sport} />
      ) : null}
    </div>
  );
}
