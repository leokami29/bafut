import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type { VenueMeta, VenueReview } from "@/lib/venue-meta";

type EnrichmentNotes = {
  source?: string;
  place_id?: string | null;
  category?: string | null;
  description?: string | null;
  rating?: number | null;
  review_count?: number | null;
  hours?: string | null;
  images?: string[];
  thumbnail?: string | null;
  maps_url?: string | null;
  reviews?: VenueReview[];
  confidence?: string;
  public_guess?: string;
};

type EnrichmentVenue = {
  name: string;
  slug: string;
  phone?: string | null;
  website?: string | null;
  matched_existing_slug?: string | null;
  notes?: EnrichmentNotes;
};

type EnrichmentFile = {
  meta?: Record<string, unknown>;
  venues?: EnrichmentVenue[];
};

type SocialContact = {
  slug: string;
  phone?: string | null;
  hours?: string | null;
  booking_url?: string | null;
  website_current?: string | null;
  instagram?: string | null;
  facebook_page_url?: string | null;
  match_confidence?: string | null;
};

type SocialContactsFile = {
  meta?: Record<string, unknown>;
  venues?: SocialContact[];
};

const TRUSTED_SOCIAL_CONFIDENCE = new Set(["high", "medium"]);

let cachedIndex: Map<string, EnrichmentVenue> | null = null;
let cachedSocialIndex: Map<string, SocialContact> | null = null;

function loadIndex(): Map<string, EnrichmentVenue> {
  if (cachedIndex) return cachedIndex;
  const filePath = path.join(
    process.cwd(),
    "data",
    "scrapes",
    "2026-09-02-canchas-enrichment-barranquilla.json",
  );
  const index = new Map<string, EnrichmentVenue>();
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as EnrichmentFile;
    for (const venue of parsed.venues ?? []) {
      if (venue.slug) index.set(venue.slug, venue);
      if (venue.matched_existing_slug) index.set(venue.matched_existing_slug, venue);
    }
  } catch {
    // Enrichment is optional until scrape/import lands in DB.
  }
  cachedIndex = index;
  return index;
}

function loadSocialIndex(): Map<string, SocialContact> {
  if (cachedSocialIndex) return cachedSocialIndex;
  const filePath = path.join(
    process.cwd(),
    "data",
    "scrapes",
    "2026-09-02-canchas-social-contacts-barranquilla.json",
  );
  const index = new Map<string, SocialContact>();
  try {
    const raw = readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as SocialContactsFile;
    for (const venue of parsed.venues ?? []) {
      if (!venue.slug) continue;
      index.set(venue.slug, venue);
    }
  } catch {
    // Social overlay is optional.
  }
  cachedSocialIndex = index;
  return index;
}

function socialWebsite(social: SocialContact): string | null {
  if (social.booking_url?.trim()) return social.booking_url.trim();
  if (social.website_current?.trim()) return social.website_current.trim();
  if (social.facebook_page_url?.trim()) return social.facebook_page_url.trim();
  if (social.instagram?.trim()) {
    return `https://www.instagram.com/${social.instagram.trim().replace(/^@/, "")}/`;
  }
  return null;
}

function applySocialOverlay(venue: EnrichmentVenue | null, slug: string): EnrichmentVenue | null {
  const social = loadSocialIndex().get(slug);
  if (!social) return venue;
  const trusted = TRUSTED_SOCIAL_CONFIDENCE.has(String(social.match_confidence ?? ""));
  const phone = venue?.phone?.trim() || (trusted ? social.phone?.trim() : null) || null;
  const hours =
    venue?.notes?.hours?.trim() || (trusted ? social.hours?.trim() : null) || null;
  const website = venue?.website?.trim() || socialWebsite(social) || null;

  if (!venue && !phone && !hours && !website) return null;

  return {
    name: venue?.name ?? slug,
    slug: venue?.slug ?? slug,
    matched_existing_slug: venue?.matched_existing_slug ?? null,
    phone,
    website,
    notes: {
      ...(venue?.notes ?? {}),
      hours: hours ?? venue?.notes?.hours ?? null,
      source: venue?.notes?.source ?? (trusted ? "social" : undefined),
    },
  };
}

export const getVenueEnrichment = cache((slug: string): EnrichmentVenue | null => {
  return applySocialOverlay(loadIndex().get(slug) ?? null, slug);
});

export function enrichmentToMeta(venue: EnrichmentVenue | null): Partial<VenueMeta> {
  if (!venue) return {};
  const n = venue.notes ?? {};
  const images = (Array.isArray(n.images) ? n.images : [])
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "image" in item) {
        const url = (item as { image?: unknown }).image;
        return typeof url === "string" ? url : null;
      }
      return null;
    })
    .filter((url): url is string => Boolean(url))
    .slice(0, 6);

  const hasSignals =
    venue.phone ||
    venue.website ||
    n.hours ||
    n.rating != null ||
    images.length > 0 ||
    (Array.isArray(n.reviews) && n.reviews.length > 0);
  if (!hasSignals) return {};

  return {
    rating: typeof n.rating === "number" ? n.rating : null,
    reviewCount: typeof n.review_count === "number" ? n.review_count : null,
    phone: venue.phone ?? null,
    website: venue.website ?? null,
    hours: n.hours ?? null,
    description: n.description ?? null,
    images,
    reviews: Array.isArray(n.reviews) ? n.reviews.slice(0, 12) : [],
    placeId: n.place_id ?? null,
    category: n.category ?? null,
    source: n.source ?? "google",
  };
}

export function mergeVenueMeta(base: VenueMeta, extra: Partial<VenueMeta>): VenueMeta {
  return {
    rating: extra.rating ?? base.rating,
    reviewCount: extra.reviewCount ?? base.reviewCount,
    phone: extra.phone ?? base.phone,
    website: extra.website ?? base.website,
    hours: extra.hours ?? base.hours,
    description: extra.description ?? base.description,
    images: extra.images?.length ? extra.images : base.images,
    reviews: extra.reviews?.length ? extra.reviews : base.reviews,
    placeId: extra.placeId ?? base.placeId,
    category: extra.category ?? base.category,
    source: extra.source ?? base.source,
  };
}
