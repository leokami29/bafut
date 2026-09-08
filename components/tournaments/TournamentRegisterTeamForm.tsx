"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  registerParticipantAction,
  type TournamentActionResult,
} from "@/app/canchas/[slug]/admin/torneos/actions";

type State = TournamentActionResult | null;

type Props = {
  slug: string;
  tournamentId: string;
  disabled?: boolean;
};

export function TournamentRegisterTeamForm({
  slug,
  tournamentId,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (_prev: State, formData: FormData): Promise<State> => {
      const name = String(formData.get("name") ?? "").trim();
      const seedRaw = String(formData.get("seed") ?? "").trim();
      const seed = seedRaw ? Number(seedRaw) : null;

      const result = await registerParticipantAction(slug, {
        tournamentId,
        name,
        seed: seed != null && Number.isFinite(seed) ? seed : null,
      });
      if (result.ok) router.refresh();
      return result;
    },
    null,
  );

  const busy = pending || disabled;

  return (
    <form action={action} className="stack-form tournament-form">
      <div className="form-split tournament-form-split">
        <label>
          Nombre del equipo
          <input
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="Los Tigres"
            disabled={busy}
          />
        </label>
        <label>
          Seed (opcional)
          <input
            name="seed"
            type="number"
            min={1}
            max={32}
            placeholder="1"
            disabled={busy}
          />
        </label>
      </div>

      <button type="submit" className="btn-flood" disabled={busy}>
        {pending ? "Inscribiendo…" : "Inscribir equipo"}
      </button>

      {state?.ok === false ? <p className="form-error">{state.error}</p> : null}
      {state?.ok === true ? <p className="form-ok">Equipo inscrito.</p> : null}
    </form>
  );
}
