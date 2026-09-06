import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminRenewalsPanel,
  type RenewalRow,
} from "@/components/AdminRenewalsPanel";
import { requireUserId } from "@/lib/auth";
import { renewalWhatsAppHref, renewalWhatsAppMessage } from "@/lib/renewals";
import { createClient } from "@/lib/supabase/server";
import { normalizeWhatsapp } from "@/lib/whatsapp-contact";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Renovaciones Premium",
  robots: robotsNoIndex,
};

export default async function AdminRenewalsPage() {
  const { userId } = await requireUserId("/admin/renewals");
  const supabase = await createClient();

  const { data: adminData } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!adminData) {
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

  const { data: reminders, error } = await supabase
    .from("subscription_renewal_reminders")
    .select(
      `id, reminder_type, channel, status, due_at, meta, subscription_id,
       venue_subscriptions (
         expires_at, plan, venue_id,
         venues ( name, slug, contact_whatsapp, owner_id )
       )`,
    )
    .eq("status", "pending")
    .order("due_at", { ascending: true });

  const rows: RenewalRow[] = [];

  for (const rem of reminders ?? []) {
    const sub = rem.venue_subscriptions as {
      expires_at: string;
      plan: string;
      venue_id: string;
      venues: {
        name: string;
        slug: string;
        contact_whatsapp: string | null;
        owner_id: string | null;
      } | null;
    } | null;

    const venue = sub?.venues;
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

    const message = renewalWhatsAppMessage({
      venueName: venue?.name ?? "tu cancha",
      expiresAt: sub?.expires_at ?? rem.due_at,
      reminderType: rem.reminder_type === "t1" ? "t1" : "t7",
    });

    rows.push({
      id: rem.id,
      reminder_type: rem.reminder_type,
      channel: rem.channel,
      status: rem.status,
      due_at: rem.due_at,
      meta: (rem.meta as RenewalRow["meta"]) ?? null,
      venue_name: venue?.name ?? "Cancha",
      venue_slug: venue?.slug ?? "",
      expires_at: sub?.expires_at ?? rem.due_at,
      whatsapp,
      waHref: whatsapp ? renewalWhatsAppHref(whatsapp, message) : null,
    });
  }

  return (
    <main className="page page-nuevo-partido" id="main">
      <p className="venue-back">
        <Link href="/admin">← Admin</Link>
      </p>
      <header className="page-head match-compose-head">
        <p className="eyebrow">Billing · renovaciones</p>
        <h1>Cola de renovaciones</h1>
        <p className="lede">
          T-7 y T-1 de Premium. Preferí WhatsApp al dueño; no dependemos del SMTP free de
          Supabase. Email solo si configurás Resend.
        </p>
      </header>

      {error ? (
        <p className="form-error">Error cargando cola: {error.message}</p>
      ) : (
        <AdminRenewalsPanel rows={rows} />
      )}
    </main>
  );
}
