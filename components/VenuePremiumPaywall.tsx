"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LegalAcceptCheckbox,
  useLegalAcceptance,
} from "@/components/LegalAcceptCheckbox";
import { submitVenuePremiumRequestAction } from "@/app/canchas/[slug]/admin/actions";
import {
  trackNequiProofSubmit,
  trackPremiumPaywallView,
} from "@/lib/analytics";
import {
  formatCop,
  getPremiumPaymentInstructions,
  type PremiumPaymentInstructions,
  type PremiumPaymentMethod,
} from "@/lib/premium-payment";
import { validateSubscriptionProofFile } from "@/lib/subscription-proofs";
import { isActivePremiumSubscription } from "@/lib/venue-premium";

export type VenueSubRequestSummary = {
  id: string;
  status: string;
  plan: string;
  payment_method: string;
  amount_cop: number;
  created_at: string;
  reject_reason: string | null;
  invoice_number: string | null;
  subscription_id: string | null;
};

type ActiveSub = {
  id: string;
  plan: string;
  started_at?: string | null;
  expires_at: string;
  status: string;
} | null;

type VenuePremiumPaywallProps = {
  venueId: string;
  venueSlug: string;
  isOwner: boolean;
  activeSubscription: ActiveSub;
  pendingRequest: VenueSubRequestSummary | null;
  latestRequest: VenueSubRequestSummary | null;
  /** Precio/canales resueltos en server (DB + env). */
  paymentInstructions?: PremiumPaymentInstructions;
};

export function VenuePremiumPaywall({
  venueId,
  venueSlug,
  isOwner,
  activeSubscription,
  pendingRequest,
  latestRequest,
  paymentInstructions,
}: VenuePremiumPaywallProps) {
  const router = useRouter();
  const instructions = paymentInstructions ?? getPremiumPaymentInstructions();
  const legal = useLegalAcceptance("premium");
  const [method, setMethod] = useState<PremiumPaymentMethod>(
    instructions.nequi ? "nequi" : "bank_transfer",
  );
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isOwner) return;
    if (
      activeSubscription &&
      isActivePremiumSubscription(activeSubscription)
    ) {
      return;
    }
    trackPremiumPaywallView({
      venue_id: venueId,
      venue_slug: venueSlug,
      plan: "premium",
    });
  }, [isOwner, venueId, venueSlug, activeSubscription]);

  if (!isOwner) return null;

  const isPremiumActive = Boolean(
    activeSubscription && isActivePremiumSubscription(activeSubscription),
  );

  function submitRequest() {
    setError(null);
    setOkMessage(null);

    const legalError = legal.validate();
    if (legalError) {
      setError(legalError);
      return;
    }
    if (!instructions.hasPaymentChannel) {
      setError("Todavía no configuramos los datos de pago. Escribinos por WhatsApp.");
      return;
    }
    if (!file) {
      setError("Subí el comprobante de pago (imagen o PDF).");
      return;
    }
    const check = validateSubscriptionProofFile(file);
    if ("error" in check) {
      setError(check.error);
      return;
    }

    const fd = new FormData();
    fd.set("venue_id", venueId);
    fd.set("payment_method", method);
    fd.set("payment_reference", reference.trim().slice(0, 80));
    fd.set("legal_accepted", "1");
    fd.set("proof", file);

    startTransition(async () => {
      const result = await submitVenuePremiumRequestAction(venueSlug, undefined, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      trackNequiProofSubmit({
        venue_id: venueId,
        venue_slug: venueSlug,
        plan: "premium",
      });
      setOkMessage("Solicitud enviada. Te avisamos cuando la revisemos.");
      setFile(null);
      setReference("");
      legal.setAccepted(false);
      router.refresh();
    });
  }

  return (
    <section className="venue-admin-section venue-premium-paywall" id="premium">
      <h2 className="subhead">Plan Premium</h2>

      {isPremiumActive ? (
        <div className="venue-premium-status is-active">
          <p>
            Premium activo
            {activeSubscription?.started_at ? (
              <>
                {" "}
                desde{" "}
                <strong>
                  {new Date(activeSubscription.started_at).toLocaleDateString("es-CO")}
                </strong>
              </>
            ) : null}{" "}
            hasta{" "}
            <strong>
              {new Date(activeSubscription!.expires_at).toLocaleDateString("es-CO")}
            </strong>
            {(() => {
              const ms =
                new Date(activeSubscription!.expires_at).getTime() - Date.now();
              const daysLeft = Math.max(0, Math.ceil(ms / 86_400_000));
              return daysLeft > 0 ? ` (${daysLeft} día${daysLeft === 1 ? "" : "s"} restantes)` : "";
            })()}
            . Tu cancha aparece destacada en el directorio. Con el módulo de torneos
            habilitado, también podés organizar campeonatos desde el panel.
          </p>
          {latestRequest?.invoice_number && latestRequest.status === "approved" ? (
            <p className="field-help">
              Factura{" "}
              <a href={`/canchas/${venueSlug}/admin/factura/${latestRequest.id}`}>
                {latestRequest.invoice_number}
              </a>
            </p>
          ) : null}
        </div>
      ) : pendingRequest ? (
        <div className="venue-premium-status is-pending">
          <p>
            Solicitud <strong>en revisión</strong> desde{" "}
            {new Date(pendingRequest.created_at).toLocaleDateString("es-CO")}. Monto:{" "}
            {formatCop(pendingRequest.amount_cop)}.
          </p>
          <p className="field-help">
            Cuando confirmemos el pago activamos Premium y generamos la factura.
          </p>
        </div>
      ) : (
        <>
          {latestRequest?.status === "rejected" ? (
            <p className="form-error venue-premium-reject">
              La solicitud anterior fue rechazada
              {latestRequest.reject_reason ? `: ${latestRequest.reject_reason}` : "."} Podés
              enviar una nueva con otro comprobante.
            </p>
          ) : null}

          <p className="field-help">
            Destacá tu cancha en el directorio ({formatCop(instructions.priceCop)} /{" "}
            {instructions.durationDays} días). Pagá por Nequi o transferencia y subí el
            comprobante.
          </p>

          {!instructions.hasPaymentChannel ? (
            <p className="form-error">
              Faltan datos de pago en la configuración del sitio. Contactá a BaFut para
              completar el pago.
            </p>
          ) : (
            <div className="venue-premium-instructions">
              {instructions.nequi ? (
                <div>
                  <span className="venue-admin-label">Nequi</span>
                  <span className="venue-premium-account">{instructions.nequi}</span>
                </div>
              ) : null}
              {instructions.bankName && instructions.bankAccount ? (
                <div>
                  <span className="venue-admin-label">Transferencia</span>
                  <span className="venue-premium-account">
                    {instructions.bankName}
                    {instructions.bankHolder ? ` · ${instructions.bankHolder}` : ""}
                    <br />
                    {instructions.bankAccount}
                  </span>
                </div>
              ) : null}
              <div>
                <span className="venue-admin-label">Valor</span>
                <span>{formatCop(instructions.priceCop)}</span>
              </div>
            </div>
          )}

          <fieldset className="venue-premium-methods">
            <legend>Método usado</legend>
            <label className="venue-edit-chip">
              <input
                type="radio"
                name="premium_method"
                checked={method === "nequi"}
                disabled={!instructions.nequi || pending}
                onChange={() => setMethod("nequi")}
              />
              Nequi
            </label>
            <label className="venue-edit-chip">
              <input
                type="radio"
                name="premium_method"
                checked={method === "bank_transfer"}
                disabled={
                  !(instructions.bankName && instructions.bankAccount) || pending
                }
                onChange={() => setMethod("bank_transfer")}
              />
              Transferencia
            </label>
          </fieldset>

          <label className="venue-edit-field">
            <span>Referencia / N° de comprobante (opcional)</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
              disabled={pending}
              placeholder="Ej. 123456789"
            />
          </label>

          <label className="venue-edit-field">
            <span>Comprobante *</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={pending}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <LegalAcceptCheckbox
            {...legal.checkboxProps}
            id="premium-legal-accept"
            disabled={pending}
          />

          {error ? <p className="form-error">{error}</p> : null}
          {okMessage ? <p className="form-ok">{okMessage}</p> : null}

          <div className="venue-edit-actions">
            <button
              type="button"
              className="btn-flood"
              disabled={pending || !instructions.hasPaymentChannel}
              onClick={() => void submitRequest()}
            >
              {pending ? "Enviando…" : "Enviar solicitud Premium"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
