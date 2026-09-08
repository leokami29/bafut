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
  BOOKING_PAYMENT_METHODS,
  bookingDurationsForMin,
  bookingPaymentMethodLabel,
  bookingSlotStatusLabel,
  formatBookingMoney,
  listBookingDayKeys,
  listBookingSlotsWithStatus,
  occupyEndMs,
  type BookingDurationMin,
  type BookingPaymentMethod,
  type BookingSlotOption,
  type OccupyInterval,
} from "@/lib/booking";
import type {
  VenuePublicPriceSlot,
  VenuePublicPricingDefault,
  VenuePublicPromotion,
} from "@/lib/data";
import { cityDayBoundsFromLocal, datetimeLocalInZoneToDate, zonedDateParts } from "@/lib/datetime";
import type { Sport } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import { sportLabel } from "@/lib/labels";
import { mapDayOccupancyRpcRow } from "@/lib/occupancy";
import { calculateBasePrice, type PricingConfig } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import {
  formatWhatsappDisplay,
  normalizeWhatsapp,
  whatsappChatHref,
} from "@/lib/whatsapp-contact";

export type VenueBookingFormProps = {
  venueId: string;
  venueSlug: string;
  venueName: string;
  timeZone: string;
  sports: string[];
  minBySport: Record<string, number>;
  promotions: VenuePublicPromotion[];
  pricingSlots: VenuePublicPriceSlot[];
  pricingDefaults: VenuePublicPricingDefault[];
  todayYmd: string;
  /** WhatsApp público de la cancha (pago al dueño, no a BaFut). */
  ownerWhatsapp?: string | null;
};

type Step = 1 | 2;

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

function formatDayChip(dayKey: string, timeZone: string): { weekday: string; date: string } {
  const date = datetimeLocalInZoneToDate(`${dayKey}T12:00`, timeZone);
  if (!date) return { weekday: dayKey, date: "" };
  const weekday = new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    timeZone,
  }).format(date);
  const day = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
  return { weekday, date: day };
}

function formatHmParts(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatSlotLabel(local: string): string {
  const hm = local.split("T")[1] ?? local;
  return hm;
}

function occupiedBandLabel(block: OccupyInterval, timeZone: string): string {
  const start = zonedDateParts(new Date(block.startsAtMs), timeZone);
  const end = zonedDateParts(new Date(occupyEndMs(block)), timeZone);
  const range = `${formatHmParts(start.hour, start.minute)}–${formatHmParts(end.hour, end.minute)}`;
  const kind = block.kind === "booking" ? "Reserva" : "Partido";
  return `${range} · ${kind}`;
}

function promoValueLabel(promo: VenuePublicPromotion): string {
  if (promo.kind === "override_slot") {
    return `Precio cerrado ${formatMoney(promo.override_price_cop)}`;
  }
  return `−${promo.discount_pct}%`;
}

function promoConditions(promo: VenuePublicPromotion): string {
  const bits: string[] = [];
  if (promo.days_of_week?.length) {
    bits.push(promo.days_of_week.map((d) => DAY_SHORT[d] ?? String(d)).join(" · "));
  }
  const start = promo.start_time?.slice(0, 5);
  const end = promo.end_time?.slice(0, 5);
  if (start || end) bits.push(`${start ?? "00:00"}–${end ?? "24:00"}`);
  if (promo.lead_time_minutes > 0) {
    bits.push(`${promo.lead_time_minutes} min de anticipación`);
  }
  return bits.join(" · ") || "Todo el día · todos los días";
}

function buildPricingConfig(
  sport: string,
  slots: VenuePublicPriceSlot[],
  defaults: VenuePublicPricingDefault[],
  minMinutes: number,
): PricingConfig {
  const sportSlots = slots
    .filter((s) => s.sport === sport)
    .map((s) => ({
      id: s.id,
      day_of_week: s.day_of_week,
      start_time: s.start_time.slice(0, 5),
      end_time: s.end_time.slice(0, 5),
      price_cop: s.price_cop,
    }));
  const defaultsMap: Record<number, number> = {};
  for (const d of defaults) {
    if (d.sport === sport) defaultsMap[d.day_of_week] = d.default_price_cop;
  }
  return {
    slots: sportSlots,
    defaults: defaultsMap,
    min_minutes: Math.max(1, minMinutes || 30),
  };
}

function slotHasTariff(
  local: string,
  timeZone: string,
  durationMin: number,
  config: PricingConfig,
): boolean {
  const startsAt = datetimeLocalInZoneToDate(local, timeZone);
  if (!startsAt) return false;
  const parts = zonedDateParts(startsAt, timeZone);
  const startMin = parts.hour * 60 + parts.minute;
  const billed = Math.floor(durationMin / config.min_minutes) * config.min_minutes;
  if (billed <= 0) return false;
  const { errors } = calculateBasePrice(config, parts.weekday, startMin, billed);
  return errors.length === 0;
}

export function VenueBookingForm({
  venueId,
  venueSlug,
  venueName,
  timeZone,
  sports,
  minBySport,
  promotions,
  pricingSlots,
  pricingDefaults,
  todayYmd,
  ownerWhatsapp,
}: VenueBookingFormProps) {
  const legal = useLegalAcceptance("booking");
  const ownerWaDigits = ownerWhatsapp ? normalizeWhatsapp(ownerWhatsapp) : null;
  const ownerWaHref = ownerWaDigits ? whatsappChatHref(ownerWaDigits) : null;
  const ownerWaDisplay = ownerWaDigits ? formatWhatsappDisplay(ownerWaDigits) : null;

  const [step, setStep] = useState<Step>(1);
  const [sport, setSport] = useState<string>(sports[0] ?? "futbol");
  const [dayKey, setDayKey] = useState<string>("");
  const [durationMin, setDurationMin] = useState<BookingDurationMin>(60);
  const [startsAtLocal, setStartsAtLocal] = useState<string>("");
  const [occupied, setOccupied] = useState<OccupyInterval[]>([]);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [occupancyError, setOccupancyError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<BookingPaymentMethod>("nequi");
  const [whatsapp, setWhatsapp] = useState("");
  const [note, setNote] = useState("");
  const [priceOk, setPriceOk] = useState(false);
  const [finalCop, setFinalCop] = useState<number | null>(null);
  const [priceReady, setPriceReady] = useState(false);
  const [priceErrors, setPriceErrors] = useState<string[]>([]);

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

  const sportPromos = useMemo(
    () =>
      promotions.filter((p) => {
        if (p.sport !== sport) return false;
        if (p.date_end && p.date_end < todayYmd) return false;
        return true;
      }),
    [promotions, sport, todayYmd],
  );

  const pricingConfig = useMemo(
    () =>
      buildPricingConfig(
        sport,
        pricingSlots,
        pricingDefaults,
        minBySport[sport] ?? 30,
      ),
    [sport, pricingSlots, pricingDefaults, minBySport],
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
          kind: mapped.block_kind,
        };
      });
      setOccupied(intervals);
    })();
    return () => {
      cancelled = true;
    };
  }, [dayKey, timeZone, venueId]);

  const slotOptions = useMemo(() => {
    if (!dayKey) return [] as BookingSlotOption[];
    return listBookingSlotsWithStatus({
      dayKey,
      durationMin,
      timeZone,
      occupied,
      minMinutes: minBySport[sport],
      hasTariff: (local) => slotHasTariff(local, timeZone, durationMin, pricingConfig),
    });
  }, [dayKey, durationMin, timeZone, occupied, minBySport, sport, pricingConfig]);

  const availableSlots = useMemo(
    () => slotOptions.filter((s) => s.status === "available"),
    [slotOptions],
  );

  const occupiedBands = useMemo(() => {
    return [...occupied]
      .sort((a, b) => a.startsAtMs - b.startsAtMs)
      .map((block) => ({
        key: `${block.startsAtMs}-${block.durationMin}-${block.kind ?? "match"}`,
        label: occupiedBandLabel(block, timeZone),
        kind: block.kind === "booking" ? "booking" : "match",
      }));
  }, [occupied, timeZone]);

  const dayFullyBusy =
    !occupancyLoading &&
    !occupancyError &&
    slotOptions.length > 0 &&
    availableSlots.length === 0 &&
    slotOptions.some(
      (s) =>
        s.status === "occupied_match" ||
        s.status === "occupied_booking" ||
        s.status === "no_fit",
    );

  const dayNoTariff =
    !occupancyLoading &&
    !occupancyError &&
    slotOptions.length > 0 &&
    availableSlots.length === 0 &&
    slotOptions.every(
      (s) => s.status === "no_tariff" || s.status === "too_soon",
    ) &&
    slotOptions.some((s) => s.status === "no_tariff");

  useEffect(() => {
    if (startsAtLocal && !availableSlots.some((s) => s.local === startsAtLocal)) {
      setStartsAtLocal("");
    }
  }, [availableSlots, startsAtLocal]);

  const startsAtIso = useMemo(() => {
    if (!startsAtLocal) return "";
    return datetimeLocalInZoneToDate(startsAtLocal, timeZone)?.toISOString() ?? "";
  }, [startsAtLocal, timeZone]);

  const onPreviewChange = useCallback(
    (preview: { finalCop: number | null; errors: string[]; minMinutes: number | null }) => {
      setFinalCop(preview.finalCop);
      setPriceErrors(preview.errors);
      const ok =
        preview.finalCop != null && preview.finalCop > 0 && preview.errors.length === 0;
      setPriceOk(ok);
      // Mientras recalcula, BookingPricePreview manda finalCop null sin errors.
      setPriceReady(preview.finalCop != null || preview.errors.length > 0);
    },
    [],
  );

  useEffect(() => {
    setPriceReady(false);
    setPriceOk(false);
    setFinalCop(null);
    setPriceErrors([]);
  }, [startsAtLocal, durationMin, sport]);

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
          Tu reserva en <strong>{venueName}</strong> quedó en hold {BOOKING_HOLD_HOURS} h
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
            Ver mis reservas
          </Link>
          <Link href={`/canchas/${venueSlug}`} className="btn-ghost empty-home-ghost">
            Volver a la ficha
          </Link>
        </div>
      </div>
    );
  }

  const canGoPay = Boolean(sport && dayKey && durationMin && startsAtLocal && priceOk);
  const canSubmit =
    canGoPay &&
    finalCop != null &&
    legal.accepted &&
    Boolean(whatsapp.trim());

  const dayChip = dayKey ? formatDayChip(dayKey, timeZone) : null;
  const selectionSummary = (
    <p className="venue-booking-summary">
      <span>{sportLabel[sport as Sport] ?? sport}</span>
      <span aria-hidden="true">·</span>
      <span>
        {dayChip ? `${dayChip.weekday} ${dayChip.date}` : "—"}
      </span>
      <span aria-hidden="true">·</span>
      <span>{startsAtLocal ? formatSlotLabel(startsAtLocal) : "—"}</span>
      <span aria-hidden="true">·</span>
      <span>{durationMin} min</span>
    </p>
  );

  return (
    <form action={formAction} className="venue-booking-form stack-form match-compose">
      <input type="hidden" name="venue_id" value={venueId} />
      <input type="hidden" name="sport" value={sport} />
      <input type="hidden" name="starts_at" value={startsAtLocal} />
      <input type="hidden" name="duration_min" value={durationMin} />
      <input type="hidden" name="payment_method" value={paymentMethod} />

      <div className="match-compose-progress" aria-label={`Paso ${step} de 2`}>
        <div className="match-compose-progress-track" aria-hidden="true">
          <span className={step >= 1 ? "is-on" : undefined} />
          <span className={step >= 2 ? "is-on" : undefined} />
        </div>
        <ol className="venue-booking-steps">
          <li className={step === 1 ? "is-current" : "is-done"}>Horario y precio</li>
          <li className={step === 2 ? "is-current" : undefined}>Pago</li>
        </ol>
      </div>

      {step === 1 ? (
        <div className="venue-booking-step venue-booking-step-schedule">
          {sports.length > 1 ? (
            <fieldset className="match-compose-group">
              <legend className="match-compose-legend">Deporte</legend>
              <div className="filter-chips venue-booking-chips" role="group" aria-label="Deporte">
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
            </fieldset>
          ) : (
            <p className="venue-booking-sport-solo">
              <span className="venue-booking-meta-label">Deporte</span>{" "}
              {sportLabel[sport as Sport] ?? sport}
            </p>
          )}

          {sportPromos.length > 0 ? (
            <section className="venue-booking-promos" aria-labelledby="venue-booking-promos-title">
              <h2 className="venue-booking-promos-title" id="venue-booking-promos-title">
                Promos activas
              </h2>
              <ul className="venue-booking-promos-list">
                {sportPromos.map((promo) => (
                  <li key={promo.id} className="venue-booking-promo">
                    <div className="venue-booking-promo-main">
                      <strong className="venue-booking-promo-name">{promo.name}</strong>
                      <span className="venue-booking-promo-value">{promoValueLabel(promo)}</span>
                    </div>
                    <p className="venue-booking-promo-cond">{promoConditions(promo)}</p>
                    {promo.date_start && promo.date_start > todayYmd ? (
                      <p className="venue-booking-promo-soon">
                        Vigente desde {promo.date_start}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <fieldset className="match-compose-group">
            <legend className="match-compose-legend">Día</legend>
            <div
              className="venue-booking-days"
              role="group"
              aria-label={`Días (hasta ${BOOKING_MAX_HORIZON_DAYS} adelante)`}
            >
              {dayKeys.map((key) => {
                const chip = formatDayChip(key, timeZone);
                const isToday = key === todayYmd;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`venue-booking-day${dayKey === key ? " is-on" : ""}`}
                    aria-pressed={dayKey === key}
                    onClick={() => {
                      setDayKey(key);
                      setStartsAtLocal("");
                    }}
                  >
                    <span className="venue-booking-day-weekday">
                      {isToday ? "Hoy" : chip.weekday}
                    </span>
                    <span className="venue-booking-day-date">{chip.date}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="match-compose-group">
            <legend className="match-compose-legend">Duración</legend>
            <div className="filter-chips venue-booking-chips" role="group" aria-label="Duración">
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
            {minBySport[sport] != null && minBySport[sport]! > 30 ? (
              <p className="field-help">
                Mínimo de esta cancha: {minBySport[sport]} min
              </p>
            ) : null}
          </fieldset>

          <fieldset className="match-compose-group">
            <legend className="match-compose-legend">Hora de inicio</legend>
            <p className="field-help venue-booking-slot-legend">
              Libre · Ocupado / Partido = ya hay reserva o partido en esa media hora · No cabe =
              no podés empezar aquí con la duración elegida · sin tarifa · lead{" "}
              {BOOKING_MIN_LEAD_HOURS} h
            </p>
            {occupancyLoading ? (
              <p className="field-help" aria-live="polite">
                Cargando ocupación…
              </p>
            ) : occupancyError ? (
              <p className="form-error" role="alert">
                No se pudo cargar la ocupación: {occupancyError}
              </p>
            ) : (
              <>
                {occupiedBands.length > 0 ? (
                  <ul
                    className="venue-booking-occupied-bands"
                    aria-label="Franjas ya ocupadas"
                  >
                    {occupiedBands.map((band) => (
                      <li
                        key={band.key}
                        className={`venue-booking-occupied-band is-${band.kind}`}
                      >
                        {band.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {dayNoTariff ? (
                  <div className="venue-booking-empty" role="status">
                    <p>
                      No hay tarifa para las franjas de este día con {durationMin} min. Probá
                      otro día o pedile al dueño que complete precios.
                    </p>
                  </div>
                ) : null}
                {dayFullyBusy ? (
                  <div className="venue-booking-empty" role="status">
                    <p>
                      Ese día no tiene inicio libre con {durationMin} min (hay reservas o
                      partidos). Probá otra fecha o otra duración.
                    </p>
                  </div>
                ) : null}
                {!dayNoTariff &&
                !dayFullyBusy &&
                availableSlots.length === 0 &&
                slotOptions.length > 0 &&
                slotOptions.every((s) => s.status === "too_soon") ? (
                  <div className="venue-booking-empty" role="status">
                    <p>
                      Ya no hay horarios con lead de {BOOKING_MIN_LEAD_HOURS} h para hoy.
                      Elegí otro día.
                    </p>
                  </div>
                ) : null}
                {slotOptions.length > 0 ? (
                  <div
                    className="venue-booking-slots"
                    role="group"
                    aria-label="Horarios de inicio"
                  >
                    {slotOptions.map((slot) => {
                      const selectable = slot.status === "available";
                      const selected = startsAtLocal === slot.local;
                      return (
                        <button
                          key={slot.local}
                          type="button"
                          className={`venue-booking-slot is-${slot.status}${selected ? " is-on" : ""}`}
                          disabled={!selectable}
                          aria-pressed={selectable ? selected : undefined}
                          aria-label={`${slot.hm} · ${bookingSlotStatusLabel(slot.status)}`}
                          title={bookingSlotStatusLabel(slot.status)}
                          onClick={() => {
                            if (selectable) setStartsAtLocal(slot.local);
                          }}
                        >
                          <span className="venue-booking-slot-time">{slot.hm}</span>
                          {slot.status !== "available" ? (
                            <span className="venue-booking-slot-tag">
                              {bookingSlotStatusLabel(slot.status)}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : !occupancyLoading ? (
                  <div className="venue-booking-empty" role="status">
                    <p>No hay franjas para esa duración en el día elegido.</p>
                  </div>
                ) : null}
              </>
            )}
          </fieldset>

          {startsAtLocal ? (
            <div className="venue-booking-live-price">
              {selectionSummary}
              {startsAtIso ? (
                <BookingPricePreview
                  venueId={venueId}
                  sport={sport}
                  startsAtIso={startsAtIso}
                  durationMin={durationMin}
                  onPreviewChange={onPreviewChange}
                />
              ) : null}
            </div>
          ) : null}

          {startsAtLocal && priceReady && !priceOk ? (
            <p className="form-error" role="alert">
              {priceErrors[0] ??
                "Esta franja no tiene tarifa usable. Elegí otra hora o día."}
            </p>
          ) : null}

          <div className="venue-booking-nav">
            <button
              type="button"
              className="btn-flood"
              disabled={!canGoPay}
              onClick={() => setStep(2)}
            >
              {finalCop != null
                ? `Seguir al pago · ${formatBookingMoney(finalCop)}`
                : "Seguir al pago"}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <fieldset className="match-compose-group venue-booking-step">
          <legend className="match-compose-legend">Pago y comprobante</legend>
          {selectionSummary}
          {startsAtIso ? (
            <BookingPricePreview
              venueId={venueId}
              sport={sport}
              startsAtIso={startsAtIso}
              durationMin={durationMin}
              onPreviewChange={onPreviewChange}
            />
          ) : null}
          <p className="field-help">
            El pago va al dueño de la cancha (no a BaFut). Transferí o pagá por Nequi como
            acuerden
            {finalCop != null ? ` · monto ${formatBookingMoney(finalCop)}` : ""} y subí el
            comprobante. El dueño confirma la reserva.
          </p>

          <div className="venue-booking-pay-instructions">
            {ownerWaHref && ownerWaDisplay ? (
              <div>
                <span className="venue-booking-pay-label">Pago al dueño</span>
                <span className="venue-booking-pay-value">
                  Pedí Nequi / transferencia por WhatsApp
                  <br />
                  <a href={ownerWaHref} target="_blank" rel="noopener noreferrer">
                    {ownerWaDisplay}
                  </a>
                </span>
              </div>
            ) : (
              <div>
                <span className="venue-booking-pay-label">Pago al dueño</span>
                <span className="venue-booking-pay-value">
                  Coordiná Nequi o transferencia con el dueño y subí el comprobante acá.
                </span>
              </div>
            )}
            {finalCop != null ? (
              <div>
                <span className="venue-booking-pay-label">Monto</span>
                <span className="venue-booking-pay-value">
                  {formatBookingMoney(finalCop)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="filter-chips venue-booking-chips" role="group" aria-label="Método de pago">
            {BOOKING_PAYMENT_METHODS.map((method) => (
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
          <p className="field-help">Indicá cómo le pagaste al dueño.</p>

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
            <button type="button" className="btn-ghost" onClick={() => setStep(1)} disabled={pending}>
              Atrás
            </button>
            <button
              type="submit"
              className="btn-flood"
              disabled={!canSubmit || pending}
              aria-busy={pending}
            >
              {pending ? "Enviando…" : "Enviar reserva"}
            </button>
          </div>
        </fieldset>
      ) : null}
    </form>
  );
}
