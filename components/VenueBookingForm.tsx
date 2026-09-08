"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { BookingPricePreview } from "@/components/BookingPricePreview";
import {
  LegalAcceptCheckbox,
  useLegalAcceptance,
} from "@/components/LegalAcceptCheckbox";
import {
  submitVenueBookingAction,
  type SubmitVenueBookingState,
} from "@/app/canchas/[slug]/turno/actions";
import { trackTurnoProofSubmit, trackTurnoStart } from "@/lib/analytics";
import {
  BOOKING_HOLD_HOURS,
  BOOKING_MAX_HORIZON_DAYS,
  BOOKING_MIN_LEAD_HOURS,
  bookingDurationsForMin,
  bookingPaymentMethodLabel,
  formatBookingMoney,
  listBookingDayKeys,
  listFreeBookingSlots,
  type BookingDurationMin,
  type BookingPaymentMethod,
  type OccupyInterval,
} from "@/lib/booking";
import { cityDayBoundsFromLocal, datetimeLocalInZoneToDate } from "@/lib/datetime";
import type { Sport } from "@/lib/constants";
import { sportLabel } from "@/lib/labels";
import { mapDayOccupancyRpcRow } from "@/lib/occupancy";
import {
  formatCop,
  getPremiumPaymentInstructions,
} from "@/lib/premium-payment";
import { createClient } from "@/lib/supabase/client";

export type VenueBookingFormProps = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  timeZone: string;
  sports: string[];
  minBySport: Record<string, number>;
};

type Step = 1 | 2 | 3 | 4 | 5;

function formatDayChip(dayKey: string, timeZone: string): string {
  const date = datetimeLocalInZoneToDate(`${dayKey}T12:00`, timeZone);
  if (!date) return dayKey;
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
}

function formatSlotLabel(local: string): string {
  const hm = local.split("T")[1] ?? local;
  return hm;
}

export function VenueBookingForm({
  venueId,
  venueSlug,
  venueName,
  timeZone,
  sports,
  minBySport,
}: VenueBookingFormProps) {
  const instructions = getPremiumPaymentInstructions();
  const legal = useLegalAcceptance("booking");

  const [step, setStep] = useState<Step>(1);
  const [sport, setSport] = useState<string>(sports[0] ?? "futbol");
  const [dayKey, setDayKey] = useState<string>("");
  const [durationMin, setDurationMin] = useState<BookingDurationMin>(60);
  const [startsAtLocal, setStartsAtLocal] = useState<string>("");
  const [occupied, setOccupied] = useState<OccupyInterval[]>([]);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [occupancyError, setOccupancyError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>(
    instructions.nequi ? "nequi" : "bank_transfer",
  );
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [priceOk, setPriceOk] = useState(false);
  const [finalCop, setFinalCop] = useState<number | null>(null);

  const boundAction = useMemo(
    () => submitVenueBookingAction.bind(null, venueSlug),
    [venueSlug],
  );
  const [state, formAction, pending] = useActionState(
    boundAction,
    undefined as SubmitVenueBookingState | undefined,
  );

  const dayKeys = useMemo(() => listBookingDayKeys(timeZone), [timeZone]);
  const durations = useMemo(
    () => bookingDurationsForMin(minBySport[sport]),
    [minBySport, sport],
  );

  useEffect(() => {
    trackTurnoStart({ venue_id: venueId, venue_slug: venueSlug });
  }, [venueId, venueSlug]);

  useEffect(() => {
    if (!dayKey && dayKeys[0]) setDayKey(dayKeys[0]);
  }, [dayKey, dayKeys]);

  useEffect(() => {
    if (durations.length && !durations.includes(durationMin)) {
      setDurationMin(durations[0]!);
    }
  }, [durations, durationMin]);

  useEffect(() => {
    if (!dayKey) return;
    let cancelled = false;
    setOccupancyLoading(true);
    setOccupancyError(null);
    const bounds = cityDayBoundsFromLocal(`${dayKey}T12:00`, timeZone);
    if (!bounds) {
      setOccupied([]);
      setOccupancyLoading(false);
      return;
    }
    const supabase = createClient();
    void (async () => {
      const { data, error } = await supabase.rpc("list_venue_day_occupancy", {
        p_venue_id: venueId,
        p_day_start: bounds.dayStart.toISOString(),
        p_day_end: bounds.dayEnd.toISOString(),
      });
      if (cancelled) return;
      setOccupancyLoading(false);
      if (error) {
        setOccupancyError(error.message);
        setOccupied([]);
        return;
      }
      const intervals: OccupyInterval[] = (data ?? []).map((row) => {
        const mapped = mapDayOccupancyRpcRow(row);
        return {
          startsAtMs: new Date(mapped.starts_at).getTime(),
          durationMin: mapped.duration_min,
        };
      });
      setOccupied(intervals);
    })();
    return () => {
      cancelled = true;
    };
  }, [dayKey, timeZone, venueId]);

  const freeSlots = useMemo(() => {
    if (!dayKey) return [];
    return listFreeBookingSlots({
      dayKey,
      durationMin,
      timeZone,
      occupied,
      minMinutes: minBySport[sport],
    });
  }, [dayKey, durationMin, timeZone, occupied, minBySport, sport]);

  useEffect(() => {
    if (startsAtLocal && !freeSlots.includes(startsAtLocal)) {
      setStartsAtLocal("");
    }
  }, [freeSlots, startsAtLocal]);

  const startsAtIso = useMemo(() => {
    if (!startsAtLocal) return "";
    return datetimeLocalInZoneToDate(startsAtLocal, timeZone)?.toISOString() ?? "";
  }, [startsAtLocal, timeZone]);

  const onPreviewChange = useCallback(
    (preview: { finalCop: number | null; errors: string[]; minMinutes: number | null }) => {
      setFinalCop(preview.finalCop);
      setPriceOk(preview.finalCop != null && preview.finalCop > 0 && preview.errors.length === 0);
    },
    [],
  );

  useEffect(() => {
    if (state?.ok) {
      trackTurnoProofSubmit({
        venue_id: venueId,
        venue_slug: venueSlug,
        sport,
        duration_min: durationMin,
      });
    }
  }, [state?.ok, venueId, venueSlug, sport, durationMin]);

  if (state?.ok) {
    return (
      <div className="venue-booking-success" role="status">
        <h2 className="subhead">Pedido enviado</h2>
        <p>
          Tu turno en <strong>{venueName}</strong> quedó en hold {BOOKING_HOLD_HOURS} h
          mientras el dueño revisa el comprobante
          {finalCop != null ? ` · ${formatBookingMoney(finalCop)}` : ""}.
        </p>
        <div className="empty-home-actions venue-booking-success-actions">
          {state.ownerWhatsappHref ? (
            <a
              href={state.ownerWhatsappHref}
              className="btn-flood"
              target="_blank"
              rel="noopener noreferrer"
            >
              Avisar al dueño por WhatsApp
            </a>
          ) : (
            <p className="field-help">
              Esta cancha no tiene WhatsApp público; el dueño ve el pedido en su panel.
            </p>
          )}
          <Link href="/perfil/turnos" className="btn-ghost">
            Ver mis turnos
          </Link>
          <Link href={`/canchas/${venueSlug}`} className="btn-ghost empty-home-ghost">
            Volver a la cancha
          </Link>
        </div>
      </div>
    );
  }

  const canGoStep2 = Boolean(sport);
  const canGoStep3 = Boolean(dayKey);
  const canGoStep4 = Boolean(durationMin) && freeSlots.length > 0 && Boolean(startsAtLocal);
  const canGoStep5 = canGoStep4 && priceOk;
  const canSubmit =
    canGoStep5 &&
    priceOk &&
    finalCop != null &&
    legal.accepted &&
    instructions.hasPaymentChannel &&
    Boolean(whatsapp.trim());

  return (
    <form action={formAction} className="venue-booking-form stack-form match-compose">
      <input type="hidden" name="venue_id" value={venueId} />
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="starts_at" value={startsAtLocal} />
      <input type="hidden" name="duration_min" value={durationMin} />
      <input type="hidden" name="payment_method" value={paymentMethod} />

      <div className="match-compose-progress" aria-label={`Paso ${step} de 5`}>
        <div className="match-compose-progress-track" aria-hidden="true">
          <span className={step >= 1 ? "is-on" : undefined} />
          <span className={step >= 2 ? "is-on" : undefined} />
          <span className={step >= 3 ? "is-on" : undefined} />
          <span className={step >= 4 ? "is-on" : undefined} />
          <span className={step >= 5 ? "is-on" : undefined} />
        </div>
        <p className="venue-booking-step-label">
          {step === 1 && "Deporte"}
          {step === 2 && "Día"}
          {step === 3 && "Duración y hora"}
          {step === 4 && "Precio"}
          {step === 5 && "Pago y comprobante"}
        </p>
      </div>

      <p className="field-help venue-booking-rules">
        Lead mínimo {BOOKING_MIN_LEAD_HOURS} h · hasta {BOOKING_MAX_HORIZON_DAYS} días · hold{" "}
        {BOOKING_HOLD_HOURS} h hasta que el dueño confirme
      </p>

      {step === 1 ? (
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Deporte</legend>
          <div className="filter-chips venue-booking-chips">
            {sports.map((s) => (
              <button
                key={s}
                type="button"
                className={sport === s ? "is-on" : undefined}
                aria-pressed={sport === s}
                onClick={() => {
                  setSport(s);
                  setStartsAtLocal("");
                }}
              >
                {sportLabel[s as Sport] ?? s}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn-flood create-step-next"
            disabled={!canGoStep2}
            onClick={() => setStep(2)}
          >
            Seguir
          </button>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Día</legend>
          <div className="filter-chips venue-booking-chips venue-booking-days">
            {dayKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={dayKey === key ? "is-on" : undefined}
                aria-pressed={dayKey === key}
                onClick={() => {
                  setDayKey(key);
                  setStartsAtLocal("");
                }}
              >
                {formatDayChip(key, timeZone)}
              </button>
            ))}
          </div>
          <div className="venue-booking-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn-flood"
              disabled={!canGoStep3}
              onClick={() => setStep(3)}
            >
              Seguir
            </button>
          </div>
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Duración y hora libre</legend>
          <div className="filter-chips venue-booking-chips">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                className={durationMin === d ? "is-on" : undefined}
                aria-pressed={durationMin === d}
                onClick={() => {
                  setDurationMin(d);
                  setStartsAtLocal("");
                }}
              >
                {d} min
              </button>
            ))}
          </div>
          {occupancyLoading ? (
            <p className="field-help">Cargando ocupación…</p>
          ) : occupancyError ? (
            <p className="form-error" role="alert">
              {occupancyError}
            </p>
          ) : freeSlots.length === 0 ? (
            <p className="venue-booking-empty" role="status">
              No hay franjas libres ese día con {durationMin} min (ocupado, fuera de 06–23 o
              dentro del lead de {BOOKING_MIN_LEAD_HOURS} h). Probá otro día o duración.
            </p>
          ) : (
            <div className="filter-chips venue-booking-chips venue-booking-slots">
              {freeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={startsAtLocal === slot ? "is-on" : undefined}
                  aria-pressed={startsAtLocal === slot}
                  onClick={() => setStartsAtLocal(slot)}
                >
                  {formatSlotLabel(slot)}
                </button>
              ))}
            </div>
          )}
          <div className="venue-booking-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep(2)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn-flood"
              disabled={!canGoStep4}
              onClick={() => setStep(4)}
            >
              Seguir
            </button>
          </div>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Precio</legend>
          <p className="field-help">
            {sportLabel[sport as Sport] ?? sport} · {formatDayChip(dayKey, timeZone)} ·{" "}
            {formatSlotLabel(startsAtLocal)} · {durationMin} min
          </p>
          {startsAtIso ? (
            <BookingPricePreview
              venueId={venueId}
              sport={sport}
              startsAtIso={startsAtIso}
              durationMin={durationMin}
              onPreviewChange={onPreviewChange}
            />
          ) : null}
          {!priceOk ? (
            <p className="form-error" role="alert">
              Esta cancha no tiene tarifa para ese horario. Probá otro día/hora o pedile
              al dueño que configure precios.
            </p>
          ) : null}
          <div className="venue-booking-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep(3)}>
              Atrás
            </button>
            <button
              type="button"
              className="btn-flood"
              disabled={!canGoStep5}
              onClick={() => setStep(5)}
            >
              Seguir al pago
            </button>
          </div>
        </fieldset>
      ) : null}

      {step === 5 ? (
        <fieldset className="match-compose-group">
          <legend className="match-compose-legend">Pago y comprobante</legend>
          <p className="field-help">
            Pagá el monto completo
            {finalCop != null ? ` (${formatBookingMoney(finalCop)})` : ""} y subí el
            comprobante. El dueño confirma; después avisale por WhatsApp.
          </p>

          {!instructions.hasPaymentChannel ? (
            <p className="form-error">
              Faltan datos de pago en BaFut. No se puede enviar el pedido ahora.
            </p>
          ) : (
            <div className="venue-booking-pay-instructions">
              {instructions.nequi ? (
                <div>
                  <span className="venue-booking-pay-label">Nequi</span>
                  <span className="venue-booking-pay-value">{instructions.nequi}</span>
                </div>
              ) : null}
              {instructions.bankName && instructions.bankAccount ? (
                <div>
                  <span className="venue-booking-pay-label">Transferencia</span>
                  <span className="venue-booking-pay-value">
                    {instructions.bankName}
                    {instructions.bankHolder ? ` · ${instructions.bankHolder}` : ""}
                    <br />
                    {instructions.bankAccount}
                  </span>
                </div>
              ) : null}
              {finalCop != null ? (
                <div>
                  <span className="venue-booking-pay-label">Monto</span>
                  <span className="venue-booking-pay-value">{formatCop(finalCop)}</span>
                </div>
              ) : null}
            </div>
          )}

          <div className="filter-chips venue-booking-chips">
            {(
              [
                instructions.nequi ? "nequi" : null,
                instructions.bankName && instructions.bankAccount ? "bank_transfer" : null,
              ].filter(Boolean) as BookingPaymentMethod[]
            ).map((method) => (
              <button
                key={method}
                type="button"
                className={paymentMethod === method ? "is-on" : undefined}
                aria-pressed={paymentMethod === method}
                onClick={() => setPaymentMethod(method)}
              >
                {bookingPaymentMethodLabel(method)}
              </button>
            ))}
          </div>

          <label>
            Tu WhatsApp <span className="req-mark">*</span>
            <input
              type="tel"
              name="contact_whatsapp"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="3001234567"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              aria-describedby="venue-booking-wa-help"
            />
          </label>
          <p id="venue-booking-wa-help" className="field-help">
            Celular colombiano. El dueño te contacta por acá.
          </p>

          <label>
            Comprobante <span className="req-mark">*</span>
            <input
              type="file"
              name="proof"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
            />
          </label>
          <p className="field-help">JPG, PNG, WEBP o PDF · máx. 5 MB</p>

          <label>
            Nota <span className="field-optional">(opcional)</span>
            <textarea
              name="note"
              rows={2}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Algo que el dueño deba saber…"
            />
          </label>

          <LegalAcceptCheckbox
            {...legal.checkboxProps}
            id="venue-booking-legal"
            disabled={pending}
          />

          {state?.error ? (
            <p className="form-error" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="venue-booking-nav">
            <button type="button" className="btn-ghost" onClick={() => setStep(4)} disabled={pending}>
              Atrás
            </button>
            <button
              type="submit"
              className="btn-flood"
              disabled={!canSubmit || pending}
              aria-busy={pending}
            >
              {pending ? "Enviando…" : "Enviar pedido de turno"}
            </button>
          </div>
        </fieldset>
      ) : null}
    </form>
  );
}
