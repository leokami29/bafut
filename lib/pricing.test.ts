import { describe, expect, it } from 'vitest';
import {
  applyDurationMinimum,
  applyPromotion,
  calculateBasePrice,
  calculateMatchPrice,
  formatTime,
  parseTime,
  timeRangesOverlap,
} from '@/lib/pricing';

describe('parseTime', () => {
  it('convierte HH:MM a minutos', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('01:30')).toBe(90);
    expect(parseTime('13:00')).toBe(780);
    expect(parseTime('23:59')).toBe(1439);
  });

  it('rechaza formato inválido', () => {
    expect(() => parseTime('abc')).toThrow();
    expect(() => parseTime('25:00')).toThrow();
    expect(() => parseTime('12:60')).toThrow();
  });
});

describe('formatTime', () => {
  it('convierte minutos a HH:MM', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(90)).toBe('01:30');
    expect(formatTime(780)).toBe('13:00');
    expect(formatTime(1439)).toBe('23:59');
  });
});

describe('timeRangesOverlap', () => {
  it('detecta solapamiento', () => {
    expect(timeRangesOverlap({ start: '10:00', end: '12:00' }, { start: '11:00', end: '13:00' })).toBe(true);
    expect(timeRangesOverlap({ start: '10:00', end: '12:00' }, { start: '12:00', end: '14:00' })).toBe(false);
    expect(timeRangesOverlap({ start: '10:00', end: '12:00' }, { start: '08:00', end: '11:00' })).toBe(true);
  });
});

describe('applyDurationMinimum', () => {
  it('redondea hacia abajo al múltiplo de min_minutes', () => {
    expect(applyDurationMinimum(90, 60)).toEqual({ billed_min: 60, was_clamped: true });
    expect(applyDurationMinimum(120, 60)).toEqual({ billed_min: 120, was_clamped: false });
    expect(applyDurationMinimum(150, 60)).toEqual({ billed_min: 120, was_clamped: true });
  });

  it('retorna 0 si duration < min_minutes', () => {
    expect(applyDurationMinimum(30, 60)).toEqual({ billed_min: 0, was_clamped: true });
  });

  it('rechaza min_minutes <= 0', () => {
    expect(() => applyDurationMinimum(60, 0)).toThrow();
  });
});

describe('calculateBasePrice', () => {
  // price_cop = COP/hora (no precio del bloque de la franja).
  const config = {
    slots: [
      { id: '1', day_of_week: 1, start_time: '13:00', end_time: '18:00', price_cop: 60000 },
      { id: '2', day_of_week: 1, start_time: '18:00', end_time: '22:00', price_cop: 80000 },
    ],
    min_minutes: 60,
    defaults: { 1: 100000 },
  };

  it('calcula precio en una sola franja (COP/hora × minutos/60)', () => {
    const result = calculateBasePrice(config, 1, 13 * 60, 60);
    expect(result.base_cop).toBe(60000); // 60min * (60000/60)
    expect(result.errors).toHaveLength(0);
  });

  it('130000/h × 60 min = 130000', () => {
    const padel = {
      ...config,
      slots: [
        { id: '1', day_of_week: 5, start_time: '06:00', end_time: '22:00', price_cop: 130000 },
      ],
      defaults: {},
    };
    const result = calculateBasePrice(padel, 5, 6 * 60, 60);
    expect(result.base_cop).toBe(130000);
  });

  it('calcula precio cruzando dos franjas', () => {
    const result = calculateBasePrice(config, 1, 17 * 60 + 30, 90);
    // 30min en A (1000/min) + 60min en B (1333.33/min) = 30000 + 80000 = 110000
    expect(result.base_cop).toBe(110000);
    expect(result.errors).toHaveLength(0);
  });

  it('usa fallback COP/hora cuando no hay slot', () => {
    const result = calculateBasePrice(config, 1, 8 * 60, 60);
    // 60min * (100000/60) = 100000
    expect(result.base_cop).toBe(100000);
    expect(result.errors).toHaveLength(0);
  });

  it('reporta error cuando no hay slot ni fallback', () => {
    const configNoDefault = { ...config, defaults: {} };
    const result = calculateBasePrice(configNoDefault, 1, 8 * 60, 60);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('applyPromotion', () => {
  it('sin promo retorna base sin descuento', () => {
    expect(applyPromotion(100000, null)).toEqual({ base_cop: 100000, discount_cop: 0, promo_id: null });
  });

  it('override_slot reemplaza el precio', () => {
    expect(applyPromotion(100000, { kind: 'override_slot', value: 50000 })).toEqual({
      base_cop: 50000,
      discount_cop: 0,
      promo_id: null,
    });
  });

  it('discount_pct aplica porcentaje', () => {
    expect(applyPromotion(100000, { kind: 'discount_pct', value: 20 })).toEqual({
      base_cop: 100000,
      discount_cop: 20000,
      promo_id: null,
    });
  });
});

describe('calculateMatchPrice', () => {
  const config = {
    slots: [
      { id: '1', day_of_week: 1, start_time: '13:00', end_time: '18:00', price_cop: 60000 },
      { id: '2', day_of_week: 1, start_time: '18:00', end_time: '22:00', price_cop: 80000 },
    ],
    min_minutes: 60,
    defaults: { 1: 100000 },
  };

  it('calcula precio completo sin promo', () => {
    const result = calculateMatchPrice(config, 1, 13 * 60, 60);
    expect(result.base_cop).toBe(60000);
    expect(result.discount_cop).toBe(0);
    expect(result.final_cop).toBe(60000);
    expect(result.billed_min).toBe(60);
    expect(result.errors).toHaveLength(0);
  });

  it('aplica duración mínima', () => {
    const result = calculateMatchPrice(config, 1, 13 * 60, 30);
    expect(result.billed_min).toBe(0);
    expect(result.errors.some((e) => e.includes('menor que la mínima'))).toBe(true);
  });

  it('aplica descuento', () => {
    const result = calculateMatchPrice(config, 1, 13 * 60, 60, { kind: 'discount_pct', value: 20 });
    expect(result.discount_cop).toBe(12000); // 20% de 60000
    expect(result.final_cop).toBe(48000);
  });

  it('aplica override', () => {
    const result = calculateMatchPrice(config, 1, 13 * 60, 60, { kind: 'override_slot', value: 50000 });
    expect(result.base_cop).toBe(50000);
    expect(result.discount_cop).toBe(0);
    expect(result.final_cop).toBe(50000);
  });
});
