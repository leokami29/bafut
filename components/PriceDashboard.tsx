"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sportLabel } from "@/lib/labels";
import { SPORTS, type Sport } from "@/lib/sport-rules";
import { SlotModal } from "@/components/SlotModal";

type PriceSlot = {
  id: string;
  venue_id: string;
  sport: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_cop: number;
};

type PricingDefault = {
  venue_id: string;
  sport: string;
  day_of_week: number;
  default_price_cop: number;
};

type Promotion = {
  id: string;
  venue_id: string;
  sport: string;
  name: string;
  kind: "override_slot" | "discount_pct";
  override_price_cop: number | null;
  discount_pct: number | null;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  date_start: string | null;
  date_end: string | null;
  lead_time_minutes: number;
  active: boolean;
};

type PriceDashboardProps = {
  venueId: string;
  venueName: string;
  sports: string[];
  initialSlots: PriceSlot[];
  initialMin: number;
  initialDefaults: PricingDefault[];
  initialPromotions: Promotion[];
};

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const TIME_SLOTS = Array.from({ length: 35 }, (_, i) => {
  const h = Math.floor(i / 2) + 6;
  const m = (i % 2) * 30;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
});

export function PriceDashboard({
  venueId,
  venueName,
  sports,
  initialSlots,
  initialMin,
  initialDefaults,
  initialPromotions,
}: PriceDashboardProps) {
  const [selectedSport, setSelectedSport] = useState<Sport>(sports[0] as Sport);
  const [slots, setSlots] = useState<PriceSlot[]>(initialSlots.filter((s) => s.sport === selectedSport));
  const [minMinutes, setMinMinutes] = useState(initialMin);
  const [defaults, setDefaults] = useState<Record<number, number>>(
    Object.fromEntries(initialDefaults.filter((d) => d.sport === selectedSport).map((d) => [d.day_of_week, d.default_price_cop])),
  );
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions.filter((p) => p.sport === selectedSport));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    day: number;
    start: string;
    end: string;
    price: number;
    slotId?: string;
  } | null>(null);

  const supabase = createClient();

  const handleOpenModal = (day: number, start: string, end: string, price?: number, slotId?: string) => {
    setModalData({ day, start, end, price: price ?? 60000, slotId });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalData(null);
  };

  const handleSaveSlot = async (start: string, end: string, price: number) => {
    if (!modalData) return;
    setSaving(true);
    setError(null);

    if (modalData.slotId) {
      // Editar franja existente
      const { error } = await supabase.rpc("update_price_slot", {
        p_slot_id: modalData.slotId,
        p_start_time: start,
        p_end_time: end,
        p_price_cop: price,
      });
      if (error) {
        setError(error.message);
      } else {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === modalData.slotId
              ? { ...s, start_time: start, end_time: end, price_cop: price }
              : s,
          ),
        );
        setMessage("Franja actualizada");
      }
    } else {
      // Crear nueva franja
      const { data, error } = await supabase.rpc("create_price_slot", {
        p_venue_id: venueId,
        p_sport: selectedSport,
        p_day_of_week: modalData.day,
        p_start_time: start,
        p_end_time: end,
        p_price_cop: price,
      });
      if (error) {
        setError(error.message);
      } else {
        setSlots((prev) => [
          ...prev,
          {
            id: data,
            venue_id: venueId,
            sport: selectedSport,
            day_of_week: modalData.day,
            start_time: start,
            end_time: end,
            price_cop: price,
          },
        ]);
        setMessage("Franja creada");
      }
    }
    setSaving(false);
  };

  async function handleSaveMin() {
    setSaving(true);
    setError(null);
    const { error } = await supabase.rpc("set_price_min", {
      p_venue_id: venueId,
      p_sport: selectedSport,
      p_min_minutes: minMinutes,
    });
    if (error) {
      setError(error.message);
    } else {
      setMessage("Duración mínima actualizada");
    }
    setSaving(false);
  }

  async function handleSaveDefault(day: number, price: number) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.rpc("set_price_default", {
      p_venue_id: venueId,
      p_sport: selectedSport,
      p_day_of_week: day,
      p_default_price_cop: price,
    });
    if (error) {
      setError(error.message);
    } else {
      setDefaults((prev) => ({ ...prev, [day]: price }));
      setMessage("Precio fallback actualizado");
    }
    setSaving(false);
  }

  async function handleDeleteSlot(slotId: string) {
    setSaving(true);
    setError(null);
    const { error } = await supabase.rpc("delete_price_slot", { p_slot_id: slotId });
    if (error) {
      setError(error.message);
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      setMessage("Franja eliminada");
    }
    setSaving(false);
  }

  return (
    <div className="price-dashboard">
      {/* Selector de deporte */}
      <div className="price-sport-tabs">
        {sports.map((sport) => (
          <button
            key={sport}
            type="button"
            className={`price-sport-tab ${sport === selectedSport ? "is-active" : ""}`}
            onClick={() => {
              setSelectedSport(sport as Sport);
              setSlots(initialSlots.filter((s) => s.sport === sport));
              setDefaults(Object.fromEntries(initialDefaults.filter((d) => d.sport === sport).map((d) => [d.day_of_week, d.default_price_cop])));
              setPromotions(initialPromotions.filter((p) => p.sport === sport));
            }}
          >
            {sportLabel[sport as Sport]}
          </button>
        ))}
      </div>

      {/* Duración mínima */}
      <section className="price-section">
        <h2 className="subhead">Duración mínima</h2>
        <div className="price-min-form">
          <label>
            <span>Mínimo en minutos</span>
            <input
              type="number"
              min={1}
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
            />
          </label>
          <button type="button" className="btn-flood" onClick={handleSaveMin} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </section>

      {/* Precios fallback */}
      <section className="price-section">
        <h2 className="subhead">Precios fallback por día</h2>
        <p className="field-help">
          Precio por día completo cuando no hay franja que cubra la hora.
        </p>
        <div className="price-defaults-grid">
          {DAYS.map((day, idx) => (
            <div key={idx} className="price-default-row">
              <span>{day}</span>
              <input
                type="number"
                min={0}
                placeholder="Sin fallback"
                value={defaults[idx] ?? ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val > 0) {
                    handleSaveDefault(idx, val);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Grilla de franjas */}
      <section className="price-section">
        <h2 className="subhead">Franjas horarias</h2>
        <p className="field-help">
          Click en una celda para crear una franja. Las franjas no pueden solaparse.
        </p>
        <div className="price-grid">
          <div className="price-grid-header">
            <div></div>
            {DAYS.map((day, idx) => (
              <div key={idx} className="price-grid-day">
                {day}
              </div>
            ))}
          </div>
          {TIME_SLOTS.map((time, timeIdx) => (
            <div key={timeIdx} className="price-grid-row">
              <div className="price-grid-time">{time}</div>
              {DAYS.map((_, dayIdx) => {
                const slot = slots.find(
                  (s) => s.day_of_week === dayIdx && s.start_time <= time && s.end_time > time,
                );
                return (
                  <div key={dayIdx} className="price-grid-cell">
                    {slot ? (
                      <div className="price-grid-slot" title={`${slot.start_time}-${slot.end_time}: $${slot.price_cop.toLocaleString()}`}>
                        <span>${(slot.price_cop / 1000).toFixed(0)}k</span>
                      <button
                        type="button"
                        className="price-grid-delete"
                        onClick={() => handleDeleteSlot(slot.id)}
                        disabled={saving}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="price-grid-empty"
                      onClick={() => {
                        const end = TIME_SLOTS[timeIdx + 2] ?? "23:00";
                        handleOpenModal(dayIdx, time, end);
                      }}
                      disabled={saving}
                    >
                      +
                    </button>
                  )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      {/* Promociones */}
      <section className="price-section">
        <h2 className="subhead">Promociones activas</h2>
        {promotions.length === 0 ? (
          <p className="field-help">No hay promociones activas para {sportLabel[selectedSport]}.</p>
        ) : (
          <ul className="price-promotions-list">
            {promotions.map((promo) => (
              <li key={promo.id} className="price-promotion-item">
                <div>
                  <strong>{promo.name}</strong>
                  <span className="price-promotion-kind">
                    {promo.kind === "override_slot" ? `Override: $${promo.override_price_cop?.toLocaleString()}` : `Descuento: ${promo.discount_pct}%`}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    const { error } = await supabase.rpc("deactivate_promotion", { p_promo_id: promo.id });
                    if (!error) {
                      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
                    }
                  }}
                >
                  Desactivar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Mensajes */}
      {message && <p className="form-ok">{message}</p>}
      {error && <p className="form-error">{error}</p>}

      {/* Modal de edición */}
      {modalData && (
        <SlotModal
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveSlot}
          initialStart={modalData.start}
          initialEnd={modalData.end}
          initialPrice={modalData.price}
          isEdit={!!modalData.slotId}
        />
      )}
    </div>
  );
}
