"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  LegalAcceptCheckbox,
  useLegalAcceptance,
} from "@/components/LegalAcceptCheckbox";
import { trackVenueClaimSubmit } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";
import { validateClaimInput } from "@/lib/venue-claims";
import { formatWhatsappDisplay } from "@/lib/whatsapp-contact";

type VenueClaimFormProps = {
  venueId: string;
  venueSlug: string;
};

export function VenueClaimForm({ venueId, venueSlug }: VenueClaimFormProps) {
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedWhatsapp, setSubmittedWhatsapp] = useState<string | null>(null);
  const legal = useLegalAcceptance("claim");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const legalError = legal.validate();
    if (legalError) {
      setError(legalError);
      return;
    }

    const check = validateClaimInput({ whatsapp, email, note });
    if ("error" in check) {
      setError(check.error);
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("claim_venue", {
      p_venue_id: venueId,
      p_whatsapp: check.whatsapp,
      p_note: check.note,
      p_email: check.email ?? undefined,
    });

    if (rpcError) {
      setError(rpcError.message);
      setPending(false);
      return;
    }

    trackVenueClaimSubmit({ venue_id: venueId, venue_slug: venueSlug });
    setSubmittedWhatsapp(check.whatsapp);
    setPending(false);
  }

  if (submittedWhatsapp) {
    return (
      <div className="venue-claim-pending" role="status">
        <h3 className="subhead">Reclamo enviado — quedó en revisión</h3>
        <p>
          Un editor de BaFut verifica que seas el dueño antes de asignarte la cancha. Te
          escribimos a <strong>{formatWhatsappDisplay(submittedWhatsapp)}</strong> cuando esté
          resuelto.
        </p>
        <p className="venue-claim-pending-meta">
          No reclamés la misma cancha otra vez: el primer reclamo pendiente es el que se revisa.
        </p>
        <div className="empty-home-actions">
          <Link href="/perfil/canchas" className="btn-flood">
            Ver mis reclamos
          </Link>
          <Link href={`/canchas/${venueSlug}`} className="btn-ghost empty-home-ghost">
            Volver a la cancha
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack-form venue-claim-form">
      <label>
        Tu WhatsApp <span className="req-mark">*</span>
        <input
          type="tel"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          required
          placeholder="3001234567"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          aria-describedby="venue-claim-whatsapp-help"
        />
      </label>
      <p id="venue-claim-whatsapp-help" className="field-help">
        Celular colombiano de 10 dígitos. Por acá te avisamos del resultado.
      </p>

      <label>
        Correo <span className="field-optional">(opcional)</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label>
        ¿Cómo verificamos que sos el dueño/a? <span className="req-mark">*</span>
        <textarea
          name="note"
          rows={4}
          required
          minLength={10}
          maxLength={500}
          placeholder="Ej: el teléfono de la recepción es 605 1234567; en el grupo de WhatsApp de la cancha soy admin; el nombre de la razón social es ..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-describedby="venue-claim-note-help"
        />
      </label>
      <p id="venue-claim-note-help" className="field-help">
        Un dato que solo quien administra la cancha sabría verificar. No mandés claves ni
        documentos por acá.
      </p>

      <LegalAcceptCheckbox
        {...legal.checkboxProps}
        id="venue-claim-legal-accept"
        disabled={pending}
      />

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-flood"
        disabled={pending || !legal.accepted}
        aria-busy={pending}
      >
        {pending ? "Enviando…" : "Enviar reclamo para revisión"}
      </button>
      <p className="field-help">
        No es automático: un editor de BaFut revisa y, si confirma, la cancha pasa a tu nombre
        con sello de verificada.
      </p>
    </form>
  );
}
