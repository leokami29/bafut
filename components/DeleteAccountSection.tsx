"use client";

import { useActionState, useState } from "react";
import {
  cancelAccountDeletionAction,
  scheduleAccountDeletionAction,
} from "@/app/perfil/actions";
import {
  ACCOUNT_PURGE_DAYS,
  canCancelAccountDeletion,
  formatPurgeDate,
  type AccountDeletionFields,
} from "@/lib/account-deletion";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  isDeleteAccountConfirmation,
} from "@/lib/delete-account-confirmation";

type State = { error?: string } | null;

type Props = Pick<AccountDeletionFields, "deletion_scheduled_at" | "purge_at" | "deleted_at">;

export function DeleteAccountSection({ deletion_scheduled_at, purge_at, deleted_at }: Props) {
  const scheduled = canCancelAccountDeletion({
    deletion_scheduled_at,
    purge_at,
    deleted_at,
  });
  const [open, setOpen] = useState(scheduled);
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    async (_prev: State, formData: FormData) => scheduleAccountDeletionAction(formData),
    null,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    async (_prev: State) => cancelAccountDeletionAction(),
    null,
  );

  const canSubmitSchedule =
    acknowledged && isDeleteAccountConfirmation(confirmText) && !schedulePending;

  const purgeLabel = purge_at ? formatPurgeDate(purge_at) : null;

  return (
    <section className={`perfil-danger${open ? " is-open" : ""}`}>
      <h2 id="perfil-danger-title" className="sr-only">
        Eliminar cuenta
      </h2>
      {!open ? (
        <p className="perfil-danger-quiet">
          <button
            type="button"
            className="perfil-danger-quiet-link"
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls="perfil-danger-panel"
          >
            {scheduled ? "Eliminación programada" : "Eliminar cuenta"}
          </button>
          <span className="perfil-danger-quiet-hint">
            {scheduled && purgeLabel ? ` · se elimina el ${purgeLabel}` : ` · ${ACCOUNT_PURGE_DAYS} días de gracia`}
          </span>
        </p>
      ) : (
        <div id="perfil-danger-panel">
          <p className="perfil-danger-eyebrow">Zona de riesgo</p>
          <p className="perfil-danger-title" aria-hidden="true">
            {scheduled ? "Eliminación programada" : "Eliminar cuenta"}
          </p>
          {scheduled && purgeLabel ? (
            <>
              <p className="perfil-danger-lede">
                Tu cuenta se eliminará el <strong>{purgeLabel}</strong>. Hasta entonces podés seguir
                jugando, organizando partidos y gestionando canchas con normalidad. Si cambiás de
                opinión, podés mantener tu cuenta antes de esa fecha.
              </p>
              <form action={cancelAction} className="perfil-danger-form">
                {cancelState?.error ? (
                  <p className="form-error" role="alert">
                    {cancelState.error}
                  </p>
                ) : null}
                <div className="perfil-danger-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={cancelPending}
                    onClick={() => setOpen(false)}
                  >
                    Cerrar
                  </button>
                  <button type="submit" className="btn-bib" disabled={cancelPending}>
                    {cancelPending ? "Guardando…" : "Mantener mi cuenta"}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p className="perfil-danger-lede">
                Programamos la eliminación con {ACCOUNT_PURGE_DAYS} días de gracia. Durante ese plazo
                tu cuenta sigue activa: podés cancelar cuando quieras. Al vencer, anonimizamos tu
                ficha, cancelamos partidos futuros que organices, liberamos canchas a tu nombre y
                borramos tu acceso. El historial visible para otros (cupos confirmados, partidos
                pasados) se conserva como &quot;Jugador eliminado&quot;. Si más adelante creás otra
                cuenta con el mismo correo, no recuperás el historial anterior.
              </p>

              <form action={scheduleAction} className="perfil-danger-form">
                <label className="perfil-danger-check">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                  />
                  <span>
                    Entiendo el plazo de {ACCOUNT_PURGE_DAYS} días y que la eliminación definitiva
                    es irreversible una vez vencido.
                  </span>
                </label>

                <label className="perfil-danger-confirm">
                  Escribí <strong>{DELETE_ACCOUNT_CONFIRMATION}</strong> para continuar
                  <input
                    type="text"
                    name="confirm"
                    autoComplete="off"
                    spellCheck={false}
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    placeholder={DELETE_ACCOUNT_CONFIRMATION}
                    aria-describedby="perfil-danger-confirm-hint"
                  />
                </label>
                <p id="perfil-danger-confirm-hint" className="perfil-danger-hint">
                  Mayúsculas exactas, sin comillas.
                </p>

                {scheduleState?.error ? (
                  <p className="form-error" role="alert">
                    {scheduleState.error}
                  </p>
                ) : null}

                <div className="perfil-danger-actions">
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={schedulePending}
                    onClick={() => {
                      setOpen(false);
                      setConfirmText("");
                      setAcknowledged(false);
                    }}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-bib" disabled={!canSubmitSchedule}>
                    {schedulePending ? "Programando…" : "Solicitar eliminación de cuenta"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </section>
  );
}
