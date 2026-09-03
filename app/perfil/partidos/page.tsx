import type { Metadata } from "next";
import Link from "next/link";
import { cancelMatchAction } from "@/app/actions";
import { LevelFeedbackButtons } from "@/components/LevelFeedbackButtons";
import { requireUserId } from "@/lib/auth";
import { getMyClaimedMatches, getMyHostedMatches, getSubmittedLevelFeedbackClaimIds } from "@/lib/data";
import { formatWhen, openSlotsPhrase } from "@/lib/format";
import { isFeedbackWindow } from "@/lib/level-trust";
import { formatLabel, matchStatusLabel, positionLabel, sportLabel } from "@/lib/labels";
import type { Position } from "@/lib/constants";
import { openSlotCount, pendingClaimCountForHost, slotIsOpen, type MatchDetail } from "@/lib/types";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mis partidos",
  robots: robotsNoIndex,
};

function acceptedClaimsForFeedback(match: MatchDetail) {
  return match.match_slots.flatMap((slot) =>
    slot.slot_claims.filter((claim) => claim.status === "accepted"),
  );
}

export default async function MisPartidosPage() {
  const { userId } = await requireUserId("/perfil/partidos");
  const [hosted, claimed] = await Promise.all([getMyHostedMatches(userId), getMyClaimedMatches(userId)]);
  const now = new Date();
  const nowIso = now.toISOString();

  const feedbackCandidateIds: string[] = [];
  for (const match of hosted) {
    if (match.status === "cancelled") continue;
    if (!isFeedbackWindow(now, match.starts_at, match.duration_min)) continue;
    for (const claim of acceptedClaimsForFeedback(match)) {
      feedbackCandidateIds.push(claim.id);
    }
  }
  for (const { claim, match } of claimed) {
    if (claim.status !== "accepted") continue;
    if (match.status === "cancelled") continue;
    if (!isFeedbackWindow(now, match.starts_at, match.duration_min)) continue;
    feedbackCandidateIds.push(claim.id);
  }

  const submittedFeedback = await getSubmittedLevelFeedbackClaimIds(userId, [
    ...new Set(feedbackCandidateIds),
  ]);

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <h1>Mis partidos</h1>
        <p>
          Tus huecos y tus pedidos.{" "}
          <Link href="/perfil">Volver al perfil</Link>
        </p>
      </header>

      <section className="inbox-section">
        <h2 className="subhead">Mis huecos</h2>
        {hosted.length === 0 ? (
          <p className="empty">
            Aún no publicaste. <Link href="/partidos/nuevo">Publicar hueco</Link>
          </p>
        ) : (
          <ul className="inbox-list">
            {hosted.map((match) => {
              const open = openSlotCount(match);
              const pending = pendingClaimCountForHost(match);
              const dominant =
                match.match_slots.find(slotIsOpen)?.position ?? match.match_slots[0]?.position ?? "any";
              const cancelled = match.status === "cancelled";
              const showFeedback =
                !cancelled && isFeedbackWindow(now, match.starts_at, match.duration_min);
              const feedbackClaims = showFeedback
                ? acceptedClaimsForFeedback(match).filter((claim) => !submittedFeedback.has(claim.id))
                : [];
              return (
                <li key={match.id} className="inbox-item">
                  <div>
                    <p className="inbox-title">
                      <Link href={`/p/${match.share_code}`}>
                        {openSlotsPhrase(open, positionLabel[dominant as Position] ?? "Cualquiera")}
                      </Link>
                      {pending > 0 && !cancelled ? (
                        <span className="nav-badge" aria-label={`${pending} pedidos pendientes`}>
                          {pending}
                        </span>
                      ) : null}
                    </p>
                    <p className="inbox-meta">
                      {formatWhen(match.starts_at, match.cities.timezone)} · {match.venues.name} ·{" "}
                      {sportLabel[match.sport as keyof typeof sportLabel] ?? match.sport}{" "}
                      {formatLabel[match.format as keyof typeof formatLabel] ?? match.format} ·{" "}
                      {matchStatusLabel[match.status] ?? match.status}
                    </p>
                    {feedbackClaims.map((claim) => (
                      <LevelFeedbackButtons
                        key={claim.id}
                        claimId={claim.id}
                        aboutLabel={claim.profiles?.display_name ?? undefined}
                      />
                    ))}
                  </div>
                  {!cancelled && match.starts_at > nowIso ? (
                    <div className="inbox-item-actions">
                      <Link className="btn-ghost" href={`/p/${match.share_code}/editar`}>
                        Editar
                      </Link>
                      <form action={cancelMatchAction}>
                        <input type="hidden" name="match_id" value={match.id} />
                        <input type="hidden" name="share_code" value={match.share_code} />
                        <button className="btn-ghost" type="submit">
                          Cancelar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="inbox-section">
        <h2 className="subhead">Mis pedidos</h2>
        {claimed.length === 0 ? (
          <p className="empty">
            Todavía no pediste cupo. <Link href="/partidos">Ver partidos</Link>
          </p>
        ) : (
          <ul className="inbox-list">
            {claimed.map(({ claim, match }) => {
              const canFeedback =
                claim.status === "accepted" &&
                match.status !== "cancelled" &&
                isFeedbackWindow(now, match.starts_at, match.duration_min) &&
                !submittedFeedback.has(claim.id);
              return (
                <li key={claim.id} className="inbox-item">
                  <div>
                    <p className="inbox-title">
                      <Link href={`/p/${match.share_code}`}>{match.venues.name}</Link>
                    </p>
                    <p className="inbox-meta">
                      {formatWhen(match.starts_at, match.cities.timezone)} · pedido {claim.status}
                      {match.status === "cancelled" ? " · partido cancelado" : ""}
                    </p>
                    {canFeedback ? (
                      <LevelFeedbackButtons
                        claimId={claim.id}
                        aboutLabel={match.profiles.display_name}
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
