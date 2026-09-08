/**
 * Helpers puros para cálculo de pricing de canchas.
 * Sin dependencias de Supabase — se pueden testear en aislamiento.
 */

export type TimeRange = {
  start: string; // "HH:MM"
  end: string;
};

export type PriceSlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  /** COP por hora (no por el bloque completo de la franja). */
  price_cop: number;
};

export type PricingConfig = {
  slots: PriceSlot[];
  min_minutes: number;
  /** day_of_week -> COP/hora (fallback cuando no hay franja). */
  defaults: Record<number, number>;
};

export type PricingResult = {
  base_cop: number;
  discount_cop: number;
  final_cop: number;
  billed_min: number;
  min_minutes: number;
  errors: string[];
};

/**
 * Parsea "HH:MM" a minutos desde medianoche.
 */
export function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Formato de hora inválido: ${time}`);
  }
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    throw new Error(`Hora fuera de rango: ${time}`);
  }
  return h * 60 + m;
}

/**
 * Formatea minutos desde medianoche a "HH:MM".
 */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Verifica si dos rangos de tiempo se solapan.
 */
export function timeRangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = parseTime(a.start);
  const aEnd = parseTime(a.end);
  const bStart = parseTime(b.start);
  const bEnd = parseTime(b.end);
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Aplica la duración mínima: floor(duration / min) * min.
 * Retorna { billed_min, was_clamped } donde was_clamped indica si se ajustó.
 */
export function applyDurationMinimum(
  duration_min: number,
  min_minutes: number,
): { billed_min: number; was_clamped: boolean } {
  if (min_minutes <= 0) {
    throw new Error('min_minutes debe ser mayor a cero');
  }
  const billed_min = Math.floor(duration_min / min_minutes) * min_minutes;
  const was_clamped = billed_min < duration_min;
  return { billed_min, was_clamped };
}

/**
 * Busca el slot que cubre un momento dado.
 */
export function findSlotAt(
  slots: PriceSlot[],
  day_of_week: number,
  time_min: number,
): PriceSlot | null {
  return (
    slots.find((slot) => {
      if (slot.day_of_week !== day_of_week) return false;
      const start = parseTime(slot.start_time);
      const end = parseTime(slot.end_time);
      return time_min >= start && time_min < end;
    }) ?? null
  );
}

/**
 * Calcula el precio base por minutos facturados.
 * Semántica: `price_cop` (franja y fallback) = COP por hora → pricePerMin = price_cop / 60.
 * Si el booking cruza franjas, se suma por segmento.
 */
export function calculateBasePrice(
  config: PricingConfig,
  day_of_week: number,
  start_min: number,
  billed_min: number,
): { base_cop: number; errors: string[] } {
  let base_cop = 0;
  const errors: string[] = [];
  let remaining_min = billed_min;
  let current_min = start_min;

  while (remaining_min > 0) {
    const slot = findSlotAt(config.slots, day_of_week, current_min);

    if (slot) {
      const slotEnd = parseTime(slot.end_time);
      const pricePerMin = slot.price_cop / 60;
      const minutesInSlot = Math.min(remaining_min, slotEnd - current_min);
      base_cop += minutesInSlot * pricePerMin;
      current_min += minutesInSlot;
      remaining_min -= minutesInSlot;
    } else {
      // Fallback del día: también COP/hora (misma fórmula que franjas).
      const fallbackPrice = config.defaults[day_of_week];
      if (fallbackPrice === undefined) {
        errors.push(`No hay franja ni fallback para el día ${day_of_week} a las ${formatTime(current_min)}`);
        break;
      }
      const pricePerMin = fallbackPrice / 60;
      base_cop += remaining_min * pricePerMin;
      remaining_min = 0;
    }
  }

  return { base_cop: Math.round(base_cop), errors };
}

/**
 * Aplica una promoción al precio base.
 */
export function applyPromotion(
  base_cop: number,
  promo: { kind: 'override_slot' | 'discount_pct'; value: number } | null,
): { base_cop: number; discount_cop: number; promo_id: string | null } {
  if (!promo) {
    return { base_cop, discount_cop: 0, promo_id: null };
  }

  if (promo.kind === 'override_slot') {
    return { base_cop: promo.value, discount_cop: 0, promo_id: null };
  }

  if (promo.kind === 'discount_pct') {
    const discount_cop = Math.round((base_cop * promo.value) / 100);
    return { base_cop, discount_cop, promo_id: null };
  }

  return { base_cop, discount_cop: 0, promo_id: null };
}

/**
 * Calcula el precio completo.
 */
export function calculateMatchPrice(
  config: PricingConfig,
  day_of_week: number,
  start_min: number,
  duration_min: number,
  promo: { kind: 'override_slot' | 'discount_pct'; value: number } | null = null,
): PricingResult {
  const { billed_min, was_clamped } = applyDurationMinimum(duration_min, config.min_minutes);
  const errors: string[] = [];

  if (was_clamped) {
    errors.push(`La duración (${duration_min} min) es menor que la mínima (${config.min_minutes} min). Se cobrará ${billed_min} min.`);
  }

  if (billed_min === 0) {
    errors.push(`La duración (${duration_min} min) es menor que la mínima (${config.min_minutes} min).`);
  }

  const { base_cop, errors: calcErrors } = calculateBasePrice(config, day_of_week, start_min, billed_min);
  errors.push(...calcErrors);

  const { base_cop: finalBase, discount_cop } = applyPromotion(base_cop, promo);
  const final_cop = finalBase - discount_cop;

  return {
    base_cop: finalBase,
    discount_cop,
    final_cop: Math.max(0, final_cop),
    billed_min,
    min_minutes: config.min_minutes,
    errors,
  };
}
