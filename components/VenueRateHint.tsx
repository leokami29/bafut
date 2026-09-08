"use client";

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
 * Referencia del alquiler de franja al publicar un hueco.
 * No rellena cost_per_person. Override solo si canOverride (colapsado).
 */
export function VenueRateHint({
  venueId,
  sport,
  startsAt,
  durationMin,
  canOverride,
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
    <div className="venue-rate-hint">
      {loading ? <p className="venue-rate-hint-loading">Consultando tarifa…</p> : null}

      {!loading && finalCop != null && preview ? (
        <div className="venue-rate-hint-details" aria-label="Tarifa referencial de la franja">
          <p className="venue-rate-hint-total">
            <span>Alquiler de franja (referencia)</span>
            <strong>{formatMoney(finalCop)}</strong>
          </p>
          {preview.billed_min < durationMin ? (
            <p className="venue-rate-hint-meta">
              Mínimo facturado: {preview.min_minutes} min
            </p>
          ) : null}
          {preview.discount_cop > 0 ? (
            <p className="venue-rate-hint-meta">
              Incluye descuento de {formatMoney(preview.discount_cop)}
            </p>
          ) : null}
        </div>
      ) : null}

      {noTariff ? (
        <p className="venue-rate-hint-empty" role="status">
          Sin tarifa publicada para esta franja.
        </p>
      ) : null}

      {canOverride ? (
        <details className="venue-rate-owner">
          <summary>Opciones de dueño</summary>
          <div className="venue-rate-owner-body">
            <label className="venue-rate-owner-check">
              <input
                type="checkbox"
                checked={useOverride}
                onChange={(e) => setUseOverride(e.target.checked)}
              />
              <span>Registrar tarifa de referencia del dueño</span>
            </label>
            {useOverride ? (
              <label className="venue-rate-owner-input">
                <span>Tarifa de referencia (COP)</span>
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
            ) : null}
            {overrideReady ? (
              <input type="hidden" name="override_price_cop" value={String(overrideValue)} />
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
