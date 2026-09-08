"use client";

import { useEffect, useRef, useState } from "react";
import { formatBookingMoney } from "@/lib/booking";
import { createClient } from "@/lib/supabase/client";

type BookingPricePreviewProps = {
  venueId: string;
  sport: string;
  /** ISO instant del inicio. */
  startsAtIso: string;
  durationMin: number;
  onPreviewChange?: (preview: {
    finalCop: number | null;
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

/** Precio del alquiler (sin override): mismo RPC que partidos. */
export function BookingPricePreview({
  venueId,
  sport,
  startsAtIso,
  durationMin,
  onPreviewChange,
}: BookingPricePreviewProps) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onChangeRef = useRef(onPreviewChange);
  onChangeRef.current = onPreviewChange;

  useEffect(() => {
    if (!venueId || !sport || !startsAtIso || durationMin <= 0) {
      setPreview(null);
      setLoading(false);
      setError(null);
      onChangeRef.current?.({ finalCop: null, errors: [], minMinutes: null });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreview(null);
    // Bloquear submit mientras recalcula (finalCop null / sin tarifa usable).
    onChangeRef.current?.({ finalCop: null, errors: [], minMinutes: null });

    const supabase = createClient();
    void (async () => {
      const { data, error: rpcError } = await supabase.rpc("preview_match_price", {
        p_venue_id: venueId,
        p_sport: sport,
        p_starts_at: startsAtIso,
        p_duration_min: durationMin,
      });
      if (cancelled) return;
      setLoading(false);
      if (rpcError) {
        setError(rpcError.message);
        setPreview(null);
        onChangeRef.current?.({
          finalCop: null,
          errors: [rpcError.message],
          minMinutes: null,
        });
        return;
      }
      const typed = data as PreviewResult;
      const errors = typed.errors ?? [];
      const hasErrors = errors.length > 0;
      const finalCop =
        hasErrors || typed.final_cop == null || typed.final_cop <= 0
          ? null
          : typed.final_cop;
      setPreview(typed);
      setError(null);
      onChangeRef.current?.({
        finalCop,
        errors,
        minMinutes: typed.min_minutes ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [venueId, sport, startsAtIso, durationMin]);

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
          <div className="price-preview-row price-preview-final">
            <span>Total a pagar</span>
            <strong>{formatBookingMoney(preview.final_cop)}</strong>
          </div>
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
