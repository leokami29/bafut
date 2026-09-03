"use client";

import { useActionState } from "react";
import { submitLevelFeedbackAction } from "@/app/actions";

type FeedbackState = { error?: string; ok?: boolean } | null;

export function LevelFeedbackButtons({
  claimId,
  aboutLabel,
}: {
  claimId: string;
  aboutLabel?: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: FeedbackState, formData: FormData) => submitLevelFeedbackAction(formData),
    null,
  );

  if (state?.ok) {
    return <p className="form-ok">Gracias por el feedback.</p>;
  }

  return (
    <div className="level-feedback">
      <p className="level-feedback-prompt">
        ¿El nivel encajó{aboutLabel ? ` con ${aboutLabel}` : ""}?
      </p>
      <div className="level-feedback-actions">
        <form action={action}>
          <input type="hidden" name="claim_id" value={claimId} />
          <button className="btn-bib" name="level_ok" value="true" type="submit" disabled={pending}>
            Sí
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="claim_id" value={claimId} />
          <button className="btn-ghost" name="level_ok" value="false" type="submit" disabled={pending}>
            No
          </button>
        </form>
      </div>
      {state?.error ? <p className="form-error">{state.error}</p> : null}
    </div>
  );
}
