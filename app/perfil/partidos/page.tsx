import type { Metadata } from "next";
import Link from "next/link";
import { MyMatchCard, type MyMatchCardModel } from "@/components/MyMatchCard";
import { requireUserId } from "@/lib/auth";
import { getMyClaimedMatches, getMyHostedMatches, getSubmittedLevelFeedbackClaimIds } from "@/lib/data";
import { isFeedbackWindow } from "@/lib/level-trust";
import { robotsNoIndex } from "@/lib/seo";
import type { ClaimWithPlayer, MatchDetail } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mis partidos",
  robots: robotsNoIndex,
};

type Bucket = "action" | "upcoming" | "history";

/** Cuántos del historial se muestran antes de “Ver más”. */
const HISTORY_PREVIEW = 6;

type Entry = MyMatchCardModel & {
  id: string;
  startsAt: string;
  bucket: Bucket;
};

function acceptedClaimsForFeedback(match: MatchDetail) {
  return match.match_slots.flatMap((slot) =>
    slot.slot_claims.filter((claim) => claim.status === "accepted"),
  );
}

function needsHostFeedback(
  match: MatchDetail,
  now: Date,
  submitted: Set<string>,
): ClaimWithPlayer[] {
  if (match.status === "cancelled") return [];
  if (!isFeedbackWindow(now, match.starts_at, match.duration_min)) return [];
  return acceptedClaimsForFeedback(match).filter((claim) => !submitted.has(claim.id));
}

function claimNeedsFeedback(
  claim: { id: string; status: string },
  match: MatchDetail,
  now: Date,
  submitted: Set<string>,
) {
  return (
    claim.status === "accepted" &&
    match.status !== "cancelled" &&
    isFeedbackWindow(now, match.starts_at, match.duration_min) &&
    !submitted.has(claim.id)
  );
}

function classifyHost(match: MatchDetail, now: Date, nowIso: string, submitted: Set<string>): Entry {
  const feedbackClaims = needsHostFeedback(match, now, submitted);
  const pending =
    match.status !== "cancelled" &&
    match.starts_at > nowIso &&
    match.match_slots.some((slot) => slot.slot_claims.some((c) => c.status === "pending"));
  const pastOrCancelled = match.status === "cancelled" || match.starts_at <= nowIso;
  let bucket: Bucket = "upcoming";
  if (feedbackClaims.length > 0 || pending) bucket = "action";
  else if (pastOrCancelled) bucket = "history";

  return {
    id: `host-${match.id}`,
    role: "host",
    match,
    feedbackClaims,
    startsAt: match.starts_at,
    bucket,
  };
}

function classifyClaim(
  claim: { id: string; status: string },
  match: MatchDetail,
  now: Date,
  nowIso: string,
  submitted: Set<string>,
): Entry {
  const canFeedbackClaim = claimNeedsFeedback(claim, match, now, submitted);
  const pastOrCancelled = match.status === "cancelled" || match.starts_at <= nowIso;
  const waiting = claim.status === "pending" && !pastOrCancelled && match.status !== "cancelled";
  let bucket: Bucket = "upcoming";
  if (canFeedbackClaim || waiting) bucket = "action";
  else if (pastOrCancelled || claim.status === "rejected" || claim.status === "withdrawn") {
    bucket = "history";
  }

  return {
    id: `claim-${claim.id}`,
    role: "claim",
    match,
    claim,
    canFeedbackClaim,
    startsAt: match.starts_at,
    bucket,
  };
}

function sortUpcoming(a: Entry, b: Entry) {
  return a.startsAt.localeCompare(b.startsAt);
}

function sortHistory(a: Entry, b: Entry) {
  return b.startsAt.localeCompare(a.startsAt);
}

export default async function MisPartidosPage() {
  const { userId } = await requireUserId("/perfil/partidos");
  const [hosted, claimed] = await Promise.all([getMyHostedMatches(userId), getMyClaimedMatches(userId)]);
  const now = new Date();
  const nowIso = now.toISOString();

  const feedbackCandidateIds: string[] = [];
  for (const match of hosted) {
    for (const claim of needsHostFeedback(match, now, new Set())) {
      feedbackCandidateIds.push(claim.id);
    }
  }
  for (const { claim, match } of claimed) {
    if (claimNeedsFeedback(claim, match, now, new Set())) {
      feedbackCandidateIds.push(claim.id);
    }
  }

  const submittedFeedback = await getSubmittedLevelFeedbackClaimIds(userId, [
    ...new Set(feedbackCandidateIds),
  ]);

  const hostedIds = new Set(hosted.map((m) => m.id));
  const entries: Entry[] = [
    ...hosted.map((match) => classifyHost(match, now, nowIso, submittedFeedback)),
    ...claimed
      .filter(({ match }) => !hostedIds.has(match.id))
      .map(({ claim, match }) => classifyClaim(claim, match, now, nowIso, submittedFeedback)),
  ];

  const action = entries.filter((e) => e.bucket === "action").sort(sortUpcoming);
  const upcoming = entries.filter((e) => e.bucket === "upcoming").sort(sortUpcoming);
  const history = entries.filter((e) => e.bucket === "history").sort(sortHistory);
  const historyPreview = history.slice(0, HISTORY_PREVIEW);
  const historyRest = history.slice(HISTORY_PREVIEW);
  const empty = entries.length === 0;

  return (
    <main className="page page-my-matches my-matches-page" id="main">
      <header className="page-head my-matches-head">
        <p className="my-matches-kicker">Tu bitácora</p>
        <h1>Mis partidos</h1>
        <p>
          Huecos que publicaste y cupos que pediste.{" "}
          <Link href="/perfil">Volver al perfil</Link>
        </p>
        <div className="my-matches-quick">
          <Link className="btn-flood" href="/partidos/nuevo">
            Publicar hueco
          </Link>
          <Link className="btn-ghost" href="/partidos">
            Ver radar
          </Link>
        </div>
      </header>

      {empty ? (
        <p className="empty my-matches-empty">
          Todavía no tenés movimientos. Publicá un hueco o metete a una pateada del radar.
        </p>
      ) : null}

      {action.length > 0 ? (
        <section className="my-matches-section my-matches-section-action" aria-labelledby="my-matches-action">
          <div className="my-matches-section-head">
            <h2 className="subhead" id="my-matches-action">
              Te toca algo
            </h2>
            <p className="my-matches-section-copy">
              Pedidos por revisar o feedback de nivel después de la pateada.
            </p>
          </div>
          <ul className="my-matches-list my-matches-list-action">
            {action.map((entry) => (
              <li key={entry.id}>
                <MyMatchCard {...entry} nowIso={nowIso} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="my-matches-section" aria-labelledby="my-matches-upcoming">
        <div className="my-matches-section-head">
          <h2 className="subhead" id="my-matches-upcoming">
            Próximas pateadas
          </h2>
          <p className="my-matches-section-copy">Lo que viene: organizás o vas de jugador.</p>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty">
            {action.length > 0 ? (
              <>No hay más en la agenda: lo urgente está arriba.</>
            ) : (
              <>
                Nada en la agenda. <Link href="/partidos">Buscá un hueco</Link>
              </>
            )}
          </p>
        ) : (
          <ul className="my-matches-list my-matches-grid">
            {upcoming.map((entry) => (
              <li key={entry.id}>
                <MyMatchCard {...entry} nowIso={nowIso} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="my-matches-section" aria-labelledby="my-matches-history">
        <div className="my-matches-section-head">
          <h2 className="subhead" id="my-matches-history">
            Ya jugaron
          </h2>
          <p className="my-matches-section-copy">Historial reciente, cancelados y pedidos cerrados.</p>
        </div>
        {history.length === 0 ? (
          <p className="empty">Todavía no hay historial.</p>
        ) : (
          <>
            <ul className="my-matches-list my-matches-grid">
              {historyPreview.map((entry) => (
                <li key={entry.id}>
                  <MyMatchCard {...entry} nowIso={nowIso} />
                </li>
              ))}
            </ul>
            {historyRest.length > 0 ? (
              <details className="my-matches-more">
                <summary className="my-matches-more-toggle">
                  Ver {historyRest.length} más del historial
                </summary>
                <ul className="my-matches-list my-matches-grid">
                  {historyRest.map((entry) => (
                    <li key={entry.id}>
                      <MyMatchCard {...entry} nowIso={nowIso} />
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
