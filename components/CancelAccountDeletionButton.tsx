"use client";

import { useActionState } from "react";
import { cancelAccountDeletionAction } from "@/app/perfil/actions";

type State = { error?: string } | null;

export function CancelAccountDeletionButton() {
  const [state, action, pending] = useActionState(
    async (_prev: State) => cancelAccountDeletionAction(),
    null,
  );

  return (
    <form action={action}>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn-ghost account-deletion-banner-btn" disabled={pending}>
        {pending ? "Guardando…" : "Mantener mi cuenta"}
      </button>
    </form>
  );
}
