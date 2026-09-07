"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type PricePreviewProps = {
  venueId: string;
  sport: string;
  startsAt: string; // ISO string
  durationMin: number;
  currentPrice: number | null;
  onPriceChange: (price: number | null) => void;
};

type PreviewResult = {
  base_cop: number;
  discount_cop: number;
  final_cop: number;
  billed_min: number;
  min_minutes: number;
  errors: string[];
};

export function PricePreview({
  venueId,
  sport,
  startsAt,
  durationMin,
  currentPrice,
  onPriceChange,
}: PricePreviewProps) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [overridePrice, setOverridePrice] = useState<string>(
    currentPrice ? String(currentPrice) : "",
  );
  const [useOverride, setUseOverride] = useState(currentPrice !== null);

  const supabase = createClient();

  useEffect(() => {
    if (!venueId || !sport || !startsAt || durationMin <= 0) {
      const t = window.setTimeout(() => {
        setPreview(null);
      }, 0);
      return () => window.clearTimeout(t);
    }

    let cancelled = false;
    const t1 = window.setTimeout(() => {
      setLoading(true);
      setError(null);
    }, 0);

    const fetchPreview = async () => {
      const { data, error } = await supabase.rpc("preview_match_price", {
        p_venue_id: venueId,
        p_sport: sport,
        p_starts_at: startsAt,
        p_duration_min: durationMin,
      });

      if (cancelled) return;

      if (error) {
        const t = window.setTimeout(() => {
          setError(error.message);
          setPreview(null);
        }, 0);
        return () => window.clearTimeout(t);
      } else {
        const typed = data as PreviewResult;
        const t = window.setTimeout(() => {
          setPreview(typed);
          setError(null);
          if (!useOverride) {
            onPriceChange(typed.final_cop);
          }
        }, 0);
        return () => window.clearTimeout(t);
      }
      setLoading(false);
    };

    fetchPreview();
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
    };
  }, [venueId, sport, startsAt, durationMin]);

  const handleToggleOverride = (checked: boolean) => {
    setUseOverride(checked);
    if (checked && overridePrice) {
      onPriceChange(Number(overridePrice));
    } else if (preview) {
      onPriceChange(preview.final_cop);
    }
  };

  const handleOverrideChange = (value: string) => {
    setOverridePrice(value);
    if (useOverride && value) {
      onPriceChange(Number(value));
    }
  };

  return (
    <div className="price-preview">
      <h4 className="price-preview-title">Precio calculado</h4>

      {loading && <p className="price-preview-loading">Calculando...</p>}

      {error && <p className="form-error">{error}</p>}

      {preview && !loading && (
        <>
          <div className="price-preview-details">
            <div className="price-preview-row">
              <span>Duración facturada:</span>
              <strong>{preview.billed_min} min</strong>
            </div>
            {preview.billed_min < durationMin && (
              <div className="price-preview-row price-preview-warning">
                <span>⚠️ Duración mínima:</span>
                <strong>{preview.min_minutes} min</strong>
              </div>
            )}
            <div className="price-preview-row">
              <span>Precio base:</span>
              <strong>${preview.base_cop.toLocaleString()}</strong>
            </div>
            {preview.discount_cop > 0 && (
              <div className="price-preview-row price-preview-discount">
                <span>Descuento:</span>
                <strong>-${preview.discount_cop.toLocaleString()}</strong>
              </div>
            )}
            <div className="price-preview-row price-preview-final">
              <span>Total:</span>
              <strong>${preview.final_cop.toLocaleString()}</strong>
            </div>
          </div>

          <label className="price-preview-override">
            <input
              type="checkbox"
              checked={useOverride}
              onChange={(e) => handleToggleOverride(e.target.checked)}
            />
            <span>Usar precio personalizado</span>
          </label>

          {useOverride && (
            <div className="price-preview-override-input">
              <label>
                <span>Precio override (COP)</span>
                <input
                  type="number"
                  min={0}
                  value={overridePrice}
                  onChange={(e) => handleOverrideChange(e.target.value)}
                />
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}
