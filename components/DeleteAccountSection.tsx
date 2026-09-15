"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/app/perfil/actions";
import {
  DELETE_ACCOUNT_CONFIRMATION,
  isDeleteAccountConfirmation,
} from "@/lib/delete-account-confirmation";

type State = { error?: string } | null;

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData) => deleteAccountAction(formData),
    null,
  );

  const canSubmit =
    acknowledged && isDeleteAccountConfirmation(confirmText) && !pending;

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
            Eliminar cuenta
          </button>
          <span className="perfil-danger-quiet-hint"> · permanente</span>
        </p>
      ) : (
        <div id="perfil-danger-panel">
          <p className="perfil-danger-eyebrow">Zona de riesgo</p>
          <p className="perfil-danger-title" aria-hidden="true">
            Eliminar cuenta
          </p>
          <p className="perfil-danger-lede">
            Se borra tu perfil, foto, WhatsApp, carta pública, cupos pedidos, reservas de cancha,
            alertas, templates de partido y votos de confianza de nivel. Los partidos que organizaste
            desaparecen del feed. Si abriste el lado rival en partidos ajenos, esos cupos se quitan.
            Las canchas a tu nombre siguen en el directorio, pero sin dueño vinculado a esta cuenta.
            No hay forma de recuperar nada: es permanente.
          </p>

          <form action={action} className="perfil-danger-form">
            <label className="perfil-danger-check">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
              />
              <span>Entiendo que se borran mis datos y que no hay vuelta atrás.</span>
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

            {state?.error ? (
              <p className="form-error" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="perfil-danger-actions">
              <button
                type="button"
                className="btn-ghost"
                disabled={pending}
                onClick={() => {
                  setOpen(false);
                  setConfirmText("");
                  setAcknowledged(false);
                }}
              >
                Cancelar
              </button>
              <button type="submit" className="btn-bib" disabled={!canSubmit}>
                {pending ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
