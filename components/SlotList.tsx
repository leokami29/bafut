"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  claimSlotAction,
  getMatchContactAction,
  respondClaimAction,
  withdrawClaimAction,
} from "@/app/actions";
import { levelLabel, positionLabel } from "@/lib/labels";
import type { Level, Position } from "@/lib/constants";
import { slotIsOpen, type SlotWithClaims } from "@/lib/types";
import { whatsappChatHref } from "@/lib/whatsapp-contact";

type ClaimState = { error?: string; ok?: boolean } | null;

export function SlotList({
  slots,
  shareCode,
  isHost,
  userId,
  matchCancelled = false,
}: {
  slots: SlotWithClaims[];
  shareCode: string;
  isHost: boolean;
  userId: string | null;
  matchCancelled?: boolean;
}) {
  return (
    <ol className="slot-list">
      {slots.map((slot, index) => (
        <SlotRow
          key={slot.id}
          slot={slot}
          index={index}
          shareCode={shareCode}
          isHost={isHost}
          userId={userId}
          matchCancelled={matchCancelled}
        />
      ))}
    </ol>
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
}: {
  slot: SlotWithClaims;
  index: number;
  shareCode: string;
  isHost: boolean;
  userId: string | null;
  matchCancelled: boolean;
}) {
  const [claimState, claimAction, claimPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => claimSlotAction(formData),
    null,
  );
  const [respondState, respondAction, respondPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => respondClaimAction(formData),
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
        <form action={claimAction}>
          <input type="hidden" name="slot_id" value={slot.id} />
          <input type="hidden" name="share_code" value={shareCode} />
          <button className="btn-bib" type="submit" disabled={claimPending}>
            {claimPending ? "Pidiendo…" : "Pedir el cupo"}
          </button>
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
            {pending.map((claim) => (
              <li key={claim.id}>
                <span className="claim-name">{claim.profiles?.display_name ?? "Jugador"}</span>
                <div className="claim-actions">
                  <form action={respondAction}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <input type="hidden" name="share_code" value={shareCode} />
                    <button className="btn-bib" name="status" value="accepted" type="submit" disabled={respondPending}>
                      Confirmar
                    </button>
                  </form>
                  <form action={respondAction}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <input type="hidden" name="share_code" value={shareCode} />
                    <button className="btn-ghost" name="status" value="rejected" type="submit" disabled={respondPending}>
                      No
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
