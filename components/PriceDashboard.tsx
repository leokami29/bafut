"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/sport-rules";
import { SlotModal } from "@/components/SlotModal";
import { PromotionModal } from "@/components/PromotionModal";

export type PriceSlot = {
  id: string;
  venue_id: string;
  sport: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_cop: number;
};

export type PricingDefault = {
  venue_id: string;
  sport: string;
  day_of_week: number;
  default_price_cop: number;
};

export type Promotion = {
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

export type PriceSectionTab = "semana" | "minimo" | "promos";

type PriceDashboardProps = {
  venueId: string;
  venueSlug: string;
  sports: string[];
  initialSlots: PriceSlot[];
  initialMins: Array<{ sport: string; min_minutes: number }>;
  initialDefaults: PricingDefault[];
  initialPromotions: Promotion[];
  initialTab?: PriceSectionTab;
  openCreatePromo?: boolean;
};

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const MIN_PRESETS = [30, 45, 60, 90];

function formatCop(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

function parsePriceTab(raw: string | null | undefined): PriceSectionTab {
  if (raw === "minimo" || raw === "promos" || raw === "semana") return raw;
  return "semana";
}

export function PriceDashboard({
  venueId,
  venueSlug,
  sports,
  initialSlots,
  initialMins,
  initialDefaults,
  initialPromotions,
  initialTab = "semana",
  openCreatePromo = false,
}: PriceDashboardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedSport, setSelectedSport] = useState<Sport>(sports[0] as Sport);
  const [slots, setSlots] = useState<PriceSlot[]>(initialSlots);
  const [mins, setMins] = useState<Record<string, number>>(
    () => Object.fromEntries(initialMins.map((m) => [m.sport, m.min_minutes])),
  );
  const [defaults, setDefaults] = useState<PricingDefault[]>(initialDefaults);
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [slotModal, setSlotModal] = useState<{
    day: number;
    start: string;
    end: string;
    price: number;
    slotId?: string;
  } | null>(null);
  const [promoModal, setPromoModal] = useState<{ edit?: Promotion } | null>(
    openCreatePromo ? {} : null,
  );
  const [section, setSection] = useState<PriceSectionTab>(initialTab);

  const supabase = createClient();

  useEffect(() => {
    setSection(parsePriceTab(searchParams.get("tab") ?? initialTab));
  }, [searchParams, initialTab]);

  useEffect(() => {
    if (openCreatePromo || searchParams.get("crear") === "1") {
      setSection("promos");
      setPromoModal({});
    }
  }, [openCreatePromo, searchParams]);

  function setSectionTab(next: PriceSectionTab) {
    setSection(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "semana") params.delete("tab");
    else params.set("tab", next);
    params.delete("crear");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function openPromoCreate() {
    setSection("promos");
    setPromoModal({});
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "promos");
    params.set("crear", "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function closePromoModal() {
    setPromoModal(null);
    if (searchParams.get("crear") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("crear");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }

  const sportSlots = slots
    .filter((s) => s.sport === selectedSport)
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  const sportDefaults = defaults.filter((d) => d.sport === selectedSport);
  const sportPromotions = promotions.filter((p) => p.sport === selectedSport);
  const minMinutes = mins[selectedSport] ?? 60;

  function flash(msg: string) {
    setMessage(msg);
    setError(null);
  }

  function openNewSlot(day: number, start: string) {
    setSlotModal({ day, start, end: "22:00", price: 60000 });
  }

  async function saveSlot(start: string, end: string, price: number) {
    if (!slotModal) return;
    setSaving(true);
    setError(null);

    const overlapping = slots.find(
      (s) =>
        s.sport === selectedSport &&
        s.day_of_week === slotModal.day &&
        s.id !== slotModal.slotId &&
        s.start_time < end &&
        s.end_time > start,
    );
    if (overlapping) {
      setError(
        `Se solapa con la franja ${overlapping.start_time}–${overlapping.end_time}. Ajustá el horario.`,
      );
      setSaving(false);
      return;
    }

    if (slotModal.slotId) {
      const { error: rpcError } = await supabase.rpc("update_price_slot", {
        p_slot_id: slotModal.slotId,
        p_start_time: start,
        p_end_time: end,
        p_price_cop: price,
      });
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setSlots((prev) =>
          prev.map((s) =>
            s.id === slotModal.slotId
              ? { ...s, start_time: start, end_time: end, price_cop: price }
              : s,
          ),
        );
        flash(`Franja de ${DAY_FULL[slotModal.day]} actualizada.`);
      }
    } else {
      const { data, error: rpcError } = await supabase.rpc("create_price_slot", {
        p_venue_id: venueId,
        p_sport: selectedSport,
        p_day_of_week: slotModal.day,
        p_start_time: start,
        p_end_time: end,
        p_price_cop: price,
      });
      if (rpcError) {
        setError(rpcError.message);
      } else {
        setSlots((prev) => [
          ...prev,
          {
            id: data,
            venue_id: venueId,
            sport: selectedSport,
            day_of_week: slotModal.day,
            start_time: start,
            end_time: end,
            price_cop: price,
          },
        ]);
        flash(`Franja creada en ${DAY_FULL[slotModal.day]}.`);
      }
    }
    setSlotModal(null);
    setSaving(false);
  }

  async function deleteSlot(slotId: string) {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("delete_price_slot", { p_slot_id: slotId });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      flash("Franja eliminada.");
    }
    setSaving(false);
  }

  async function saveMin(value: number) {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("set_price_min", {
      p_venue_id: venueId,
      p_sport: selectedSport,
      p_min_minutes: value,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setMins((prev) => ({ ...prev, [selectedSport]: value }));
      flash(`Duración mínima: ${value} min.`);
    }
    setSaving(false);
  }

  async function saveDefault(day: number, price: number | null) {
    setSaving(true);
    setError(null);
    if (price === null) {
      const { error: rpcError } = await supabase.rpc("delete_price_default", {
        p_venue_id: venueId,
        p_sport: selectedSport,
        p_day_of_week: day,
      });
      if (rpcError) {
        setError(rpcError.message);
        setSaving(false);
        return;
      }
      setDefaults((prev) =>
        prev.filter((d) => !(d.sport === selectedSport && d.day_of_week === day)),
      );
      flash(`Sin precio/hora fallback para ${DAY_FULL[day]}.`);
    } else {
      const { error: rpcError } = await supabase.rpc("set_price_default", {
        p_venue_id: venueId,
        p_sport: selectedSport,
        p_day_of_week: day,
        p_default_price_cop: price,
      });
      if (rpcError) {
        setError(rpcError.message);
        setSaving(false);
        return;
      }
      setDefaults((prev) => [
        ...prev.filter((d) => !(d.sport === selectedSport && d.day_of_week === day)),
        { venue_id: venueId, sport: selectedSport, day_of_week: day, default_price_cop: price },
      ]);
      flash(`Fallback $/hora ${DAY_FULL[day]}: ${formatCop(price)}/h.`);
    }
    setSaving(false);
  }

  async function createPromotion(input: {
    name: string;
    kind: "override_slot" | "discount_pct";
    value: number;
    days: number[] | null;
    timeFrom: string | null;
    timeTo: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    leadMinutes: number;
  }) {
    setSaving(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("create_promotion", {
      p_venue_id: venueId,
      p_sport: selectedSport,
      p_name: input.name,
      p_kind: input.kind,
      p_override_price_cop: input.kind === "override_slot" ? input.value : null,
      p_discount_pct: input.kind === "discount_pct" ? input.value : null,
      p_days_of_week: input.days,
      p_start_time: input.timeFrom,
      p_end_time: input.timeTo,
      p_date_start: input.dateFrom,
      p_date_end: input.dateTo,
      p_lead_time_minutes: input.leadMinutes,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setPromotions((prev) => [
        {
          id: data,
          venue_id: venueId,
          sport: selectedSport,
          name: input.name,
          kind: input.kind,
          override_price_cop: input.kind === "override_slot" ? input.value : null,
          discount_pct: input.kind === "discount_pct" ? input.value : null,
          start_time: input.timeFrom,
          end_time: input.timeTo,
          days_of_week: input.days,
          date_start: input.dateFrom,
          date_end: input.dateTo,
          lead_time_minutes: input.leadMinutes,
          active: true,
        },
        ...prev,
      ]);
      closePromoModal();
      flash(`Promoción "${input.name}" creada.`);
    }
    setSaving(false);
  }

  async function deactivatePromotion(promo: Promotion) {
    setSaving(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("deactivate_promotion", {
      p_promo_id: promo.id,
    });
    if (rpcError) {
      setError(rpcError.message);
    } else {
      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
      flash(`"${promo.name}" desactivada.`);
    }
    setSaving(false);
  }

  function promoConditions(p: Promotion) {
    const bits: string[] = [];
    if (p.days_of_week?.length) {
      bits.push(p.days_of_week.map((d) => DAY_SHORT[d]).join(" · "));
    }
    if (p.start_time || p.end_time) bits.push(`${p.start_time ?? "00:00"}–${p.end_time ?? "24:00"}`);
    if (p.date_start || p.date_end) {
      bits.push(`${p.date_start ?? "…"}${p.date_end ? ` → ${p.date_end}` : " → …"}`);
    }
    if (p.lead_time_minutes > 0) bits.push(`avisos con ${p.lead_time_minutes} min de margen`);
    return bits;
  }

  const sectionTabs: Array<{ id: PriceSectionTab; label: string }> = [
    { id: "semana", label: "Semana" },
    { id: "minimo", label: "Mínimo" },
    { id: "promos", label: "Promociones" },
  ];

  return (
    <div className="price-dashboard">
      <div className="price-sport-tabs" role="tablist" aria-label="Deporte">
        {sports.map((sport) => (
          <button
            key={sport}
            type="button"
            role="tab"
            aria-selected={sport === selectedSport}
            className={`price-sport-tab ${sport === selectedSport ? "is-active" : ""}`}
            onClick={() => setSelectedSport(sport as Sport)}
          >
            {sportLabel[sport as Sport] ?? sport}
          </button>
        ))}
      </div>

      <nav className="admin-tabs price-section-tabs" aria-label="Secciones de precios">
        {sectionTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={section === item.id ? "is-on" : undefined}
            onClick={() => setSectionTab(item.id)}
          >
            {item.label}
            {item.id === "promos" && sportPromotions.length > 0
              ? ` (${sportPromotions.length})`
              : null}
          </button>
        ))}
      </nav>

      <p className="price-status" role="status" aria-live="polite">
        {message ? (
          <span className="price-status-ok">{message}</span>
        ) : error ? (
          <span className="price-status-error">{error}</span>
        ) : null}
      </p>

      {section === "semana" ? (
        <section className="price-section" aria-labelledby="price-week-heading">
          <div className="price-section-head">
            <div>
              <h2 className="subhead" id="price-week-heading">
                Semana de precios
              </h2>
              <p className="field-help">
                Cada franja tiene precio por hora (COP/h). El fallback $/hora aplica solo si no hay
                franja que cubra el horario. Editá o borrá franjas cuando haga falta.
              </p>
              <p className="field-help venue-booking-flag-hint">
                Configurar precios no activa &quot;Reservar&quot; en la ficha pública. Para eso,
                en{" "}
                <Link href={`/canchas/${venueSlug}/admin`}>Mesa</Link> activá{" "}
                <strong>Aceptar reservas</strong>.
              </p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => openNewSlot(1, "18:00")}>
              + Franja
            </button>
          </div>

          <ul className="price-week">
            {DAY_FULL.map((day, dayIdx) => {
              const daySlots = sportSlots.filter((s) => s.day_of_week === dayIdx);
              const fallback = sportDefaults.find((d) => d.day_of_week === dayIdx);
              return (
                <li key={dayIdx} className="price-week-row">
                  <span className="price-week-day">{day}</span>
                  <div className="price-week-slots">
                    {daySlots.length === 0 ? (
                      <span className="price-week-empty">sin franjas</span>
                    ) : (
                      daySlots.map((slot) => (
                        <span key={slot.id} className="price-chip">
                          <button
                            type="button"
                            className="price-chip-main"
                            onClick={() =>
                              setSlotModal({
                                day: dayIdx,
                                start: slot.start_time,
                                end: slot.end_time,
                                price: slot.price_cop,
                                slotId: slot.id,
                              })
                            }
                          >
                            <strong>
                              {slot.start_time}–{slot.end_time}
                            </strong>
                            <span>{formatCop(slot.price_cop)}/h</span>
                          </button>
                          <button
                            type="button"
                            className="price-chip-remove"
                            aria-label={`Eliminar franja ${slot.start_time}–${slot.end_time} de ${day}`}
                            onClick={() => deleteSlot(slot.id)}
                            disabled={saving}
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                    <button
                      type="button"
                      className="price-chip-add"
                      onClick={() => openNewSlot(dayIdx, daySlots.at(-1)?.end_time ?? "06:00")}
                      disabled={saving}
                    >
                      +
                    </button>
                  </div>
                  <label className="price-week-fallback">
                    <span className="sr-only">Precio/hora (sin franja) de {day}</span>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="Precio/hora (sin franja)"
                      defaultValue={fallback?.default_price_cop ?? ""}
                      disabled={saving}
                      onBlur={(e) => {
                        const val = Number(e.target.value);
                        if (val > 0 && val !== fallback?.default_price_cop) {
                          void saveDefault(dayIdx, val);
                        }
                      }}
                    />
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="price-crosslink">
            ¿Horario valle?{" "}
            <button type="button" className="linkish" onClick={openPromoCreate}>
              Crear promoción
            </button>
            {" · "}
            <Link href={`/canchas/${venueSlug}/admin/precios?tab=promos`}>Ver promociones</Link>
          </p>
        </section>
      ) : null}

      {section === "minimo" ? (
        <section className="price-section" aria-labelledby="price-min-heading">
          <div className="price-section-head">
            <div>
              <h2 className="subhead" id="price-min-heading">
                Duración mínima facturada
              </h2>
              <p className="field-help">
                Un partido de {sportLabel[selectedSport] ?? selectedSport} se cobra en bloques de
                esta duración.
              </p>
            </div>
          </div>
          <div className="price-min-row">
            <div className="price-min-presets">
              {MIN_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`price-preset${minMinutes === preset ? " is-on" : ""}`}
                  onClick={() => void saveMin(preset)}
                  disabled={saving}
                >
                  {preset} min
                </button>
              ))}
            </div>
            <label className="price-min-custom">
              <span className="sr-only">Minutos personalizados</span>
              <input
                type="number"
                min={5}
                max={240}
                defaultValue={MIN_PRESETS.includes(minMinutes) ? "" : minMinutes}
                placeholder={String(minMinutes)}
                disabled={saving}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 5 && val !== minMinutes) void saveMin(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
            </label>
          </div>
        </section>
      ) : null}

      {section === "promos" ? (
        <section className="price-section" aria-labelledby="price-promos-heading" id="promos">
          <div className="price-section-head">
            <div>
              <h2 className="subhead" id="price-promos-heading">
                Promociones
              </h2>
              <p className="field-help">
                Descuentos o precio cerrado para horarios valle (ej: 50% antes de las 5 p. m. de
                lunes a jueves). Se aplican al crear un partido.
              </p>
            </div>
            <button type="button" className="btn-flood" onClick={openPromoCreate}>
              Crear promoción
            </button>
          </div>

          {sportPromotions.length === 0 ? (
            <div className="price-promo-empty">
              <p className="price-week-empty">
                Ninguna promoción activa para {sportLabel[selectedSport] ?? selectedSport}.
              </p>
              <button type="button" className="btn-flood" onClick={openPromoCreate}>
                Crear la primera promoción
              </button>
            </div>
          ) : (
            <ul className="price-promotions-list">
              {sportPromotions.map((promo) => (
                <li key={promo.id} className="price-promotion-item">
                  <div>
                    <strong>{promo.name}</strong>
                    <span className="price-promotion-kind">
                      {promo.kind === "override_slot"
                        ? `Precio cerrado: ${formatCop(promo.override_price_cop ?? 0)}`
                        : `−${promo.discount_pct}%`}
                    </span>
                    {promoConditions(promo).length > 0 ? (
                      <span className="price-promotion-cond">
                        {promoConditions(promo).join(" · ")}
                      </span>
                    ) : (
                      <span className="price-promotion-cond">todo el día, todos los días</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void deactivatePromotion(promo)}
                    disabled={saving}
                  >
                    Desactivar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {slotModal && (
        <SlotModal
          isOpen
          onClose={() => setSlotModal(null)}
          onSave={saveSlot}
          dayLabel={DAY_FULL[slotModal.day]}
          initialStart={slotModal.start}
          initialEnd={slotModal.end}
          initialPrice={slotModal.price}
          isEdit={!!slotModal.slotId}
        />
      )}
      {promoModal && (
        <PromotionModal
          isOpen
          onClose={closePromoModal}
          onSave={(input) => void createPromotion(input)}
          busy={saving}
        />
      )}
    </div>
  );
}
