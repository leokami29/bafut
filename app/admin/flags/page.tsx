import type { Metadata } from "next";
import Link from "next/link";
import { AdminFlagsPanel } from "@/components/AdminFlagsPanel";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { getAdminRole, isBillingAdmin } from "@/lib/admin-auth";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts } from "@/lib/admin-queues";
import { getIsAdmin } from "@/lib/data";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_ENV,
  parseFeatureEnv,
} from "@/lib/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Feature flags",
  robots: robotsNoIndex,
};

export default async function AdminFlagsPage() {
  const { userId } = await requireUserId("/admin/flags");

  if (!(await getIsAdmin(userId))) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos de administrador.</p>
          <p className="foot-link">
            <Link href="/">Volver al inicio</Link>
          </p>
        </header>
      </main>
    );
  }

  const role = await getAdminRole(userId);
  const canEdit = isBillingAdmin(role);
  const counts = await getAdminQueueCounts();
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("feature_flags")
    .select("key, enabled, description, updated_at")
    .order("key", { ascending: true });

  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));
  const flags: Array<{
    key: string;
    enabled: boolean;
    description: string | null;
    updated_at: string;
    envOverride: boolean | null;
  }> = FEATURE_FLAG_KEYS.map((key) => {
    const row = byKey.get(key);
    return {
      key,
      enabled: row?.enabled ?? false,
      description: row?.description ?? null,
      updated_at: row?.updated_at ?? new Date(0).toISOString(),
      envOverride: parseFeatureEnv(process.env[FEATURE_FLAG_ENV[key]]),
    };
  });

  // Incluir flags DB extra no tipados
  for (const row of rows ?? []) {
    if (!(FEATURE_FLAG_KEYS as readonly string[]).includes(row.key)) {
      flags.push({
        key: row.key,
        enabled: row.enabled,
        description: row.description,
        updated_at: row.updated_at,
        envOverride: null,
      });
    }
  }

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />

      <header className="page-head page-head-compact">
        <p className="eyebrow">Plataforma · kill-switch</p>
        <h1>Feature flags</h1>
        <p className="lede">
          El flag <code>venue_tournaments</code> apaga o prende torneos en toda BaFut. Cada
          cancha además necesita Premium activo. Solo billing/super pueden cambiarlos.
        </p>
      </header>

      {!canEdit ? (
        <p className="form-error">
          Tu rol ({role ?? "—"}) solo puede ver flags. Pedí billing o super para togglear.
        </p>
      ) : null}

      {error ? (
        <p className="form-error">Error cargando flags: {error.message}</p>
      ) : (
        <AdminFlagsPanel flags={flags} canEdit={canEdit} />
      )}

      <p className="admin-quiet-links">
        <Link href="/admin/premium">Consola Premium</Link>
        {" · "}
        <Link href="/admin">Volver a la mesa</Link>
      </p>
    </main>
  );
}
