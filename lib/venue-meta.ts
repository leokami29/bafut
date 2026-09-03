export type VenueReview = {
  author: string | null;
  rating: number | null;
  text: string | null;
  date: string | null;
  ownerResponse?: string | null;
};

export type VenueMeta = {
  rating: number | null;
  reviewCount: number | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  images: string[];
  reviews: VenueReview[];
  placeId: string | null;
  category: string | null;
  source: string | null;
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

function emptyMeta(): VenueMeta {
  return {
    rating: null,
    reviewCount: null,
    phone: null,
    website: null,
    hours: null,
    description: null,
    images: [],
    reviews: [],
    placeId: null,
    category: null,
    source: null,
  };
}

/** Parse legacy free-text notes, or JSON notes blob from enrichment imports. */
export function parseVenueNotes(notes: string | null): VenueMeta {
  if (!notes?.trim()) {
    return emptyMeta();
  }

  const trimmed = notes.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const reviewsRaw = Array.isArray(parsed.reviews) ? parsed.reviews : [];
      const reviews: VenueReview[] = reviewsRaw.flatMap((r) => {
        if (!r || typeof r !== "object") return [];
        const row = r as Record<string, unknown>;
        const text = typeof row.text === "string" ? row.text : null;
        if (!text) return [];
        return [
          {
            author: typeof row.author === "string" ? row.author : null,
            rating: typeof row.rating === "number" ? row.rating : null,
            text,
            date: typeof row.date === "string" ? row.date : null,
            ownerResponse: typeof row.ownerResponse === "string" ? row.ownerResponse : null,
          } satisfies VenueReview,
        ];
      });
      return {
        rating: typeof parsed.rating === "number" ? parsed.rating : null,
        reviewCount: typeof parsed.review_count === "number" ? parsed.review_count : null,
        phone: typeof parsed.phone === "string" ? parsed.phone : null,
        website: typeof parsed.website === "string" ? parsed.website : null,
        hours: typeof parsed.hours === "string" ? parsed.hours : null,
        description: typeof parsed.description === "string" ? parsed.description : null,
        images: Array.isArray(parsed.images)
          ? parsed.images.filter((x): x is string => typeof x === "string").slice(0, 6)
          : [],
        reviews: reviews.slice(0, 12),
        placeId: typeof parsed.place_id === "string" ? parsed.place_id : null,
        category: typeof parsed.category === "string" ? parsed.category : null,
        source: typeof parsed.source === "string" ? parsed.source : "google",
      };
    } catch {
      // fall through to free-text parser
    }
  }

  const ratingMatch = notes.match(RATING_RE);
  const phoneMatch = notes.match(PHONE_RE);
  const webMatch = notes.match(WEB_RE);
  const hoursMatch = notes.match(HOURS_RE);

  return {
    ...emptyMeta(),
    rating: ratingMatch ? Number.parseFloat(ratingMatch[1]) : null,
    reviewCount: ratingMatch?.[2] ? Number.parseInt(ratingMatch[2], 10) : null,
    phone: phoneMatch?.[1]?.trim() ?? null,
    website: webMatch?.[1]?.trim() ?? null,
    hours: hoursMatch?.[1]?.trim() ?? null,
    description: cleanDescription(notes),
  };
}

export function formatHoursLines(hours: string | null): string[] {
  if (!hours?.trim()) return [];
  return hours
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
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

/** Prefer typed venue columns over legacy notes parsing. */
export function resolveVenuePublicMeta(venue: {
  phone?: string | null;
  website?: string | null;
  rating?: number | null;
  notes?: string | null;
}): VenueMeta {
  const fromNotes = parseVenueNotes(venue.notes ?? null);
  return {
    ...fromNotes,
    phone: venue.phone?.trim() || fromNotes.phone,
    website: venue.website?.trim() || fromNotes.website,
    rating: venue.rating != null ? Number(venue.rating) : fromNotes.rating,
  };
}
