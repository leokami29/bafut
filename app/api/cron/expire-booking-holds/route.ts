import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Cron: venue_bookings hold|pending con hold_expires_at < now() → expired.
 *
 * Protegido con CRON_SECRET (Bearer). Respuesta sin PII (solo conteo).
 * No-op si feature flag venue_booking está off.
 */
export async function GET(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  if (!(await isFeatureEnabled("venue_booking"))) {
    return NextResponse.json({ expired: 0, skipped: true, reason: "feature_off" });
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "service_client" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase.rpc("expire_venue_booking_holds");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    expired: data ?? 0,
  });
}
