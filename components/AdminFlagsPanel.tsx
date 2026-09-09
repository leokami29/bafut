"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setFeatureFlagAction,
  type AdminActionState,
} from "@/app/admin/premium/actions";
import type { FeatureFlagKey } from "@/lib/feature-flags";

export type AdminFlagRow = {
  key: FeatureFlagKey | string;
  enabled: boolean;
  description: string | null;
  updated_at: string;
  /** Valor efectivo si hay override FEATURE_* en env. */
  envOverride: boolean | null;
};

type Props = {
  flags: AdminFlagRow[];
  canEdit: boolean;
};

export function AdminFlagsPanel({ flags, canEdit }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    setFeatureFlagAction,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <div className="admin-flags-panel">
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.ok ? <p className="form-ok">Flag actualizado.</p> : null}

      <ul className="admin-flag-list">
        {flags.map((flag) => {
          const lockedByEnv = flag.envOverride !== null;
          const effective = lockedByEnv ? flag.envOverride! : flag.enabled;
          return (
            <li key={flag.key} className="admin-flag-row">
              <div className="admin-flag-main">
                <strong className="admin-flag-key">{flag.key}</strong>
                <span className="admin-flag-desc">
                  {flag.description ?? "Sin descripción."}
                </span>
                {lockedByEnv ? (
                  <span className="field-help">
                    Override por env FEATURE_* = {effective ? "ON" : "OFF"} (la DB no manda
                    hasta quitar el env y reiniciar).
                  </span>
                ) : null}
              </div>
              <div className="admin-flag-actions">
                <span className={`badge ${effective ? "verified" : ""}`}>
                  {effective ? "ON" : "OFF"}
                </span>
                {canEdit && !lockedByEnv ? (
                  <form action={action}>
                    <input type="hidden" name="key" value={flag.key} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={flag.enabled ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className={flag.enabled ? "btn-ghost" : "btn-flood"}
                      disabled={pending}
                      onClick={(e) => {
                        if (
                          flag.key === "venue_tournaments" &&
                          flag.enabled &&
                          !window.confirm(
                            "¿Apagar torneos en toda la plataforma? Las canchas Premium dejarán de poder administrar torneos.",
                          )
                        ) {
                          e.preventDefault();
                        }
                      }}
                    >
                      {flag.enabled ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
