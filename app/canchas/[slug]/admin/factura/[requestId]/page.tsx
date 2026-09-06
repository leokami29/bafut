import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { requireUserId } from "@/lib/auth";
import { getActiveCity, getVenueBySlug } from "@/lib/data";
import { buildInvoiceViewModel } from "@/lib/invoice";
import { createClient } from "@/lib/supabase/server";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Factura Premium",
  robots: robotsNoIndex,
};

type Props = { params: Promise<{ slug: string; requestId: string }> };

export default async function OwnerInvoicePage({ params }: Props) {
  const { slug, requestId } = await params;
  const { userId } = await requireUserId(`/canchas/${slug}/admin/factura/${requestId}`);
  const city = await getActiveCity();
  if (!city) notFound();

  const venue = await getVenueBySlug(city.id, slug);
  if (!venue) notFound();

  const supabase = await createClient();
  const { data: isAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const isOwner = venue.owner_id === userId;
  if (!isOwner && !isAdmin) {
    return (
      <main className="page page-narrow" id="main">
        <header className="page-head">
          <h1>Acceso denegado</h1>
          <p>No tenés permisos para ver esta factura.</p>
        </header>
      </main>
    );
  }

  const { data: request } = await supabase
    .from("venue_subscription_requests")
    .select(
      `id, status, plan, payment_method, amount_cop, payment_reference,
       invoice_number, reviewed_at, created_at, venue_id, user_id,
       venue_subscriptions ( started_at, expires_at )`,
    )
    .eq("id", requestId)
    .eq("venue_id", venue.id)
    .maybeSingle();

  if (!request || request.status !== "approved" || !request.invoice_number) {
    notFound();
  }

  if (!isAdmin && request.user_id !== userId && !isOwner) {
    notFound();
  }

  const sub = Array.isArray(request.venue_subscriptions)
    ? request.venue_subscriptions[0]
    : request.venue_subscriptions;

  const timezone = city.timezone ?? "America/Bogota";
  const vm = buildInvoiceViewModel({
    invoiceNumber: request.invoice_number,
    venueName: venue.name,
    venueNeighborhood: venue.neighborhood,
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
        <Link href={`/canchas/${slug}/admin`}>← Panel de la cancha</Link>
      </p>
      <InvoiceDocument invoice={vm} />
    </main>
  );
}
