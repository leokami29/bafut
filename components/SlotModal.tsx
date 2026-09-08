"use client";

import { useEffect, useState } from "react";

type SlotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (start: string, end: string, price: number) => void;
  dayLabel?: string;
  initialStart?: string;
  initialEnd?: string;
  initialPrice?: number;
  isEdit?: boolean;
};

export function SlotModal({
  isOpen,
  onClose,
  onSave,
  dayLabel,
  initialStart = "06:00",
  initialEnd = "07:00",
  initialPrice = 60000,
  isEdit = false,
}: SlotModalProps) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [price, setPrice] = useState(initialPrice);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (start >= end) {
      setError("La hora de inicio debe ser anterior a la de fin");
      return;
    }

    if (price <= 0) {
      setError("El precio debe ser mayor a cero");
      return;
    }

    onSave(start, end, price);
  };

  return (
    <div className="slot-modal-overlay" onClick={onClose}>
      <div
        className="slot-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slot-modal-title"
      >
        <h3 className="slot-modal-title" id="slot-modal-title">
          {isEdit ? "Editar franja" : "Nueva franja"}
          {dayLabel ? <span className="slot-modal-day"> · {dayLabel}</span> : null}
        </h3>
        <form onSubmit={handleSubmit} className="slot-modal-form">
          <div className="slot-modal-row">
            <div className="slot-modal-field">
              <label>
                <span>Hora de inicio</span>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                  autoFocus
                />
              </label>
            </div>
            <div className="slot-modal-field">
              <label>
                <span>Hora de fin</span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </label>
            </div>
          </div>
          <div className="slot-modal-field">
            <label>
              <span>Precio por hora (COP)</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
              />
            </label>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="slot-modal-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-flood">
              {isEdit ? "Guardar cambios" : "Crear franja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
