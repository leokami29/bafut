import type { Metadata } from "next";
import Link from "next/link";
import {
  AdminRenewalsPanel,
  type RenewalRow,
} from "@/components/AdminRenewalsPanel";
import { AdminScoreboard } from "@/components/AdminScoreboard";
import { requireUserId } from "@/lib/auth";
import { getAdminQueueCounts } from "@/lib/admin-queues";
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

  const t7 = rows.filter((r) => r.reminder_type === "t7").length;
  const t1 = rows.filter((r) => r.reminder_type === "t1").length;
  const noWa = rows.filter((r) => !r.whatsapp).length;
  const counts = await getAdminQueueCounts();

  return (
    <main className="page page-admin" id="main">
      <AdminScoreboard counts={counts} />

      <header className="page-head page-head-compact">
        <p className="eyebrow">Billing · renovaciones</p>
        <h1>Cola de renovaciones</h1>
        <p className="lede">
          {rows.length === 0
            ? "Nada por vencer esta semana."
            : `${t7} avisos T-7 y ${t1} avisos T-1.${noWa > 0 ? ` ${noWa} sin WhatsApp cargado — conseguí el número antes de avisar.` : " Preferí WhatsApp al dueño."}`}
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
