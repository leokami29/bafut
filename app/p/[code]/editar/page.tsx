import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateMatchForm } from "@/components/CreateMatchForm";
import { requireUserId } from "@/lib/auth";
import { getMatchByCode, getVenuesByCity } from "@/lib/data";
import { isoToDatetimeLocalInZone } from "@/lib/datetime";
import { isSport } from "@/lib/sport-rules";
import { matchCanBeHostEdited, slotIsOpen } from "@/lib/types";
import { robotsNoIndex } from "@/lib/seo";
import type { Format } from "@/lib/constants";

type Props = { params: Promise<{ code: string }> };

export const metadata: Metadata = {
  title: "Editar partido",
  robots: robotsNoIndex,
};

export default async function EditarPartidoPage({ params }: Props) {
  const { code } = await params;
  const { userId } = await requireUserId(`/p/${code}/editar`);
  const match = await getMatchByCode(code);
  if (!match) {
    notFound();
  }

  const canEdit = matchCanBeHostEdited(match, userId);
  const venues = await getVenuesByCity(match.city_id);
  const sport = isSport(match.sport) ? match.sport : "futbol";

  return (
    <main className="page page-editar-partido" id="main">
      <header className="page-head match-compose-head">
        <p className="eyebrow">Editar</p>
        <h1>Editar hueco</h1>
        {canEdit ? (
          <p className="lede">
            Cambiá hora, cancha, pago, notas y cupos.{" "}
            <Link href={`/p/${match.share_code}`}>Volver al partido</Link>
          </p>
        ) : (
          <p className="lede">
            {match.host_id !== userId
              ? "Solo quien armó el partido puede editarlo."
              : match.status !== "open"
                ? "Ese partido ya no está abierto."
                : "Ese partido ya empezó."}{" "}
            <Link href={`/p/${match.share_code}`}>Volver al partido</Link>
          </p>
        )}
      </header>
      {canEdit ? (
        <CreateMatchForm
          city={match.cities}
          venues={venues}
          defaultVenueId={match.venue_id}
          edit={{
            matchId: match.id,
            shareCode: match.share_code,
            sport,
            format: match.format as Format,
            venueId: match.venue_id,
            startsAtLocal: isoToDatetimeLocalInZone(match.starts_at, match.cities.timezone),
            durationMin: match.duration_min,
            costPerPerson: match.cost_per_person,
            genderPolicy: match.gender_policy,
            notes: match.notes,
            slots: match.match_slots
              .filter((slot) => slot.side !== "b")
              .map((slot) => ({
              id: slot.id,
              position: slot.position,
              level: slot.level,
              accepted: !slotIsOpen(slot),
              pending: slot.slot_claims.some((claim) => claim.status === "pending"),
            })),
          }}
        />
      ) : null}
    </main>
  );
}
