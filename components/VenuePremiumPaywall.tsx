"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LegalAcceptCheckbox,
  useLegalAcceptance,
} from "@/components/LegalAcceptCheckbox";
import {
  trackNequiProofSubmit,
  trackPremiumPaywallView,
} from "@/lib/analytics";
import {
  formatCop,
  getPremiumPaymentInstructions,
  type PremiumPaymentMethod,
} from "@/lib/premium-payment";
import { createClient } from "@/lib/supabase/client";
import {
  SUBSCRIPTION_PROOFS_BUCKET,
  subscriptionProofObjectPath,
  validateSubscriptionProofFile,
} from "@/lib/subscription-proofs";

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
};

export function VenuePremiumPaywall({
  venueId,
  venueSlug,
  isOwner,
  activeSubscription,
  pendingRequest,
  latestRequest,
}: VenuePremiumPaywallProps) {
  const router = useRouter();
  const instructions = getPremiumPaymentInstructions();
  const legal = useLegalAcceptance("premium");
  const [method, setMethod] = useState<PremiumPaymentMethod>(
    instructions.nequi ? "nequi" : "bank_transfer",
  );
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    if (activeSubscription?.plan === "premium") return;
    trackPremiumPaywallView({
      venue_id: venueId,
      venue_slug: venueSlug,
      plan: "premium",
    });
  }, [isOwner, venueId, venueSlug, activeSubscription?.plan]);

  if (!isOwner) return null;

  const isPremiumActive =
    activeSubscription?.status === "active" && activeSubscription.plan === "premium";

  async function submitRequest() {
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

    setSubmitting(true);
    const supabase = createClient();
    const path = subscriptionProofObjectPath(venueId, file.name);

    const { error: uploadError } = await supabase.storage
      .from(SUBSCRIPTION_PROOFS_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      setError(`No se pudo subir el comprobante: ${uploadError.message}`);
      setSubmitting(false);
      return;
    }

    const { error: rpcError } = await supabase.rpc("submit_venue_subscription_request", {
      p_venue_id: venueId,
      p_payment_method: method,
      p_amount_cop: instructions.priceCop,
      p_proof_path: path,
      p_payment_reference: reference.trim() || undefined,
      p_plan: "premium",
      p_duration_days: instructions.durationDays,
    });

    if (rpcError) {
      // Intentar limpiar el objeto huérfano
      await supabase.storage.from(SUBSCRIPTION_PROOFS_BUCKET).remove([path]);
      setError(rpcError.message);
      setSubmitting(false);
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
    setSubmitting(false);
    router.refresh();
  }

  return (
    <section className="venue-admin-section venue-premium-paywall" id="premium">
      <h2 className="subhead">Plan Premium</h2>

      {isPremiumActive ? (
        <div className="venue-premium-status is-active">
          <p>
            Premium activo hasta{" "}
            <strong>
              {new Date(activeSubscription!.expires_at).toLocaleDateString("es-CO")}
            </strong>
            . Tu cancha aparece destacada en el directorio.
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
                disabled={!instructions.nequi || submitting}
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
                  !(instructions.bankName && instructions.bankAccount) || submitting
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
              disabled={submitting}
              placeholder="Ej. 123456789"
            />
          </label>

          <label className="venue-edit-field">
            <span>Comprobante *</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={submitting}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <LegalAcceptCheckbox
            {...legal.checkboxProps}
            id="premium-legal-accept"
            disabled={submitting}
          />

          {error ? <p className="form-error">{error}</p> : null}
          {okMessage ? <p className="form-ok">{okMessage}</p> : null}

          <div className="venue-edit-actions">
            <button
              type="button"
              className="btn-flood"
              disabled={submitting || !instructions.hasPaymentChannel}
              onClick={() => void submitRequest()}
            >
              {submitting ? "Enviando…" : "Enviar solicitud Premium"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
