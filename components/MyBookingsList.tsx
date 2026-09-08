"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  cancelVenueBookingAction,
  type CancelVenueBookingState,
} from "@/app/canchas/[slug]/turno/actions";
import {
  bookingPaymentMethodLabel,
  bookingStatusLabel,
  canPlayerCancelBooking,
  formatBookingMoney,
  formatBookingWhen,
} from "@/lib/booking";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";

export type PlayerBookingRow = {
  id: string;
  status: string;
  sport: string;
  starts_at: string;
  duration_min: number;
  final_cop: number | null;
  payment_method: string;
  hold_expires_at: string | null;
  reject_reason: string | null;
  venue: {
    name: string;
    slug: string;
    timezone: string;
  };
};

type Props = {
  bookings: PlayerBookingRow[];
};

function CancelForm({ bookingId, venueSlug }: { bookingId: string; venueSlug: string }) {
  const bound = cancelVenueBookingAction.bind(null, venueSlug);
  const [state, action, pending] = useActionState(
    bound,
    undefined as CancelVenueBookingState | undefined,
  );

  return (
    <form action={action} className="venue-booking-cancel-form">
      <input type="hidden" name="booking_id" value={bookingId} />
      <button type="submit" className="btn-ghost btn-small" disabled={pending} aria-busy={pending}>
        {pending ? "Cancelando…" : "Cancelar reserva"}
      </button>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p className="form-ok" role="status">
          Reserva cancelada.
        </p>
      ) : null}
    </form>
  );
}

export function MyBookingsList({ bookings }: Props) {
  if (bookings.length === 0) {
    return (
      <div className="empty my-matches-empty">
        <p>Todavía no pediste ninguna reserva.</p>
        <div className="empty-home-actions">
          <Link href="/canchas" className="btn-flood">
            Ver canchas
          </Link>
        </div>
      </div>
    );
  }

  const nowMs = Date.now();

  return (
    <ul className="my-matches-list venue-booking-list">
      {bookings.map((b) => {
        const canCancel = canPlayerCancelBooking(b.status, b.starts_at, nowMs);
        const statusClass = `is-${b.status}`;
        return (
          <li key={b.id} className={`venue-booking-card ${statusClass}`}>
            <div className="venue-booking-card-top">
              <Link href={`/canchas/${b.venue.slug}`} className="venue-booking-card-venue">
                {b.venue.name}
              </Link>
              <span className={`venue-booking-status ${statusClass}`}>
                {bookingStatusLabel(b.status)}
              </span>
            </div>
            <p className="venue-booking-card-when">
              {formatBookingWhen(b.starts_at, b.venue.timezone)} · {b.duration_min} min ·{" "}
              {sportLabel[b.sport as Sport] ?? b.sport}
            </p>
            <p className="venue-booking-card-meta">
              {formatBookingMoney(b.final_cop)} · {bookingPaymentMethodLabel(b.payment_method)}
              {b.status === "pending" && b.hold_expires_at
                ? ` · hold hasta ${formatBookingWhen(b.hold_expires_at, b.venue.timezone)}`
                : null}
            </p>
            {b.status === "rejected" && b.reject_reason ? (
              <p className="venue-booking-card-reject">{b.reject_reason}</p>
            ) : null}
            <div className="venue-booking-card-actions">
              <Link href={`/canchas/${b.venue.slug}`} className="btn-ghost btn-small">
                Ver cancha
              </Link>
              {canCancel ? <CancelForm bookingId={b.id} venueSlug={b.venue.slug} /> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
