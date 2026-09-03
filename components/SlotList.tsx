"use client";

import { useActionState } from "react";
import { claimSlotAction, respondClaimAction } from "@/app/actions";
import { levelLabel, positionLabel } from "@/lib/labels";
import type { Level, Position } from "@/lib/constants";
import { slotIsOpen, type SlotWithClaims } from "@/lib/types";

type ClaimState = { error?: string; ok?: boolean } | null;

export function SlotList({
  slots,
  shareCode,
  isHost,
  userId,
}: {
  slots: SlotWithClaims[];
  shareCode: string;
  isHost: boolean;
  userId: string | null;
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
        />
      ))}
    </ol>
  );
}

function SlotRow({
  slot,
  index,
  shareCode,
  isHost,
  userId,
}: {
  slot: SlotWithClaims;
  index: number;
  shareCode: string;
  isHost: boolean;
  userId: string | null;
}) {
  const [claimState, claimAction, claimPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => claimSlotAction(formData),
    null,
  );
  const [respondState, respondAction, respondPending] = useActionState(
    async (_prev: ClaimState, formData: FormData) => respondClaimAction(formData),
    null,
  );

  const open = slotIsOpen(slot);
  const accepted = slot.slot_claims.find((claim) => claim.status === "accepted");
  const mine = slot.slot_claims.find((claim) => claim.player_id === userId);
  const pending = slot.slot_claims.filter((claim) => claim.status === "pending");

  return (
    <li className={`slot-row ${open ? "is-open" : "is-filled"}`}>
      <div>
        <p className="slot-index">Cupo {index + 1}</p>
        <p className="slot-need">
          {positionLabel[slot.position as Position]} · {levelLabel[slot.level as Level]}
        </p>
        {accepted ? <p className="slot-filled">Entra {accepted.profiles?.display_name}</p> : null}
        {mine && !accepted ? (
          <p className="slot-mine">
            {mine.status === "pending" ? "Pediste este cupo. Espera confirmación." : "No quedó este cupo."}
          </p>
        ) : null}
        <div aria-live="polite">
          {claimState?.ok ? <p className="form-ok">Listo. El host confirma tu cupo.</p> : null}
          {claimState?.error ? <p className="form-error">{claimState.error}</p> : null}
          {respondState?.ok ? <p className="form-ok">Actualizado.</p> : null}
          {respondState?.error ? <p className="form-error">{respondState.error}</p> : null}
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

      {isHost && pending.length > 0 ? (
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
