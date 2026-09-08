"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveVenueBookingAction,
  getBookingProofSignedUrl,
  rejectVenueBookingAction,
  type VenueBookingReviewState,
} from "@/app/canchas/[slug]/admin/turnos/actions";
import { trackTurnoApproved } from "@/lib/analytics";
import type { Aged } from "@/lib/admin-queues";
import {
  bookingPaymentMethodLabel,
  bookingStatusLabel,
  formatBookingMoney,
  formatBookingWhen,
} from "@/lib/booking";
import { sportLabel } from "@/lib/labels";
import { normalizeWhatsapp, whatsappChatHref } from "@/lib/whatsapp-contact";
import type { Sport } from "@/lib/constants";

export type VenueBookingInboxRow = {
  id: string;
  venue_id: string;
  status: string;
  sport: string;
  starts_at: string;
  duration_min: number;
  final_cop: number;
  payment_method: string;
  contact_whatsapp: string;
  proof_path: string;
  note: string | null;
  hold_expires_at: string | null;
  reject_reason: string | null;
  created_at: string;
  decided_at: string | null;
};

type AgedBooking = VenueBookingInboxRow & Aged;

type Props = {
  slug: string;
  venueId: string;
  venueName: string;
  timezone: string;
  pending: AgedBooking[];
  history: AgedBooking[];
};

function playerContactHref(
  booking: VenueBookingInboxRow,
  venueName: string,
  timezone: string,
) {
  const digits = normalizeWhatsapp(booking.contact_whatsapp);
  if (!digits) return null;
  const when = formatBookingWhen(booking.starts_at, timezone);
  return whatsappChatHref(
    digits,
    `Hola! Te escribo de ${venueName} por tu pedido de turno (${when}).`,
  );
}

function sportName(sport: string) {
  return sportLabel[sport as Sport] ?? sport;
}

function planillaStatusClass(status: string) {
  if (status === "pending") return "planilla-pending";
  if (status === "confirmed") return "planilla-approved";
  if (status === "rejected") return "planilla-rejected";
  return `planilla-${status}`;
}

function stampClass(status: string) {
  if (status === "confirmed") return "planilla-stamp-approved";
  if (status === "rejected") return "planilla-stamp-rejected";
  return `planilla-stamp-${status}`;
}

function BookingProofLink({ slug, bookingId }: { slug: string; bookingId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getBookingProofSignedUrl(slug, bookingId).then((res) => {
      if (cancelled) return;
      if (res.error || !res.url) {
        setError(res.error ?? "No se pudo firmar el comprobante.");
        return;
      }
      setUrl(res.url);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, bookingId]);

  if (error) return <span className="form-error">{error}</span>;
  if (!url) return <span className="field-help">Cargando comprobante…</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-flood planilla-proof-btn"
    >
      Ver comprobante
    </a>
  );
}

function BookingRow({
  booking,
  slug,
  venueId,
  venueName,
  timezone,
  open,
}: {
  booking: AgedBooking;
  slug: string;
  venueId: string;
  venueName: string;
  timezone: string;
  open: boolean;
}) {
  const router = useRouter();
  const approveBound = approveVenueBookingAction.bind(null, slug);
  const rejectBound = rejectVenueBookingAction.bind(null, slug);
  const [approveState, approveAction, approvePending] = useActionState(
    approveBound,
    undefined as VenueBookingReviewState | undefined,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectBound,
    undefined as VenueBookingReviewState | undefined,
  );

  const busy = approvePending || rejectPending;
  const pending = booking.status === "pending";
  const wa = playerContactHref(booking, venueName, timezone);
  const error = approveState?.error ?? rejectState?.error;

  useEffect(() => {
    if (!approveState?.ok) return;
    trackTurnoApproved({
      venue_id: venueId,
      venue_slug: slug,
      booking_id: booking.id,
    });
    router.refresh();
  }, [approveState?.ok, venueId, slug, booking.id, router]);

  useEffect(() => {
    if (!rejectState?.ok) return;
    router.refresh();
  }, [rejectState?.ok, router]);

  return (
    <li
      className={`planilla ${planillaStatusClass(booking.status)}`}
      data-urgency={pending ? booking.urgency : undefined}
    >
      <header className="planilla-head">
        <span className="planilla-rail" aria-hidden="true" />
        <div className="planilla-title">
          <h3>
            {sportName(booking.sport)} · {formatBookingWhen(booking.starts_at, timezone)}
          </h3>
          <p className="planilla-sub">
            {booking.duration_min} min · {bookingPaymentMethodLabel(booking.payment_method)} ·{" "}
            {formatBookingMoney(booking.final_cop)}
          </p>
        </div>
        <div className="planilla-tags">
          <span className="planilla-price">{formatBookingMoney(booking.final_cop)}</span>
          {pending ? (
            <span className={`planilla-age planilla-age-${booking.urgency}`}>
              en cola {booking.ageLabel}
            </span>
          ) : (
            <span className={`planilla-stamp ${stampClass(booking.status)}`}>
              {bookingStatusLabel(booking.status)}
            </span>
          )}
        </div>
      </header>

      <details className="planilla-body" open={open}>
        <summary className="planilla-summary">
          <span className="planilla-summary-label">
            {pending ? "Revisar pedido" : "Detalle del turno"}
          </span>
          <span className="planilla-summary-hint" aria-hidden="true">
            desplegar
          </span>
        </summary>

        <div className="planilla-content">
          <dl className="planilla-facts">
            <div>
              <dt>WhatsApp jugador</dt>
              <dd>
                {booking.contact_whatsapp}
                {wa ? (
                  <>
                    {" · "}
                    <a href={wa} target="_blank" rel="noopener noreferrer">
                      Abrir WhatsApp
                    </a>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Pedido</dt>
              <dd>{formatBookingWhen(booking.created_at, timezone)}</dd>
            </div>
            {pending && booking.hold_expires_at ? (
              <div>
                <dt>Hold hasta</dt>
                <dd>{formatBookingWhen(booking.hold_expires_at, timezone)}</dd>
              </div>
            ) : null}
            {booking.note ? (
              <div className="planilla-fact-note">
                <dt>Nota</dt>
                <dd>{booking.note}</dd>
              </div>
            ) : null}
            {booking.reject_reason ? (
              <div className="planilla-fact-note">
                <dt>Motivo rechazo</dt>
                <dd>{booking.reject_reason}</dd>
              </div>
            ) : null}
          </dl>

          <div className="planilla-actions">
            <div className="planilla-action-row">
              <BookingProofLink slug={slug} bookingId={booking.id} />
              {pending ? (
                <>
                  <form action={approveAction}>
                    <input type="hidden" name="booking_id" value={booking.id} />
                    <button type="submit" className="btn-flood" disabled={busy}>
                      {approvePending ? "Confirmando…" : "Aprobar turno"}
                    </button>
                  </form>
                  <details className="planilla-reject">
                    <summary className="planilla-reject-summary">Rechazar</summary>
                    <form action={rejectAction} className="planilla-reject-form">
                      <input type="hidden" name="booking_id" value={booking.id} />
                      <label>
                        <span className="sr-only">Motivo del rechazo</span>
                        <input
                          type="text"
                          name="reason"
                          maxLength={300}
                          placeholder="Motivo (opcional)"
                          disabled={busy}
                        />
                      </label>
                      <button type="submit" className="btn-bib" disabled={busy}>
                        Confirmar rechazo
                      </button>
                    </form>
                  </details>
                </>
              ) : null}
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            {approveState?.ok ? <p className="form-ok">Turno confirmado.</p> : null}
            {rejectState?.ok ? <p className="form-ok">Pedido rechazado.</p> : null}
          </div>
        </div>
      </details>
    </li>
  );
}

export function VenueBookingInbox({
  slug,
  venueId,
  venueName,
  timezone,
  pending,
  history,
}: Props) {
  return (
    <div className="venue-booking-inbox">
      <section className="venue-admin-section">
        <h2 className="subhead">
          Pendientes{pending.length > 0 ? ` (${pending.length})` : ""}
        </h2>
        {pending.length === 0 ? (
          <p className="field-help">No hay pedidos de turno esperando revisión.</p>
        ) : (
          <ul className="planilla-list">
            {pending.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                slug={slug}
                venueId={venueId}
                venueName={venueName}
                timezone={timezone}
                open
              />
            ))}
          </ul>
        )}
      </section>

      <section className="venue-admin-section">
        <h2 className="subhead">Historial</h2>
        {history.length === 0 ? (
          <p className="field-help">Todavía no hay turnos resueltos en esta cancha.</p>
        ) : (
          <ul className="planilla-list">
            {history.map((booking) => (
              <BookingRow
                key={booking.id}
                booking={booking}
                slug={slug}
                venueId={venueId}
                venueName={venueName}
                timezone={timezone}
                open={false}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
