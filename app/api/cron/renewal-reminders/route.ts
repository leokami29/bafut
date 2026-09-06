import { NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import {
  classifyRenewalType,
  isResendConfigured,
  pickRenewalChannel,
  renewalWhatsAppMessage,
} from "@/lib/renewals";
import { createServiceClient } from "@/lib/supabase/admin";
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";

/**
 * Cron diario: encola recordatorios T-7 / T-1 de renovación Premium.
 * Canal: WhatsApp (cola admin con deep-link) > email (solo si RESEND_API_KEY) > admin_queue.
 * No usa SMTP free de Supabase. Respuesta sin PII.
 */
export async function GET(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "service_client" },
      { status: 500 },
    );
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString();

  const { data: subs, error } = await supabase
    .from("venue_subscriptions")
    .select(
      `id, venue_id, plan, status, expires_at,
       venues ( id, name, slug, contact_whatsapp, contact_email, owner_id )`,
    )
    .eq("status", "active")
    .eq("plan", "premium")
    .gt("expires_at", now.toISOString())
    .lte("expires_at", horizon);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let queued = 0;
  let skipped = 0;
  const resendOk = isResendConfigured();

  for (const sub of subs ?? []) {
    const reminderType = classifyRenewalType(sub.expires_at, now);
    if (!reminderType) {
      skipped += 1;
      continue;
    }

    const venue = sub.venues as {
      id: string;
      name: string;
      slug: string;
      contact_whatsapp: string | null;
      contact_email: string | null;
      owner_id: string | null;
    } | null;

    let whatsapp = venue?.contact_whatsapp
      ? normalizeWhatsapp(venue.contact_whatsapp)
      : null;

    if (!whatsapp && venue?.owner_id) {
      const { data: contact } = await supabase
        .from("profile_contacts")
        .select("whatsapp")
        .eq("user_id", venue.owner_id)
        .maybeSingle();
      whatsapp = contact?.whatsapp ? normalizeWhatsapp(contact.whatsapp) : null;
    }

    const channel = pickRenewalChannel({
      whatsapp,
      email: venue?.contact_email,
      resendConfigured: resendOk,
    });

    const message = renewalWhatsAppMessage({
      venueName: venue?.name ?? "tu cancha",
      expiresAt: sub.expires_at,
      reminderType,
    });

    const { error: insertError } = await supabase
      .from("subscription_renewal_reminders")
      .upsert(
        {
          subscription_id: sub.id,
          reminder_type: reminderType,
          channel,
          status: "pending",
          due_at: sub.expires_at,
          meta: {
            venue_id: sub.venue_id,
            venue_slug: venue?.slug ?? null,
            has_whatsapp: Boolean(whatsapp),
            has_email: Boolean(venue?.contact_email),
            // Mensaje plantilla sin número (el admin arma el wa.me al abrir).
            message_preview: message.slice(0, 200),
          },
        },
        { onConflict: "subscription_id,reminder_type", ignoreDuplicates: true },
      );

    if (insertError) {
      // Unique ya existente → ok
      if (/duplicate|unique/i.test(insertError.message)) {
        skipped += 1;
      } else {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    } else {
      queued += 1;
    }
  }

  return NextResponse.json({
    scanned: subs?.length ?? 0,
    queued,
    skipped,
    resend_available: resendOk,
  });
}
