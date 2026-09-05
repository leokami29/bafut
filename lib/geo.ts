const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Distancia en km entre dos puntos usando la fórmula de Haversine.
 * Precisión suficiente para distancias urbanas (< 100 km).
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** Formatea distancia para display: "< 1 km", "2.3 km", "15 km". */
export function formatDistance(km: number): string {
  if (km < 0.5) return "< 1 km";
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

/** Ordena venues por distancia al usuario. */
export function sortVenuesByDistance<T extends { lat: number; lng: number }>(
  venues: T[],
  userLat: number,
  userLng: number,
): (T & { distanceKm: number })[] {
  return venues
    .map((v) => ({ ...v, distanceKm: haversineDistance(userLat, userLng, v.lat, v.lng) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
