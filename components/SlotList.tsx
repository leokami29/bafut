"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  claimSlotAction,
  getMatchContactAction,
  respondClaimAction,
  withdrawClaimAction,
} from "@/app/actions";
import { trackEvent } from "@/lib/analytics";
import { levelLabel, positionLabel } from "@/lib/labels";
import type { Level, Position } from "@/lib/constants";
import {
  DECLARED_LEVELS,
  defaultDeclaredLevel,
  isMismatch,
  type DeclaredLevel,
} from "@/lib/level-trust";
import { slotIsOpen, type SlotWithClaims } from "@/lib/types";
import { whatsappChatHref } from "@/lib/whatsapp-contact";

type ClaimState = { error?: string; ok?: boolean } | null;

export function SlotList({
  slots,
  shareCode,
  isHost,
  userId,
  matchCancelled = false,
  profileLevel = null,
  showSides = false,
}: {
  slots: SlotWithClaims[];
  shareCode: string;
  isHost: boolean;
  userId: string | null;
  matchCancelled?: boolean;
  profileLevel?: string | null;
  showSides?: boolean;
}) {
  const ordered = [...slots].sort((a, b) => {
    const sideA = a.side === "b" ? 1 : 0;
    const sideB = b.side === "b" ? 1 : 0;
    if (sideA !== sideB) return sideA - sideB;
    return a.created_at.localeCompare(b.created_at);
  });
  const sideA = ordered.filter((slot) => slot.side !== "b");
  const sideB = ordered.filter((slot) => slot.side === "b");

  if (!showSides || sideB.length === 0) {
    return (
      <ol className="slot-list">
        {ordered.map((slot, index) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            index={index}
            shareCode={shareCode}
            isHost={isHost}
            userId={userId}
            matchCancelled={matchCancelled}
            profileLevel={profileLevel}
          />
        ))}
      </ol>
    );
  }

  return (
    <div className="slot-sides">
      <section className="slot-side-block" aria-labelledby="slot-side-a">
        <h3 className="slot-side-heading" id="slot-side-a">
          Con ellos
        </h3>
        <p className="slot-side-hint">Pedí cupo acá si vas en ese mismo equipo.</p>
        <ol className="slot-list">
          {sideA.map((slot, index) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              index={index}
              shareCode={shareCode}
              isHost={isHost}
              userId={userId}
              matchCancelled={matchCancelled}
              profileLevel={profileLevel}
            />
          ))}
        </ol>
      </section>
      <section className="slot-side-block is-away" aria-labelledby="slot-side-b">
        <h3 className="slot-side-heading" id="slot-side-b">
          En contra
        </h3>
        <p className="slot-side-hint">Misma cancha y hora · el rival de la pateada.</p>
        <ol className="slot-list">
          {sideB.map((slot, index) => (
            <SlotRow
              key={slot.id}
              slot={slot}
              index={index}
              shareCode={shareCode}
              isHost={isHost}
              userId={userId}
              matchCancelled={matchCancelled}
              profileLevel={profileLevel}
            />
          ))}
        </ol>
      </section>
    </div>
  );
}

function ContactLink({ claimId, label }: { claimId: string; label: string }) {
  const [href, setHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getMatchContactAction(claimId);
      if ("whatsapp" in result && result.whatsapp) {
        setHref(
          whatsappChatHref(
            result.whatsapp,
            `Hola ${result.displayName}, nos confirmamos el cupo en BaFut.`,
          ),
        );
      } else {
        setError(result.error ?? "Sin WhatsApp");
      }
    });
  }, [claimId]);

  if (href) {
    return (
      <a className="btn-bib" href={href} target="_blank" rel="noopener noreferrer">
        WhatsApp a {label}
      </a>
    );
  }
  if (error) {
    return <p className="form-error">{error}</p>;
  }
  return <p className="slot-mine">{pending ? "Cargando WhatsApp…" : "…"}</p>;
}

function SlotRow({
  slot,
  index,
  shareCode,
  isHost,
  userId,
  matchCancelled,
  profileLevel,
}: {
  slot: SlotWithClaims;
  index: number;
  shareCode: string;
  isHost: boolean;
  userId: string | null;
  matchCancelled: boolean;
  profileLevel: string | null;
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

  const open = slotIsOpen(slot) && !matchCancelled;
  const accepted = slot.slot_claims.find((claim) => claim.status === "accepted");
  const mine = slot.slot_claims.find((claim) => claim.player_id === userId);
  const pending = slot.slot_claims.filter((claim) => claim.status === "pending");

  return (
    <li className={`slot-row ${open ? "is-open" : "is-filled"}`}>
      <div>
        <p className="slot-index">Cupo {index + 1}</p>
        <p className="slot-need">
          {positionLabel[slot.position as Position] ?? slot.position} ·{" "}
          {levelLabel[slot.level as Level] ?? slot.level}
        </p>
        {accepted ? <p className="slot-filled">Entra {accepted.profiles?.display_name}</p> : null}
        {mine && !accepted ? (
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

      {open && !isHost && !mine && userId ? (
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
            {claimPending ? "Pidiendo…" : "Pedir cupo"}
          </button>
          <small className="slot-reassurance">Sin pago — el host confirma</small>
        </form>
      ) : null}

      {open && !isHost && !mine && !userId ? (
        <a className="btn-bib" href={`/entrar?next=/p/${shareCode}`}>
          Entra para pedir
        </a>
      ) : null}

      {mine?.status === "pending" && !isHost ? (
        <form action={withdrawAction}>
          <input type="hidden" name="claim_id" value={mine.id} />
          <input type="hidden" name="share_code" value={shareCode} />
          <button className="btn-ghost" type="submit" disabled={withdrawPending}>
            {withdrawPending ? "Retirando…" : "Retirar pedido"}
          </button>
        </form>
      ) : null}

      {accepted && !matchCancelled && userId && (isHost || mine?.id === accepted.id) ? (
        <ContactLink
          claimId={accepted.id}
          label={isHost ? (accepted.profiles?.display_name ?? "jugador") : "host"}
        />
      ) : null}

      {isHost && !matchCancelled && pending.length > 0 ? (
        <div className="claim-inbox-wrap">
          <p className="claim-inbox-label">Piden cupo:</p>
          <ul className="claim-inbox">
            {pending.map((claim) => {
              const declaredLabel =
                levelLabel[claim.declared_level as Level] ?? claim.declared_level;
              const slotLabel = levelLabel[slot.level as Level] ?? slot.level;
              const claimMismatch = isMismatch(slot.level, claim.declared_level);
              return (
                <li key={claim.id}>
                  <span className="claim-name">{claim.profiles?.display_name ?? "Jugador"}</span>
                  <p className="claim-level-meta">
                    declarado {declaredLabel} · hueco {slotLabel}
                    {claimMismatch ? " · si no cierra, rechaza" : ""}
                  </p>
                  <div className="claim-actions">
                    <form action={respondAction}>
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
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
