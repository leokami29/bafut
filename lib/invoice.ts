import { formatCop, paymentMethodLabel } from "@/lib/premium-payment";

export type InvoiceData = {
  invoiceNumber: string;
  venueName: string;
  venueNeighborhood: string | null;
  plan: string;
  paymentMethod: string;
  amountCop: number;
  paymentReference: string | null;
  startedAt: string;
  expiresAt: string;
  issuedAt: string;
  timezone?: string;
};

function formatDate(iso: string, timezone = "America/Bogota"): string {
  try {
    return new Intl.DateTimeFormat("es-CO", {
      timeZone: timezone,
      dateStyle: "long",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/** Datos listos para render HTML / impresión PDF. */
export function buildInvoiceViewModel(data: InvoiceData) {
  const tz = data.timezone ?? "America/Bogota";
  return {
    ...data,
    planLabel: data.plan === "premium" ? "Premium" : data.plan,
    methodLabel: paymentMethodLabel(data.paymentMethod),
    amountLabel: formatCop(data.amountCop),
    startedLabel: formatDate(data.startedAt, tz),
    expiresLabel: formatDate(data.expiresAt, tz),
    issuedLabel: formatDate(data.issuedAt, tz),
  };
}

export type InvoiceViewModel = ReturnType<typeof buildInvoiceViewModel>;
