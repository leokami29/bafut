export type VenueMeta = {
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
};

const RATING_RE = /★\s*([\d.]+)(?:\s*\((\d+)\s*reseñas?\))?/i;
const PHONE_RE = /Tel:\s*([^.\n|]+)/i;
const WEB_RE = /Web:\s*(\S+)/i;
const HOURS_RE = /Horario:\s*([^.\n|]+)/i;

function cleanDescription(raw: string) {
  let text = raw
    .replace(/^Google Maps:\s*/i, "")
    .replace(RATING_RE, "")
    .replace(PHONE_RE, "")
    .replace(WEB_RE, "")
    .replace(HOURS_RE, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();

  text = text.replace(/\.\s*$/, "").trim();
  return text || null;
}

export function parseVenueNotes(notes: string | null): VenueMeta {
  if (!notes?.trim()) {
    return {
      rating: null,
      reviewCount: null,
      phone: null,
      website: null,
      hours: null,
      description: null,
    };
  }

  const ratingMatch = notes.match(RATING_RE);
  const phoneMatch = notes.match(PHONE_RE);
  const webMatch = notes.match(WEB_RE);
  const hoursMatch = notes.match(HOURS_RE);

  return {
    rating: ratingMatch ? Number.parseFloat(ratingMatch[1]) : null,
    reviewCount: ratingMatch?.[2] ? Number.parseInt(ratingMatch[2], 10) : null,
    phone: phoneMatch?.[1]?.trim() ?? null,
    website: webMatch?.[1]?.trim() ?? null,
    hours: hoursMatch?.[1]?.trim() ?? null,
    description: cleanDescription(notes),
  };
}

export function mapsDirectionsUrl(lat: number, lng: number, label?: string | null) {
  const destination = label?.trim()
    ? encodeURIComponent(label)
    : encodeURIComponent(`${lat},${lng}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}
