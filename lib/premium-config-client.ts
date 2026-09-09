/** Helpers sync usables en client components (sin I/O). */

export function suggestedAmountCop(dailyRateCop: number, days: number): number {
  return Math.max(0, Math.round(dailyRateCop * days));
}
