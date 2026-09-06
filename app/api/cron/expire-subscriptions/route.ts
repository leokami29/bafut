import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Cron diario: venue_subscriptions active → expired si expires_at < now().
 *
 * Protegido con CRON_SECRET (Bearer). Respuesta sin PII (solo conteo).
 */
export async function GET(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("expire_venue_subscriptions");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    expired: data ?? 0,
  });
}
