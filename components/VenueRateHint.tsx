"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

type VenueRateHintProps = {
  venueId: string;
  sport: string;
  /** ISO instant del inicio. */
  startsAt: string;
  durationMin: number;
  /** Solo dueño/admin de esa cancha. */
  canOverride: boolean;
  /** Flag global + booking_enabled + dueño. */
  showBookingLink: boolean;
  bookingHref: string | null;
};

type PreviewResult = {
  base_cop: number;
  discount_cop: number;
  final_cop: number;
  billed_min: number;
  min_minutes: number;
  errors: string[];
};

/**
 * Tarifa de cancha solo como referencia al publicar un hueco.
 * No rellena cost_per_person. Override solo si canOverride.
 */
export function VenueRateHint({
  venueId,
  sport,
  startsAt,
  durationMin,
  canOverride,
  showBookingLink,
  bookingHref,
}: VenueRateHintProps) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [useOverride, setUseOverride] = useState(false);
  const [overridePrice, setOverridePrice] = useState("");

  useEffect(() => {
    if (!venueId || !sport || !startsAt || durationMin <= 0) {
      setPreview(null);
      setLoading(false);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFetchError(null);

    const supabase = createClient();
    void (async () => {
      const { data, error } = await supabase.rpc("preview_match_price", {
        p_venue_id: venueId,
        p_sport: sport,
        p_starts_at: startsAt,
        p_duration_min: durationMin,
      });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        setFetchError(error.message);
        setPreview(null);
        return;
      }
      setPreview(data as PreviewResult);
      setFetchError(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [venueId, sport, startsAt, durationMin]);

  const hasTariffErrors = Boolean(preview?.errors?.length);
  const finalCop =
    preview && !hasTariffErrors && preview.final_cop != null && preview.final_cop > 0
      ? preview.final_cop
      : null;
  const noTariff = !loading && (Boolean(fetchError) || hasTariffErrors || finalCop == null);

  const overrideValue = Number(overridePrice);
  const overrideReady =
    canOverride && useOverride && overridePrice.trim() !== "" && Number.isFinite(overrideValue) && overrideValue >= 0;

  return (
    <div className="price-preview venue-rate-hint">
      <h4 className="price-preview-title">Tarifa de la cancha (referencia)</h4>
      <p className="field-help">
        Es el alquiler de la franja, no el aporte entre jugadores. No se completa solo el aporte.
      </p>

      {loading ? <p className="price-preview-loading">Consultando tarifa…</p> : null}

      {!loading && finalCop != null && preview ? (
        <div className="price-preview-details">
          <div className="price-preview-row">
            <span>Duración facturada:</span>
            <strong>{preview.billed_min} min</strong>
          </div>
          {preview.billed_min < durationMin ? (
            <div className="price-preview-row price-preview-warning">
              <span>Duración mínima:</span>
              <strong>{preview.min_minutes} min</strong>
            </div>
          ) : null}
          <div className="price-preview-row">
            <span>Precio base:</span>
            <strong>{formatMoney(preview.base_cop)}</strong>
          </div>
          {preview.discount_cop > 0 ? (
            <div className="price-preview-row price-preview-discount">
              <span>Descuento:</span>
              <strong>-{formatMoney(preview.discount_cop)}</strong>
            </div>
          ) : null}
          <div className="price-preview-row price-preview-final">
            <span>Total referencial:</span>
            <strong>{formatMoney(finalCop)}</strong>
          </div>
        </div>
      ) : null}

      {noTariff ? (
        <p className="field-help" role="status">
          Esta cancha no tiene tarifa para esa franja. Podés publicar igual.
        </p>
      ) : null}

      {showBookingLink && bookingHref ? (
        <p className="field-help">
          Si querés alquilar la cancha al dueño:{" "}
          <Link href={bookingHref}>Pedir turno</Link>
        </p>
      ) : null}

      {canOverride ? (
        <>
          <label className="price-preview-override">
            <input
              type="checkbox"
              checked={useOverride}
              onChange={(e) => setUseOverride(e.target.checked)}
            />
            <span>Fijar tarifa de cancha (override)</span>
          </label>
          {useOverride ? (
            <div className="price-preview-override-input">
              <label>
                <span>Tarifa override (COP)</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={overridePrice}
                  onChange={(e) => setOverridePrice(e.target.value)}
                  inputMode="numeric"
                  placeholder={finalCop != null ? String(finalCop) : "0"}
                />
              </label>
            </div>
          ) : null}
          {overrideReady ? (
            <input type="hidden" name="override_price_cop" value={String(overrideValue)} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
