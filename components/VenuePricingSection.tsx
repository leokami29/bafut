"use client";

import { useState } from "react";
import type {
  VenuePublicPriceSlot,
  VenuePublicPricing,
  VenuePublicPricingDefault,
  VenuePublicPromotion,
} from "@/lib/data";
import { formatMoney } from "@/lib/format";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
const DAY_FULL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

type Props = {
  sports: string[];
  pricing: VenuePublicPricing;
  /** YYYY-MM-DD en zona de la ciudad (para filtrar vigencia de promos). */
  todayYmd: string;
};

function formatClock(time: string | null | undefined) {
  if (!time) return null;
  return time.slice(0, 5);
}

function formatDateYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

function sportHasPricing(
  sport: string,
  pricing: VenuePublicPricing,
  visiblePromos: VenuePublicPromotion[],
) {
  return (
    pricing.slots.some((s) => s.sport === sport) ||
    pricing.defaults.some((d) => d.sport === sport) ||
    pricing.mins.some((m) => m.sport === sport) ||
    visiblePromos.some((p) => p.sport === sport)
  );
}

function promoIsCurrent(promo: VenuePublicPromotion, todayYmd: string) {
  if (promo.date_end && promo.date_end < todayYmd) return false;
  return true;
}

function promoConditions(promo: VenuePublicPromotion) {
  const bits: string[] = [];
  if (promo.days_of_week?.length) {
    bits.push(promo.days_of_week.map((d) => DAY_SHORT[d] ?? String(d)).join(" · "));
  }
  const start = formatClock(promo.start_time);
  const end = formatClock(promo.end_time);
  if (start || end) bits.push(`${start ?? "00:00"}–${end ?? "24:00"}`);
  if (promo.date_start || promo.date_end) {
    const from = promo.date_start ? formatDateYmd(promo.date_start) : null;
    const to = promo.date_end ? formatDateYmd(promo.date_end) : null;
    if (from && to) bits.push(`${from} → ${to}`);
    else if (from) bits.push(`desde ${from}`);
    else if (to) bits.push(`hasta ${to}`);
  }
  if (promo.lead_time_minutes > 0) {
    bits.push(`con ${promo.lead_time_minutes} min de anticipación`);
  }
  return bits;
}

function resolveSportsList(
  sports: string[],
  pricing: VenuePublicPricing,
  visiblePromos: VenuePublicPromotion[],
) {
  const base = sports.length > 0 ? sports : ["futbol"];
  const withData = base.filter((s) => sportHasPricing(s, pricing, visiblePromos));
  const extras = [
    ...new Set([
      ...pricing.slots.map((s) => s.sport),
      ...pricing.defaults.map((d) => d.sport),
      ...pricing.mins.map((m) => m.sport),
      ...visiblePromos.map((p) => p.sport),
    ]),
  ].filter((s) => !base.includes(s));
  const list = withData.length > 0 ? [...withData, ...extras] : [...base, ...extras];
  return list.length > 0 ? list : base;
}

function DayRow({
  dayIdx,
  slots,
  fallback,
}: {
  dayIdx: number;
  slots: VenuePublicPriceSlot[];
  fallback: VenuePublicPricingDefault | undefined;
}) {
  const hasSlots = slots.length > 0;
  const hasFallback = fallback != null;
  if (!hasSlots && !hasFallback) {
    return (
      <li className="venue-pricing-day">
        <span className="venue-pricing-day-name">{DAY_FULL[dayIdx]}</span>
        <span className="venue-pricing-day-empty">Sin franja</span>
      </li>
    );
  }
  return (
    <li className="venue-pricing-day">
      <span className="venue-pricing-day-name">{DAY_FULL[dayIdx]}</span>
      <div className="venue-pricing-day-body">
        {hasSlots ? (
          <ul className="venue-pricing-slots">
            {slots.map((slot) => (
              <li key={slot.id} className="venue-pricing-slot">
                <span className="venue-pricing-slot-time">
                  {formatClock(slot.start_time)}–{formatClock(slot.end_time)}
                </span>
                <span className="venue-pricing-slot-price">{formatMoney(slot.price_cop)}/h</span>
              </li>
            ))}
          </ul>
        ) : (
          <span className="venue-pricing-day-empty">Sin franjas · usa precio/hora fallback</span>
        )}
        {hasFallback ? (
          <p className="venue-pricing-fallback">
            Precio/hora (sin franja) <strong>{formatMoney(fallback.default_price_cop)}/h</strong>
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function VenuePricingSection({ sports, pricing, todayYmd }: Props) {
  const visiblePromos = pricing.promotions.filter((p) => promoIsCurrent(p, todayYmd));
  const sportsList = resolveSportsList(sports, pricing, visiblePromos);

  const hasAnyPricing =
    pricing.slots.length > 0 ||
    pricing.defaults.length > 0 ||
    visiblePromos.length > 0 ||
    pricing.mins.length > 0;

  const initialSport =
    sportsList.find((s) => sportHasPricing(s, pricing, visiblePromos)) ?? sportsList[0];

  const [selectedSport, setSelectedSport] = useState(initialSport);

  const activeSport = sportsList.includes(selectedSport) ? selectedSport : sportsList[0];

  const sportSlots = pricing.slots
    .filter((s) => s.sport === activeSport)
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  const sportDefaults = pricing.defaults.filter((d) => d.sport === activeSport);
  const sportPromos = visiblePromos.filter((p) => p.sport === activeSport);
  const minMinutes = pricing.mins.find((m) => m.sport === activeSport)?.min_minutes;
  const sportHasData = sportHasPricing(activeSport, pricing, visiblePromos);

  return (
    <section className="venue-pricing-section" aria-labelledby="venue-pricing-heading">
      <div className="venue-section-head">
        <h2 className="subhead" id="venue-pricing-heading">
          Precios y promos
        </h2>
        <p className="venue-section-meta">Referencia · se confirma al publicar el partido</p>
      </div>

      {!hasAnyPricing ? (
        <p className="venue-pricing-empty" role="status">
          Esta cancha aún no publicó precios en BaFut.
        </p>
      ) : (
        <>
          {sportsList.length > 1 ? (
            <div className="venue-pricing-sports" role="tablist" aria-label="Deporte">
              {sportsList.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  role="tab"
                  aria-selected={sport === activeSport}
                  className={`venue-pricing-sport${sport === activeSport ? " is-active" : ""}`}
                  onClick={() => setSelectedSport(sport)}
                >
                  {sportLabel[sport as Sport] ?? sport}
                </button>
              ))}
            </div>
          ) : null}

          {!sportHasData ? (
            <p className="venue-pricing-empty" role="status">
              Sin precios publicados para {sportLabel[activeSport as Sport] ?? activeSport}.
            </p>
          ) : (
            <div className="venue-pricing-body">
              {sportPromos.length > 0 ? (
                <div className="venue-pricing-promos-block">
                  <h3 className="venue-pricing-subhead">Promociones</h3>
                  <ul className="venue-pricing-promos">
                    {sportPromos.map((promo) => {
                      const conditions = promoConditions(promo);
                      const upcoming =
                        promo.date_start != null && promo.date_start > todayYmd
                          ? `Vigente desde ${formatDateYmd(promo.date_start)}`
                          : null;
                      return (
                        <li key={promo.id} className="venue-pricing-promo">
                          <div className="venue-pricing-promo-main">
                            <strong className="venue-pricing-promo-name">{promo.name}</strong>
                            <span className="venue-pricing-promo-value">
                              {promo.kind === "override_slot"
                                ? `Precio cerrado ${formatMoney(promo.override_price_cop)}`
                                : `−${promo.discount_pct}%`}
                            </span>
                          </div>
                          {conditions.length > 0 ? (
                            <p className="venue-pricing-promo-cond">{conditions.join(" · ")}</p>
                          ) : (
                            <p className="venue-pricing-promo-cond">Todo el día · todos los días</p>
                          )}
                          {upcoming ? (
                            <p className="venue-pricing-promo-soon">{upcoming}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {minMinutes != null ? (
                <p className="venue-pricing-min">
                  Bloque mínimo facturado: <strong>{minMinutes} min</strong>
                </p>
              ) : null}

              {sportSlots.length > 0 || sportDefaults.length > 0 ? (
                <div className="venue-pricing-week-block">
                  <h3 className="venue-pricing-subhead">Horarios y franjas</h3>
                  <div className="venue-pricing-week-scroll">
                    <ul className="venue-pricing-week">
                      {DAY_FULL.map((_, dayIdx) => (
                        <DayRow
                          key={dayIdx}
                          dayIdx={dayIdx}
                          slots={sportSlots.filter((s) => s.day_of_week === dayIdx)}
                          fallback={sportDefaults.find((d) => d.day_of_week === dayIdx)}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}
