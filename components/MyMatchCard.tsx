import Link from "next/link";
import { cancelMatchAction } from "@/app/actions";
import { LevelFeedbackButtons } from "@/components/LevelFeedbackButtons";
import { SportMark } from "@/components/SportMark";
import type { Format, Position, Sport } from "@/lib/constants";
import { formatMoney, formatWhen, openSlotsPhrase } from "@/lib/format";
import { isSport } from "@/lib/sport-rules";
import {
  claimStatusLabel,
  formatLabel,
  matchStatusLabel,
  positionLabel,
  sportLabel,
} from "@/lib/labels";
import {
  openSlotCount,
  pendingClaimCountForHost,
  slotIsOpen,
  type ClaimWithPlayer,
  type MatchDetail,
} from "@/lib/types";
import { matchShareText, whatsappShareHref } from "@/lib/whatsapp";

export type MyMatchRole = "host" | "claim";

export type MyMatchCardModel = {
  role: MyMatchRole;
  match: MatchDetail;
  claim?: Pick<ClaimWithPlayer, "id" | "status">;
  feedbackClaims?: ClaimWithPlayer[];
  canFeedbackClaim?: boolean;
};

function resolveSport(raw: string): Sport {
  return isSport(raw) ? raw : "futbol";
}

function roleLabel(role: MyMatchRole, claimStatus?: string, past = false) {
  if (role === "host") return "Organicé";
  if (claimStatus === "accepted") return past ? "Jugué" : "Voy";
  if (claimStatus === "pending") return "Pedí cupo";
  if (claimStatus === "rejected") return "No entró";
  if (claimStatus === "withdrawn") return "Retiré pedido";
  return "Pedí cupo";
}

function statusTone(opts: {
  cancelled: boolean;
  past: boolean;
  role: MyMatchRole;
  claimStatus?: string;
  pending: number;
}): { label: string; tone: "open" | "warn" | "ok" | "muted" | "bad" } {
  if (opts.cancelled) return { label: "Cancelado", tone: "bad" };
  if (opts.role === "host" && opts.pending > 0 && !opts.past) {
    return { label: `${opts.pending} por revisar`, tone: "warn" };
  }
  if (opts.role === "claim") {
    if (opts.claimStatus === "pending") return { label: "Esperando al host", tone: "warn" };
    if (opts.claimStatus === "accepted") {
      return opts.past ? { label: "Jugaste", tone: "ok" } : { label: "Confirmado", tone: "ok" };
    }
    if (opts.claimStatus === "rejected") return { label: "Rechazado", tone: "bad" };
    if (opts.claimStatus === "withdrawn") return { label: "Retirado", tone: "muted" };
  }
  if (opts.past) return { label: "Ya pasó", tone: "muted" };
  return { label: matchStatusLabel.open ?? "Abierto", tone: "open" };
}

export function MyMatchCard({
  role,
  match,
  claim,
  feedbackClaims = [],
  canFeedbackClaim = false,
  nowIso,
}: MyMatchCardModel & { nowIso: string }) {
  const sport = resolveSport(match.sport);
  const cancelled = match.status === "cancelled";
  const past = match.starts_at <= nowIso;
  const open = openSlotCount(match);
  const pending = pendingClaimCountForHost(match);
  const dominant =
    match.match_slots.find(slotIsOpen)?.position ?? match.match_slots[0]?.position ?? "any";
  const when = formatWhen(match.starts_at, match.cities.timezone);
  const format = formatLabel[match.format as Format] ?? match.format;
  const sportName = sportLabel[sport];
  const hole = openSlotsPhrase(open, positionLabel[dominant as Position] ?? "Cualquiera");
  const price = formatMoney(match.cost_per_person, match.currency);
  const tone = statusTone({
    cancelled,
    past,
    role,
    claimStatus: claim?.status,
    pending,
  });
  const canEdit = role === "host" && !cancelled && !past;
  const canShare = role === "host" && !cancelled && !past && open > 0;
  const shareHref = canShare
    ? whatsappShareHref(
        matchShareText({
          openCount: open,
          position: positionLabel[dominant as Position] ?? "Cualquiera",
          when,
          venue: match.venues.name,
          neighborhood: match.venues.neighborhood,
          price,
          shareCode: match.share_code,
        }),
      )
    : null;

  const title =
    role === "host" && !past && !cancelled
      ? hole
      : `${sportName} ${format}`;

  const roleText = roleLabel(role, claim?.status, past);
  const aria = [roleText, tone.label, when, match.venues.name, sportName, format].join(". ");

  return (
    <article className="my-match" data-sport={sport} data-tone={tone.tone} aria-label={aria}>
      <div className="my-match-rail" aria-hidden="true">
        <SportMark sport={sport} compact />
      </div>

      <div className="my-match-body">
        <div className="my-match-topline">
          <span className="my-match-role">{roleText}</span>
          <span className={`my-match-status is-${tone.tone}`}>{tone.label}</span>
          <span className="my-match-sport-pill">
            {sportName}
            <span aria-hidden="true"> · </span>
            {format}
          </span>
        </div>

        <h3 className="my-match-title">
          <Link href={`/p/${match.share_code}`}>{title}</Link>
          {role === "host" && pending > 0 && !cancelled && !past ? (
            <span className="nav-badge" aria-label={`${pending} pedidos pendientes`}>
              {pending}
            </span>
          ) : null}
        </h3>

        <p className="my-match-meta">
          <time dateTime={match.starts_at}>{when}</time>
          <span aria-hidden="true"> · </span>
          <strong>{match.venues.name}</strong>
          {match.venues.neighborhood ? <span> · {match.venues.neighborhood}</span> : null}
          {role === "host" && !cancelled ? (
            <span className="my-match-cups">
              {" · "}
              {open > 0 ? `${open} hueco${open === 1 ? "" : "s"}` : "completo"}
            </span>
          ) : null}
          {role === "claim" && claim ? (
            <span className="my-match-claim-meta">
              {" · "}
              {claimStatusLabel[claim.status] ?? claim.status}
            </span>
          ) : null}
        </p>

        {feedbackClaims.map((item) => (
          <LevelFeedbackButtons
            key={item.id}
            claimId={item.id}
            aboutLabel={item.profiles?.display_name ?? undefined}
          />
        ))}
        {canFeedbackClaim && claim ? (
          <LevelFeedbackButtons
            claimId={claim.id}
            aboutLabel={match.profiles.display_name}
          />
        ) : null}

        <div className="my-match-actions">
          <Link className="btn-flood" href={`/p/${match.share_code}`}>
            Ver partido
          </Link>
          {canEdit ? (
            <Link className="btn-ghost" href={`/p/${match.share_code}/editar`}>
              Editar
            </Link>
          ) : null}
          {shareHref ? (
            <a className="btn-ghost" href={shareHref} target="_blank" rel="noopener noreferrer">
              Mandar al grupo
            </a>
          ) : null}
          {canEdit ? (
            <form action={cancelMatchAction}>
              <input type="hidden" name="match_id" value={match.id} />
              <input type="hidden" name="share_code" value={match.share_code} />
              <button className="btn-ghost my-match-cancel" type="submit">
                Cancelar
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
