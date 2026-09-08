"use client";

import { useEffect, useRef, useState } from "react";
import {
  computeBookingDeposit,
  formatBookingMoney,
  normalizeBookingDepositPct,
  type BookingDepositPct,
} from "@/lib/booking";
import { createClient } from "@/lib/supabase/client";

type BookingPricePreviewProps = {
  venueId: string;
  sport: string;
  /** ISO instant del inicio. */
  startsAtIso: string;
  durationMin: number;
  /** % de abono inicial (página); se refresca en vivo desde venues. */
  depositPct?: number;
  /** Fuerza un recálculo (p. ej. tras BOOKING_PRICE_CHANGED). */
  refreshKey?: number;
  onPreviewChange?: (preview: {
    finalCop: number | null;
    depositCop: number | null;
    depositPct: BookingDepositPct;
    errors: string[];
    minMinutes: number | null;
  }) => void;
};

type PreviewResult = {
  base_cop: number;
  discount_cop: number;
  final_cop: number;
  billed_min: number;
  min_minutes: number;
  errors: string[];
};

/** Precio del alquiler (sin override): mismo RPC que partidos + abono vivo del venue. */
export function BookingPricePreview({
  venueId,
  sport,
  startsAtIso,
  durationMin,
  depositPct: depositPctProp = 100,
  refreshKey = 0,
  onPreviewChange,
}: BookingPricePreviewProps) {
  const [depositPct, setDepositPct] = useState<BookingDepositPct>(
    normalizeBookingDepositPct(depositPctProp),
  );
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onPreviewChange);
  onChangeRef.current = onPreviewChange;

  useEffect(() => {
    setDepositPct(normalizeBookingDepositPct(depositPctProp));
  }, [depositPctProp]);

  useEffect(() => {
    if (!venueId || !sport || !startsAtIso || durationMin <= 0) {
      setPreview(null);
      setLoading(false);
      setError(null);
      onChangeRef.current?.({
        finalCop: null,
        depositCop: null,
        depositPct,
        errors: [],
        minMinutes: null,
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    // Bloquear submit mientras recalcula (finalCop null / sin tarifa usable).
    onChangeRef.current?.({
      finalCop: null,
      depositCop: null,
      depositPct,
      errors: [],
      minMinutes: null,
    });

    const supabase = createClient();
    void (async () => {
      const [priceRes, venueRes] = await Promise.all([
        supabase.rpc("preview_match_price", {
          p_venue_id: venueId,
          p_sport: sport,
          p_starts_at: startsAtIso,
          p_duration_min: durationMin,
        }),
        supabase
          .from("venues")
          .select("booking_deposit_pct")
          .eq("id", venueId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setLoading(false);

      const livePct = normalizeBookingDepositPct(
        venueRes.data?.booking_deposit_pct ?? depositPctProp,
      );
      setDepositPct(livePct);

      if (priceRes.error) {
        setError(priceRes.error.message);
        setPreview(null);
        onChangeRef.current?.({
          finalCop: null,
          depositCop: null,
          depositPct: livePct,
          errors: [priceRes.error.message],
          minMinutes: null,
        });
        return;
      }
      const typed = priceRes.data as PreviewResult;
      const errors = typed.errors ?? [];
      const hasErrors = errors.length > 0;
      const finalCop =
        hasErrors || typed.final_cop == null || typed.final_cop <= 0
          ? null
          : typed.final_cop;
      const depositCop =
        finalCop == null ? null : computeBookingDeposit(finalCop, livePct).depositCop;
      setPreview(typed);
      setError(null);
      onChangeRef.current?.({
        finalCop,
        depositCop,
        depositPct: livePct,
        errors,
        minMinutes: typed.min_minutes ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [venueId, sport, startsAtIso, durationMin, depositPctProp, refreshKey]);

  const depositBreakdown =
    preview && preview.final_cop > 0
      ? computeBookingDeposit(preview.final_cop, depositPct)
      : null;

  return (
    <div className="booking-price-preview price-preview">
      <h3 className="price-preview-title">Precio de la reserva</h3>
      {loading ? <p className="price-preview-loading">Calculando…</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {preview && !loading ? (
        <div className="price-preview-details">
          <div className="price-preview-row">
            <span>Duración facturada</span>
            <strong>{preview.billed_min} min</strong>
          </div>
          <div className="price-preview-row">
            <span>Base</span>
            <strong>{formatBookingMoney(preview.base_cop)}</strong>
          </div>
          {preview.discount_cop > 0 ? (
            <div className="price-preview-row price-preview-discount">
              <span>Descuento</span>
              <strong>−{formatBookingMoney(preview.discount_cop)}</strong>
            </div>
          ) : null}
          <div className="price-preview-row">
            <span>Total franja</span>
            <strong>{formatBookingMoney(preview.final_cop)}</strong>
          </div>
          {depositBreakdown ? (
            <>
              <div className="price-preview-row price-preview-final">
                <span>
                  {depositPct < 100
                    ? `Abono ${depositPct}% a pagar ahora`
                    : "A pagar ahora"}
                </span>
                <strong>{formatBookingMoney(depositBreakdown.depositCop)}</strong>
              </div>
              {depositPct < 100 ? (
                <div className="price-preview-row">
                  <span>Resto en la cancha</span>
                  <strong>{formatBookingMoney(depositBreakdown.remainderCop)}</strong>
                </div>
              ) : null}
            </>
          ) : null}
          {(preview.errors?.length ?? 0) > 0 ? (
            <p className="form-error" role="alert">
              Esta cancha no tiene tarifa para ese horario. Probá otro día/hora o
              pedile al dueño que configure precios.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
