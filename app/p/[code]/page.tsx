import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelMatchAction } from "@/app/actions";
import { HostShareBanner, ShareWhatsApp } from "@/components/ShareWhatsApp";
import { SlotList } from "@/components/SlotList";
import { getMatchByCode, getSessionUserId } from "@/lib/data";
import { openSlotCount, slotIsOpen } from "@/lib/types";
import { formatMoney, formatWhen, openSlotsPhrase } from "@/lib/format";
import { formatLabel, genderLabel, matchStatusLabel, positionLabel, sportLabel } from "@/lib/labels";
import type { Position } from "@/lib/constants";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const match = await getMatchByCode(code);
  if (!match) {
    return { title: "Partido" };
  }
  const open = openSlotCount(match);
  const dominant =
    match.match_slots.find(slotIsOpen)?.position ?? match.match_slots[0]?.position ?? "any";
  const position = positionLabel[dominant as Position] ?? "Cualquiera";
  return {
    title: `${openSlotsPhrase(open, position)} en ${match.venues.name}`,
    description: `${formatWhen(match.starts_at, match.cities.timezone)} · ${match.venues.neighborhood ?? match.cities.name}`,
  };
}

export default async function PartidoPage({ params }: Props) {
  const { code } = await params;
  const [match, userId] = await Promise.all([getMatchByCode(code), getSessionUserId()]);
  if (!match) {
    notFound();
  }

  const cancelled = match.status === "cancelled";
  const open = cancelled ? 0 : openSlotCount(match);
  const dominant =
    match.match_slots.find(slotIsOpen)?.position ?? match.match_slots[0]?.position ?? "any";
  const position = positionLabel[dominant as Position] ?? "Cualquiera";
  const when = formatWhen(match.starts_at, match.cities.timezone);
  const price = formatMoney(match.cost_per_person, match.currency);
  const isHost = userId === match.host_id;
  const canCancel = isHost && !cancelled && match.starts_at > new Date().toISOString();
  const shareProps = {
    openCount: open,
    position,
    when,
    venue: match.venues.name,
    neighborhood: match.venues.neighborhood,
    price,
    shareCode: match.share_code,
  };

  return (
    <main className="page page-narrow" id="main">
      <div className="match-status-row">
        <p className="eyebrow">{match.cities.name}</p>
        <span className={`status-chip ${cancelled ? "is-full" : open > 0 ? "is-open" : "is-full"}`}>
          {cancelled ? matchStatusLabel.cancelled : open > 0 ? "Abierto" : "Completo"}
        </span>
      </div>
      <h1>{cancelled ? "Partido cancelado" : openSlotsPhrase(open, position)}</h1>
      <p className="lede">
        {when} · {match.venues.name}
        {match.venues.neighborhood ? ` · ${match.venues.neighborhood}` : ""}
      </p>
      <p className="match-facts">
        {sportLabel[match.sport as keyof typeof sportLabel] ?? match.sport}{" "}
        {formatLabel[match.format as keyof typeof formatLabel] ?? match.format}
        {" · "}
        {genderLabel[match.gender_policy as keyof typeof genderLabel] ?? match.gender_policy}
        {" · "}
        {price}
        {" · "}
        organiza {match.profiles.display_name}
      </p>
      {match.notes ? <p className="notes">{match.notes}</p> : null}

      {isHost && !cancelled && open > 0 ? <HostShareBanner {...shareProps} /> : null}
      {!cancelled ? <ShareWhatsApp {...shareProps} sticky={isHost && open > 0} /> : null}

      {canCancel ? (
        <form action={cancelMatchAction} className="cancel-match-form">
          <input type="hidden" name="match_id" value={match.id} />
          <input type="hidden" name="share_code" value={match.share_code} />
          <button className="btn-ghost" type="submit">
            Cancelar partido
          </button>
        </form>
      ) : null}

      <h2 className="subhead">Cupos</h2>
      <SlotList
        slots={match.match_slots}
        shareCode={match.share_code}
        isHost={isHost}
        userId={userId}
        matchCancelled={cancelled}
      />

      <p className="foot-link">
        <Link href={`/canchas/${match.venues.slug}`}>{match.venues.name}</Link>
        {" · "}
        <Link href="/partidos">Más partidos</Link>
      </p>
    </main>
  );
}
