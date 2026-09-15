"use client";

import { useActionState, useEffect, useOptimistic, useState } from "react";
import { useReducedMotion } from "motion/react";
import { claimSlotAction, respondClaimAction, withdrawClaimAction } from "@/app/actions";
import { ClaimPlayerPreview } from "@/components/ClaimPlayerPreview";
import { MatchContactButton, MatchContactsProvider } from "@/components/MatchContactButton";
import { trackEvent } from "@/lib/analytics";
import { levelLabel, positionLabel } from "@/lib/labels";
import type { Level, Position } from "@/lib/constants";
import {
  canShowPendingContact,
  joinedClaimStorageKey,
  joinedSlotStorageKey,
  listVisibleMatchContactEdges,
  matchContactButtonLabel,
  matchSideModerator,
  type MatchContactEdge,
  type MatchContactRelation,
} from "@/lib/match-contacts";
import {
  DECLARED_LEVELS,
  defaultDeclaredLevel,
  isMismatch,
  type DeclaredLevel,
} from "@/lib/level-trust";
import { slotIsOpen, type SlotWithClaims } from "@/lib/types";

type ClaimState = { error?: string; ok?: boolean } | null;

type OptimisticAccept = {
  claimId: string;
  slotId: string;
  displayName: string;
};

function applyAcceptOptimistic(
  current: SlotWithClaims[],
  update: OptimisticAccept,
): SlotWithClaims[] {
  return current.map((slot) => {
    if (slot.id !== update.slotId) return slot;
    return {
      ...slot,
      slot_claims: slot.slot_claims.map((claim) =>
        claim.id === update.claimId ? { ...claim, status: "accepted" as const } : claim,
      ),
    };
  });
}

function edgeForUser(
  edges: MatchContactEdge[],
  otherUserId: string | null | undefined,
): MatchContactEdge | undefined {
  if (!otherUserId) return undefined;
  return edges.find((e) => e.otherUserId === otherUserId);
}

export function SlotList({
  slots,
  shareCode,
  matchId,
  hostId,
  isHost,
  userId,
  matchCancelled = false,
  matchPast = false,
  profileLevel = null,
  showSides = false,
  awayOpenedBy = null,
  sideATitle = "Con ellos",
  sideBTitle = "En contra",
  rotationRule = null,
}: {
  slots: SlotWithClaims[];
  shareCode: string;
  matchId: string;
  hostId: string;
  isHost: boolean;
  userId: string | null;
  matchCancelled?: boolean;
  /** Partido ya jugado: sin pedir cupo ni moderar pendientes. */
  matchPast?: boolean;
  profileLevel?: string | null;
  showSides?: boolean;
  awayOpenedBy?: string | null;
  sideATitle?: string;
  sideBTitle?: string;
  rotationRule?: string | null;
}) {
  const readOnly = matchCancelled || matchPast;
  const contactsEnabled = Boolean(userId) && !readOnly;

  const [optimisticSlots, acceptOptimistic] = useOptimistic(slots, applyAcceptOptimistic);

  const ordered = [...optimisticSlots].sort((a, b) => {
    const sideA = a.side === "b" ? 1 : 0;
    const sideB = b.side === "b" ? 1 : 0;
    if (sideA !== sideB) return sideA - sideB;
    return a.created_at.localeCompare(b.created_at);
  });
  const sideA = ordered.filter((slot) => slot.side !== "b");
  const sideB = ordered.filter((slot) => slot.side === "b");

  const contactEdges = listVisibleMatchContactEdges({
    viewerId: userId,
    hostId,
    awayOpenedBy,
    slots: optimisticSlots,
    contactable: contactsEnabled,
  });

  const hostAwayEdge = contactEdges.find((e) => e.relation === "host_away");

  const onConfirmAccept = (update: OptimisticAccept) => {
    try {
      sessionStorage.setItem(joinedClaimStorageKey(update.claimId), "1");
      sessionStorage.setItem(joinedSlotStorageKey(update.slotId), update.displayName);
      window.dispatchEvent(
        new CustomEvent("bafut:slot-joined", {
          detail: { slotId: update.slotId, claimId: update.claimId, name: update.displayName },
        }),
      );
    } catch {
      /* ignore quota / private mode */
    }
    acceptOptimistic(update);
  };

  const rotationBanner = rotationRule ? (
    <p className="slot-rotation-rule">
      <strong>Pacto de juego:</strong> {rotationRule}
    </p>
  ) : null;

  const hostAwayContact =
    hostAwayEdge && contactsEnabled ? (
      <div className="match-contact-host-away">
        <MatchContactButton
          otherUserId={hostAwayEdge.otherUserId}
          relation="host_away"
          label={matchContactButtonLabel("host_away", hostAwayEdge.displayName, {
            viewerIsHost: isHost,
          })}
        />
      </div>
    ) : null;

  const contactPrivacy =
    contactsEnabled && contactEdges.length > 0 ? (
      <p className="match-contact-privacy">
        WhatsApp se abre solo cuando lo pedís; el número no se publica en el partido.
      </p>
    ) : null;

  const rowProps = {
    shareCode,
    hostId,
    isHost,
    userId,
    matchCancelled,
    matchPast,
    readOnly,
    profileLevel,
    awayOpenedBy,
    contactEdges,
    onConfirmAccept,
  };

  const body =
    !showSides || sideB.length === 0 ? (
      <div>
        {rotationBanner}
        {hostAwayContact}
        {contactPrivacy}
        <ol className="slot-list">
          {ordered.map((slot, index) => (
            <SlotRow key={slot.id} slot={slot} index={index} {...rowProps} />
          ))}
        </ol>
      </div>
    ) : (
      <div>
        {rotationBanner}
        {hostAwayContact}
        {contactPrivacy}
        <div className="slot-sides">
          <section className="slot-side-block" aria-labelledby="slot-side-a">
            <h3 className="slot-side-heading" id="slot-side-a">
              {sideATitle}
            </h3>
            <p className="slot-side-hint">
              {matchPast ? "Quién jugó en este equipo." : "Pedí cupo acá si vas en ese mismo equipo."}
            </p>
            <ol className="slot-list">
              {sideA.map((slot, index) => (
                <SlotRow key={slot.id} slot={slot} index={index} {...rowProps} />
              ))}
            </ol>
          </section>
          <section className="slot-side-block is-away" aria-labelledby="slot-side-b">
            <h3 className="slot-side-heading" id="slot-side-b">
              {sideBTitle}
            </h3>
            <p className="slot-side-hint">
              {matchPast
                ? "Quién jugó del otro lado."
                : "Misma cancha y hora · el rival de la pateada."}
            </p>
            <ol className="slot-list">
              {sideB.map((slot, index) => (
                <SlotRow key={slot.id} slot={slot} index={index} {...rowProps} />
              ))}
            </ol>
          </section>
        </div>
      </div>
    );

  return (
    <MatchContactsProvider matchId={matchId} enabled={contactsEnabled}>
      {body}
    </MatchContactsProvider>
  );
}

function useJoinedClaimHighlight(claimId: string | undefined) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [nameBadge, setNameBadge] = useState<string | null>(null);

  useEffect(() => {
    if (!claimId) return;
    let cleared = false;
    try {
      const key = joinedClaimStorageKey(claimId);
      if (!sessionStorage.getItem(key)) return;
      setActive(true);
      const slotKeys = Object.keys(sessionStorage).filter((k) =>
        k.startsWith("bafut:joined-slot:"),
      );
      for (const sk of slotKeys) {
        const n = sessionStorage.getItem(sk);
        if (n) setNameBadge(n);
      }
      const t = window.setTimeout(() => {
        if (cleared) return;
        sessionStorage.removeItem(key);
        setActive(false);
      }, reduceMotion ? 1600 : 1200);
      return () => {
        cleared = true;
        window.clearTimeout(t);
      };
    } catch {
      return;
    }
  }, [claimId, reduceMotion]);

  return { active, reduceMotion: Boolean(reduceMotion), nameBadge };
}

function SlotRow({
  slot,
  index,
  shareCode,
  hostId,
  isHost,
  userId,
  matchCancelled,
  matchPast,
  readOnly,
  profileLevel,
  awayOpenedBy,
  contactEdges,
  onConfirmAccept,
}: {
  slot: SlotWithClaims;
  index: number;
  shareCode: string;
  hostId: string;
  isHost: boolean;
  userId: string | null;
  matchCancelled: boolean;
  matchPast: boolean;
  readOnly: boolean;
  profileLevel: string | null;
  awayOpenedBy?: string | null;
  contactEdges: MatchContactEdge[];
  onConfirmAccept: (update: OptimisticAccept) => void;
}) {
  const [declared, setDeclared] = useState<DeclaredLevel>(() => defaultDeclaredLevel(profileLevel));
  const mismatch = isMismatch(slot.level, declared);

  const [claimState, claimAction, claimPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => {
      trackEvent("claim_slot_clicked");
      if (formData.get("level_ack") === "on") {
        trackEvent("claim_level_mismatch_ack");
      }
      return claimSlotAction(formData);
    },
    null,
  );
  const [respondState, respondAction, respondPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => {
      trackEvent("claim_respond_clicked", { response: String(formData.get("status")) });
      return respondClaimAction(formData);
    },
    null,
  );
  const [withdrawState, withdrawAction, withdrawPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => withdrawClaimAction(formData),
    null,
  );

  const isBench = slot.slot_role === "bench";
  const canModerate =
    isHost || (slot.side === "b" && Boolean(awayOpenedBy) && awayOpenedBy === userId);
  const open = slotIsOpen(slot) && !readOnly;
  const accepted = slot.slot_claims.find((claim) => claim.status === "accepted");
  const mine = slot.slot_claims.find((claim) => claim.player_id === userId);
  const pending = slot.slot_claims.filter((claim) => claim.status === "pending");
  const joined = useJoinedClaimHighlight(accepted?.id);

  const acceptedEdge =
    accepted && !matchCancelled && !matchPast && userId
      ? edgeForUser(contactEdges, accepted.player_id)
      : undefined;
  const showAcceptedContact =
    acceptedEdge &&
    canShowPendingContact(acceptedEdge.relation, "accepted") &&
    // No mostrar host_away duplicado en cada fila; va arriba.
    acceptedEdge.relation !== "host_away";

  const moderatorForSlot = matchSideModerator(slot.side, hostId, awayOpenedBy);
  const myModEdge =
    mine?.status === "accepted" && !matchPast && !matchCancelled
      ? contactEdges.find(
          (e) => e.relation === "my_moderator" && e.otherUserId === moderatorForSlot,
        )
      : undefined;

  return (
    <li
      className={`slot-row ${open ? "is-open" : "is-filled"} ${isBench ? "is-bench-row" : ""} ${joined.active ? "is-just-joined" : ""} ${joined.reduceMotion && joined.active ? "is-joined-reduced" : ""}`}
      data-claim-id={accepted?.id}
      data-slot-id={slot.id}
    >
      <div>
        <p className="slot-index">
          Cupo {index + 1}
          {isBench ? <span className="bench-badge">Rotación / Banca</span> : null}
        </p>
        <p className="slot-need">
          {positionLabel[slot.position as Position] ?? slot.position} ·{" "}
          {levelLabel[slot.level as Level] ?? slot.level}
        </p>
        {accepted ? (
          <div className="slot-filled-block">
            {joined.active && joined.reduceMotion ? (
              <p className="slot-joined-badge" role="status">
                Entra {joined.nameBadge ?? accepted.profiles?.display_name ?? "jugador"}
              </p>
            ) : null}
            <ClaimPlayerPreview
              profile={accepted.profiles}
              slotLevel={slot.level}
              declaredLevel={accepted.declared_level}
              className="slot-accepted-preview"
            />
            {joined.active && !joined.reduceMotion ? (
              <p className="slot-joined-badge" role="status">
                Entra {accepted.profiles?.display_name}
              </p>
            ) : null}
          </div>
        ) : matchPast && !accepted ? (
          <p className="slot-mine">Sin cubrir</p>
        ) : null}
        {mine && !accepted && !matchPast ? (
          <p className="slot-mine">
            {mine.status === "pending"
              ? "Pediste este cupo. Espera confirmación."
              : mine.status === "withdrawn"
                ? "Retiraste el pedido."
                : "No quedó este cupo."}
          </p>
        ) : null}
        <div aria-live="polite">
          {claimState?.ok ? <p className="form-ok">Listo. El host confirma tu cupo.</p> : null}
          {claimState?.error ? <p className="form-error">{claimState.error}</p> : null}
          {respondState?.ok ? <p className="form-ok">Actualizado.</p> : null}
          {respondState?.error ? <p className="form-error">{respondState.error}</p> : null}
          {withdrawState?.ok ? <p className="form-ok">Pedido retirado.</p> : null}
          {withdrawState?.error ? <p className="form-error">{withdrawState.error}</p> : null}
        </div>
      </div>

      {open && !canModerate && !mine && userId ? (
        <form action={claimAction} className="claim-form">
          <input type="hidden" name="slot_id" value={slot.id} />
          <input type="hidden" name="share_code" value={shareCode} />
          <label className="claim-level-field">
            Tu nivel
            <select
              name="declared_level"
              value={declared}
              onChange={(event) => setDeclared(event.target.value as DeclaredLevel)}
            >
              {DECLARED_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {levelLabel[level]}
                </option>
              ))}
            </select>
          </label>
          {mismatch ? (
            <label className="claim-ack">
              <input type="checkbox" name="level_ack" required />
              El hueco pide {levelLabel[slot.level as Level] ?? slot.level}. Confirmo que igual
              quiero pedir.
            </label>
          ) : null}
          <button className="btn-bib" type="submit" disabled={claimPending}>
            {claimPending ? "Pidiendo…" : isBench ? "Pedir cupo en rotación" : "Pedir cupo"}
          </button>
          <small className="slot-reassurance">Sin pago — se confirma en la app</small>
        </form>
      ) : null}

      {open && !canModerate && !mine && !userId ? (
        <a className="btn-bib" href={`/entrar?next=/p/${shareCode}`}>
          Entra para pedir
        </a>
      ) : null}

      {mine?.status === "pending" && !canModerate && !readOnly ? (
        <form action={withdrawAction}>
          <input type="hidden" name="claim_id" value={mine.id} />
          <input type="hidden" name="share_code" value={shareCode} />
          <button className="btn-ghost" type="submit" disabled={withdrawPending}>
            {withdrawPending ? "Retirando…" : "Retirar pedido"}
          </button>
        </form>
      ) : null}

      {showAcceptedContact && acceptedEdge ? (
        <MatchContactButton
          otherUserId={acceptedEdge.otherUserId}
          relation={acceptedEdge.relation}
          label={contactLabelForEdge(acceptedEdge, {
            isHost,
            awayOpenedBy,
            hostId,
          })}
        />
      ) : null}

      {myModEdge && (!showAcceptedContact || acceptedEdge?.otherUserId !== myModEdge.otherUserId) ? (
        <MatchContactButton
          otherUserId={myModEdge.otherUserId}
          relation="my_moderator"
          label={matchContactButtonLabel("my_moderator", myModEdge.displayName, {
            moderatorIsAway: moderatorForSlot === awayOpenedBy,
          })}
        />
      ) : null}

      {canModerate && !readOnly && pending.length > 0 ? (
        <div className="claim-inbox-wrap">
          <p className="claim-inbox-label">Piden cupo:</p>
          <ul className="claim-inbox">
            {pending.map((claim) => {
              const pendingEdge = edgeForUser(contactEdges, claim.player_id);
              const showPendingWa =
                pendingEdge &&
                canShowPendingContact(pendingEdge.relation, "pending");
              return (
                <li key={claim.id}>
                  <ClaimPlayerPreview
                    profile={claim.profiles}
                    slotLevel={slot.level}
                    declaredLevel={claim.declared_level}
                  />
                  <div className="claim-actions">
                    <form
                      action={async (formData) => {
                        const status = String(formData.get("status") ?? "");
                        if (status === "accepted") {
                          onConfirmAccept({
                            claimId: claim.id,
                            slotId: slot.id,
                            displayName: claim.profiles?.display_name?.trim() || "jugador",
                          });
                        }
                        return respondAction(formData);
                      }}
                    >
                      <input type="hidden" name="claim_id" value={claim.id} />
                      <input type="hidden" name="share_code" value={shareCode} />
                      <button
                        className="btn-bib"
                        name="status"
                        value="accepted"
                        type="submit"
                        disabled={respondPending}
                      >
                        Confirmar
                      </button>
                    </form>
                    <form action={respondAction}>
                      <input type="hidden" name="claim_id" value={claim.id} />
                      <input type="hidden" name="share_code" value={shareCode} />
                      <button
                        className="btn-ghost"
                        name="status"
                        value="rejected"
                        type="submit"
                        disabled={respondPending}
                      >
                        No
                      </button>
                    </form>
                  </div>
                  {showPendingWa && pendingEdge ? (
                    <MatchContactButton
                      otherUserId={pendingEdge.otherUserId}
                      relation={pendingEdge.relation}
                      label={matchContactButtonLabel(
                        pendingEdge.relation,
                        claim.profiles?.display_name ?? pendingEdge.displayName,
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function contactLabelForEdge(
  edge: MatchContactEdge,
  ctx: { isHost: boolean; awayOpenedBy?: string | null; hostId: string },
): string {
  const relation = edge.relation as MatchContactRelation;
  return matchContactButtonLabel(relation, edge.displayName, {
    viewerIsHost: ctx.isHost,
    moderatorIsAway: edge.otherUserId === ctx.awayOpenedBy,
  });
}
