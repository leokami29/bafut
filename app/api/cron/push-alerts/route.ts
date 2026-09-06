import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  buildPushPayload,
  matchMatchesAlert,
  type MatchAlertCriteria,
  type MatchForAlert,
} from "@/lib/match-alerts";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendWebPush } from "@/lib/web-push";

const ALERT_BATCH = 40;
const MATCH_LOOKBACK_HOURS = 36;

/**
 * Cron: matchea match_alerts vs partidos open recientes y envía Web Push.
 * Idempotente vía push_deliveries unique(alert_id, match_id).
 * 410/404 → borra push_subscription. Respuesta sin PII.
 */
export async function GET(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  if (!(await isFeatureEnabled("push_alerts"))) {
    return NextResponse.json({ ok: true, skipped: "push_alerts_off" });
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

  const since = new Date(Date.now() - MATCH_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();

  const { data: alerts, error: alertsError } = await supabase
    .from("match_alerts")
    .select("id, user_id, city_id, sport, format, level, neighborhood")
    .eq("enabled", true)
    .order("created_at", { ascending: true })
    .limit(ALERT_BATCH);

  if (alertsError) {
    return NextResponse.json({ error: alertsError.message }, { status: 500 });
  }

  if (!alerts?.length) {
    return NextResponse.json({
      alerts_scanned: 0,
      deliveries_attempted: 0,
      sent: 0,
      gone_deleted: 0,
      skipped_existing: 0,
    });
  }

  const cityIds = [...new Set(alerts.map((a) => a.city_id))];
  const { data: matches, error: matchesError } = await supabase
    .from("matches")
    .select(
      `id, city_id, sport, format, status, share_code, starts_at, created_at,
       venues ( name, neighborhood ),
       match_slots ( level )`,
    )
    .eq("status", "open")
    .in("city_id", cityIds)
    .gte("created_at", since)
    .gt("starts_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const matchList = (matches ?? []) as unknown as MatchForAlert[];
  let deliveriesAttempted = 0;
  let sent = 0;
  let goneDeleted = 0;
  let skippedExisting = 0;
  let failed = 0;

  for (const alert of alerts) {
    const criteria: MatchAlertCriteria = {
      city_id: alert.city_id,
      sport: alert.sport,
      format: alert.format,
      level: alert.level,
      neighborhood: alert.neighborhood,
    };

    const candidates = matchList.filter((m) => matchMatchesAlert(m, criteria));
    if (!candidates.length) continue;

    const { data: existing } = await supabase
      .from("push_deliveries")
      .select("match_id")
      .eq("alert_id", alert.id)
      .in(
        "match_id",
        candidates.map((m) => m.id),
      );

    const already = new Set((existing ?? []).map((r) => r.match_id));

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", alert.user_id);

    for (const match of candidates) {
      if (already.has(match.id)) {
        skippedExisting += 1;
        continue;
      }

      deliveriesAttempted += 1;
      const payload = buildPushPayload(match);

      if (!subs?.length) {
        await supabase.from("push_deliveries").insert({
          alert_id: alert.id,
          match_id: match.id,
          status: "skipped",
          error_code: "no_subscription",
        });
        continue;
      }

      let anySent = false;
      let lastSubId: string | null = null;
      let lastError: string | null = null;

      for (const sub of subs) {
        lastSubId = sub.id;
        const result = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
        );
        if (result.ok) {
          anySent = true;
          sent += 1;
        } else if (result.gone) {
          goneDeleted += 1;
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          lastError = String(result.statusCode);
        } else {
          failed += 1;
          lastError = String(result.statusCode || "err");
        }
      }

      await supabase.from("push_deliveries").insert({
        alert_id: alert.id,
        match_id: match.id,
        subscription_id: lastSubId,
        status: anySent ? "sent" : lastError === "410" || lastError === "404" ? "gone" : "failed",
        error_code: anySent ? null : lastError,
      });
    }
  }

  return NextResponse.json({
    alerts_scanned: alerts.length,
    matches_in_window: matchList.length,
    deliveries_attempted: deliveriesAttempted,
    sent,
    failed,
    gone_deleted: goneDeleted,
    skipped_existing: skippedExisting,
  });
}
