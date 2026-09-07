"use client";

import { useEffect, useState, type FormEvent } from "react";

export type PromotionDraft = {
  name: string;
  kind: "override_slot" | "discount_pct";
  value: number;
  days: number[] | null;
  timeFrom: string | null;
  timeTo: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  leadMinutes: number;
};

type PromotionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: PromotionDraft) => void;
  busy?: boolean;
};

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function PromotionModal({ isOpen, onClose, onSave, busy = false }: PromotionModalProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"discount_pct" | "override_slot">("discount_pct");
  const [pct, setPct] = useState("20");
  const [override, setOverride] = useState("30000");
  const [allDays, setAllDays] = useState(true);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4]);
  const [withTime, setWithTime] = useState(true);
  const [from, setFrom] = useState("06:00");
  const [to, setTo] = useState("17:00");
  const [lead, setLead] = useState("0");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    );
    setAllDays(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (name.trim().length < 3) {
      setError("Poné un nombre reconocible (ej: “Valle tarde”).");
      return;
    }
    const value = kind === "discount_pct" ? Number(pct) : Number(override);
    if (kind === "discount_pct" && (value < 1 || value > 90)) {
      setError("El descuento debe estar entre 1% y 90%.");
      return;
    }
    if (kind === "override_slot" && (!Number.isFinite(value) || value <= 0)) {
      setError("El precio cerrado debe ser mayor a cero.");
      return;
    }
    if (withTime && from >= to) {
      setError("La hora de inicio debe ser anterior a la de fin.");
      return;
    }
    if (!allDays && days.length === 0) {
      setError("Elegí al menos un día o marcá “todos los días”.");
      return;
    }

    onSave({
      name: name.trim(),
      kind,
      value,
      days: allDays ? null : days,
      timeFrom: withTime ? from : null,
      timeTo: withTime ? to : null,
      dateFrom: null,
      dateTo: null,
      leadMinutes: Number(lead) || 0,
    });
  }

  return (
    <div className="slot-modal-overlay" onClick={onClose}>
      <div
        className="slot-modal promo-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-modal-title"
      >
        <h3 className="slot-modal-title" id="promo-modal-title">
          Nueva promoción
        </h3>
        <form onSubmit={handleSubmit} className="slot-modal-form">
          <label className="slot-modal-field">
            <span>Nombre</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Valle de la tarde"
              autoFocus
              required
            />
          </label>

          <div className="promo-kind" role="radiogroup" aria-label="Tipo de promoción">
            <label className={`promo-kind-option${kind === "discount_pct" ? " is-on" : ""}`}>
              <input
                type="radio"
                name="kind"
                value="discount_pct"
                checked={kind === "discount_pct"}
                onChange={() => setKind("discount_pct")}
              />
              <strong>Descuento %</strong>
              <span>Resta un porcentaje al precio calculado.</span>
            </label>
            <label className={`promo-kind-option${kind === "override_slot" ? " is-on" : ""}`}>
              <input
                type="radio"
                name="kind"
                value="override_slot"
                checked={kind === "override_slot"}
                onChange={() => setKind("override_slot")}
              />
              <strong>Precio cerrado</strong>
              <span>Reemplaza el precio calculado por uno fijo.</span>
            </label>
          </div>

          {kind === "discount_pct" ? (
            <label className="slot-modal-field">
              <span>Descuento (%)</span>
              <input
                type="number"
                min={1}
                max={90}
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                required
              />
            </label>
          ) : (
            <label className="slot-modal-field">
              <span>Precio por bloque (COP)</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                required
              />
            </label>
          )}

          <fieldset className="promo-days" disabled={busy}>
            <legend>Días que aplica</legend>
            <label className={`promo-day promo-day-all${allDays ? " is-on" : ""}`}>
              <input type="checkbox" checked={allDays} onChange={(e) => setAllDays(e.target.checked)} />
              <span>Todos los días</span>
            </label>
            {!allDays ? (
              <div className="promo-day-chips">
                {DAY_SHORT.map((label, idx) => (
                  <label key={label} className={`promo-day-chip${days.includes(idx) ? " is-on" : ""}`}>
                    <input
                      type="checkbox"
                      checked={days.includes(idx)}
                      onChange={() => toggleDay(idx)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>

          <div className="promo-window">
            <label className={`promo-check${withTime ? " is-on" : ""}`}>
              <input
                type="checkbox"
                checked={withTime}
                onChange={(e) => setWithTime(e.target.checked)}
              />
              <span>Solo en este horario</span>
            </label>
            {withTime ? (
              <div className="promo-time-row">
                <label className="slot-modal-field">
                  <span>Desde</span>
                  <input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
                </label>
                <label className="slot-modal-field">
                  <span>Hasta</span>
                  <input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
              </div>
            ) : null}
          </div>

          <label className="slot-modal-field">
            <span>Margen de aviso (min) — opcional</span>
            <input
              type="number"
              min={0}
              step={15}
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="slot-modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-flood" disabled={busy}>
              {busy ? "Creando…" : "Crear promoción"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
