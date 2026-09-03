/**
 * Lightweight GA4 event helper.
 * No-op when the measurement ID is missing or window.gtag is unavailable.
 */
export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID ||
    typeof window.gtag !== "function"
  ) {
    return;
  }
  window.gtag("event", name, params);
}
