import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { requireUserId } from "@/lib/auth";
import { getActiveCity } from "@/lib/data";
import { buildInvoiceViewModel } from "@/lib/invoice";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Factura Premium",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminSubscriptionInvoicePage({ params }: Props) {
  const { id } = await params;
  const { userId } = await requireUserId(`/admin/subscriptions/${id}/invoice`);
  const city = await getActiveCity();
  const timezone = city?.timezone ?? "America/Bogota";

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
        </header>
      </main>
    );
  }

  const { data: request } = await supabase
    .from("venue_subscription_requests")
    .select(
      `id, status, plan, payment_method, amount_cop, payment_reference,
       invoice_number, reviewed_at, created_at, subscription_id,
       venues ( name, neighborhood ),
       venue_subscriptions ( started_at, expires_at )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!request || request.status !== "approved" || !request.invoice_number) {
    notFound();
  }

  const sub = Array.isArray(request.venue_subscriptions)
    ? request.venue_subscriptions[0]
    : request.venue_subscriptions;
  const venue = Array.isArray(request.venues) ? request.venues[0] : request.venues;

  const vm = buildInvoiceViewModel({
    invoiceNumber: request.invoice_number,
    venueName: venue?.name ?? "Cancha",
    venueNeighborhood: venue?.neighborhood ?? null,
    plan: request.plan,
    paymentMethod: request.payment_method,
    amountCop: request.amount_cop,
    paymentReference: request.payment_reference,
    startedAt: sub?.started_at ?? request.reviewed_at ?? request.created_at,
    expiresAt: sub?.expires_at ?? request.reviewed_at ?? request.created_at,
    issuedAt: request.reviewed_at ?? request.created_at,
    timezone,
  });

  return (
    <main className="page page-narrow invoice-page" id="main">
      <p className="venue-back no-print">
        <Link href="/admin/subscriptions">← Solicitudes Premium</Link>
      </p>
      <InvoiceDocument invoice={vm} />
    </main>
  );
}
