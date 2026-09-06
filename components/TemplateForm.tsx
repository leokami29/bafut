"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SPORTS, type Sport } from "@/lib/constants";
import { sportLabel } from "@/lib/labels";
import { VenuePicker } from "@/components/VenuePicker";
import { VenueMapLazy } from "@/components/VenueMapLazy";
import type { Venue } from "@/lib/types";

const DAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
];

type TemplateFormProps = {
  venues: Venue[];
  userId: string;
  editTemplate?: {
    id: string;
    venue_id: string;
    sport: string;
    format: string;
    day_of_week: number;
    starts_at_time: string;
    duration_min: number;
    open_count: number;
    cost_per_person: number | null;
    gender_policy: string;
    notes: string | null;
  } | null;
};

export function TemplateForm({ venues, userId, editTemplate }: TemplateFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [venueId, setVenueId] = useState(editTemplate?.venue_id ?? "");
  const [sport, setSport] = useState<Sport>(
    (editTemplate?.sport as Sport) ?? "futbol",
  );
  const [format, setFormat] = useState(editTemplate?.format ?? "5v5");
  const [dayOfWeek, setDayOfWeek] = useState(editTemplate?.day_of_week ?? 4);
  const [time, setTime] = useState(
    editTemplate?.starts_at_time ?? "19:00",
  );
  const [duration, setDuration] = useState(editTemplate?.duration_min ?? 60);
  const [openCount, setOpenCount] = useState(editTemplate?.open_count ?? 5);
  const [cost, setCost] = useState(
    editTemplate?.cost_per_person?.toString() ?? "",
  );
  const [gender, setGender] = useState(editTemplate?.gender_policy ?? "mixed");
  const [notes, setNotes] = useState(editTemplate?.notes ?? "");

  const sportVenues = venues.filter((v) => v.sports.includes(sport));
  const selectedVenue = sportVenues.find((v) => v.id === venueId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const supabase = createClient();
    const costNum = cost.trim() === "" ? null : Number(cost);

    const payload = {
      host_id: userId,
      venue_id: venueId,
      sport,
      format,
      day_of_week: dayOfWeek,
      starts_at_time: time,
      duration_min: duration,
      open_count: openCount,
      cost_per_person: costNum,
      gender_policy: gender,
      notes: notes.trim() || null,
    };

    let result;
    if (editTemplate) {
      result = await supabase
        .from("match_templates")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editTemplate.id)
        .eq("host_id", userId);
    } else {
      result = await supabase
        .from("match_templates")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(
        editTemplate
          ? "Template actualizado. Los partidos se crearán automáticamente."
          : "Template creado. Los partidos se crearán automáticamente cada semana.",
      );
      router.refresh();
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="stack-form match-compose">
      <div className="match-compose-layout">
        <div className="match-compose-primary">
          <VenuePicker
            venues={sportVenues}
            defaultVenueId={venueId}
            onVenueChange={(id) => setVenueId(id)}
          />

          <label>
            <span className="match-compose-field-label">
              Deporte <span className="req-mark">*</span>
            </span>
            <select
              required
              value={sport}
              onChange={(e) => setSport(e.target.value as Sport)}
            >
              {SPORTS.map((s) => (
                <option key={s} value={s}>
                  {sportLabel[s]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="match-compose-field-label">
              Formato <span className="req-mark">*</span>
            </span>
            <select
              required
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="5v5">5 vs 5</option>
              <option value="7v7">7 vs 7</option>
              <option value="11v11">11 vs 11</option>
            </select>
          </label>

          <label>
            <span className="match-compose-field-label">
              Día de la semana <span className="req-mark">*</span>
            </span>
            <select
              required
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="match-compose-field-label">
              Hora <span className="req-mark">*</span>
            </span>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>

          <label>
            <span className="match-compose-field-label">
              Duración (minutos) <span className="req-mark">*</span>
            </span>
            <select
              required
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={60}>60 min</option>
              <option value={90}>90 min</option>
            </select>
          </label>

          <label>
            <span className="match-compose-field-label">
              Cupos abiertos <span className="req-mark">*</span>
            </span>
            <input
              type="number"
              required
              min={1}
              max={12}
              value={openCount}
              onChange={(e) => setOpenCount(Number(e.target.value))}
            />
          </label>

          <label>
            <span className="match-compose-field-label">
              Costo por persona (COP) <span className="field-optional">(opcional)</span>
            </span>
            <input
              type="number"
              min={0}
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0 = gratis"
            />
          </label>

          <label>
            <span className="match-compose-field-label">
              Género <span className="req-mark">*</span>
            </span>
            <select
              required
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="mixed">Mixto</option>
              <option value="men">Solo hombres</option>
              <option value="women">Solo mujeres</option>
            </select>
          </label>

          <label>
            <span className="match-compose-field-label">
              Notas <span className="field-optional">(opcional)</span>
            </span>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </label>

          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-ok">{success}</p>}

          <div className="match-compose-actions-inline">
            <button type="submit" className="btn-flood" disabled={pending}>
              {pending ? "Guardando…" : editTemplate ? "Actualizar" : "Crear template"}
            </button>
          </div>
        </div>

        <aside className="match-compose-aside">
          {selectedVenue ? (
            <div className="match-compose-venue">
              <h3 className="subhead">Cancha seleccionada</h3>
              <p className="venue-picker-chosen">
                <strong>{selectedVenue.name}</strong>
                {selectedVenue.neighborhood && (
                  <span className="venue-picker-chosen-meta"> · {selectedVenue.neighborhood}</span>
                )}
              </p>
              <div className="venue-map-wrap venue-map-detail">
                <VenueMapLazy
                  venues={[selectedVenue]}
                  center={{ lat: selectedVenue.lat, lng: selectedVenue.lng }}
                  focusId={selectedVenue.id}
                />
              </div>
            </div>
          ) : (
            <div className="match-compose-aside-empty">
              <p className="match-compose-aside-kicker">Cancha</p>
              <p>Buscá y elegí una cancha para ver su ubicación en el mapa.</p>
            </div>
          )}
        </aside>
      </div>
    </form>
  );
}
