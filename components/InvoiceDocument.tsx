"use client";

import type { InvoiceViewModel } from "@/lib/invoice";

type InvoiceDocumentProps = {
  invoice: InvoiceViewModel;
};

/** Factura HTML lista para imprimir / guardar como PDF desde el navegador. */
export function InvoiceDocument({ invoice }: InvoiceDocumentProps) {
  return (
    <article className="invoice-doc">
      <header className="invoice-doc-head">
        <p className="invoice-brand">BaFut</p>
        <div>
          <h1>Comprobante de suscripción</h1>
          <p className="invoice-number">{invoice.invoiceNumber}</p>
        </div>
      </header>

      <dl className="invoice-doc-grid">
        <div>
          <dt>Cancha</dt>
          <dd>
            {invoice.venueName}
            {invoice.venueNeighborhood ? ` · ${invoice.venueNeighborhood}` : ""}
          </dd>
        </div>
        <div>
          <dt>Plan</dt>
          <dd>{invoice.planLabel}</dd>
        </div>
        <div>
          <dt>Periodo</dt>
          <dd>
            {invoice.startedLabel} → {invoice.expiresLabel}
          </dd>
        </div>
        <div>
          <dt>Emitido</dt>
          <dd>{invoice.issuedLabel}</dd>
        </div>
        <div>
          <dt>Método de pago</dt>
          <dd>{invoice.methodLabel}</dd>
        </div>
        <div>
          <dt>Referencia</dt>
          <dd>{invoice.paymentReference || "—"}</dd>
        </div>
        <div className="invoice-total">
          <dt>Valor</dt>
          <dd>{invoice.amountLabel}</dd>
        </div>
      </dl>

      <p className="invoice-note">
        Documento informativo de BaFut. No es factura electrónica DIAN. El plan Premium
        destaca la cancha en el directorio; no incluye reserva ni cobros entre jugadores.
      </p>

      <div className="invoice-actions no-print">
        <button type="button" className="btn-flood" onClick={() => window.print()}>
          Imprimir / guardar PDF
        </button>
      </div>
    </article>
  );
}
