import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { runPurgeDeletedAccountsCron } from "@/lib/purge-deleted-accounts-cron";
import { SERVICE_ROLE_CONFIG_ERROR, tryCreateServiceClient } from "@/lib/supabase/admin";

/**
 * Cron diario: purga cuentas con purge_at vencido.
 *
 * Nota: en despliegue split, `proxy.ts` redirige `/api/cron/*` a BaFut_Admin.
 * Replicá esta ruta allí o apuntá el cron a la URL de ops con el mismo CRON_SECRET.
 */
export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  if (!tryCreateServiceClient()) {
    return NextResponse.json({ error: SERVICE_ROLE_CONFIG_ERROR }, { status: 503 });
  }

  try {
    const result = await runPurgeDeletedAccountsCron();
    return NextResponse.json({
      ok: true,
      purged: result.purged,
      auth_deleted: result.authDeleted,
      auth_errors: result.authErrors.length,
    });
  } catch (err) {
    console.error("purge-deleted-accounts cron", err);
    return NextResponse.json({ error: "purge_failed" }, { status: 500 });
  }
}
