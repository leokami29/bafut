import type { MatchDetail, Venue } from "@/lib/types";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";
import { SITE_NAME, absoluteUrl } from "@/lib/seo";

type JsonLdNode = Record<string, unknown>;

export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const payload = Array.isArray(data)
    ? { "@context": "https://schema.org", "@graph": data }
    : { "@context": "https://schema.org", ...data };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function homeJsonLd(): JsonLdNode[] {
  const url = absoluteUrl("/");
  return [
    {
      "@type": "Organization",
      "@id": `${url}#organization`,
      name: SITE_NAME,
      url,
      logo: absoluteUrl("/icon.svg"),
    },
    {
      "@type": "WebSite",
      "@id": `${url}#website`,
      name: SITE_NAME,
      url,
      publisher: { "@id": `${url}#organization` },
    },
  ];
}

function postalAddress(input: {
  street?: string | null;
  locality: string;
}) {
  const address: JsonLdNode = {
    "@type": "PostalAddress",
    addressLocality: input.locality,
    addressRegion: "Atlántico",
    addressCountry: "CO",
  };
  if (input.street?.trim()) address.streetAddress = input.street.trim();
  return address;
}

export function venueJsonLd(venue: Venue, cityName: string): JsonLdNode[] {
  const url = absoluteUrl(`/canchas/${venue.slug}`);
  const place: JsonLdNode = {
    "@type": ["SportsActivityLocation", "Place"],
    "@id": `${url}#place`,
    name: venue.name,
    url,
    address: postalAddress({
      street: venue.address,
      locality: cityName,
    }),
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.lat,
      longitude: venue.lng,
    },
  };

  return [
    place,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Canchas",
          item: absoluteUrl("/canchas"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: venue.name,
          item: url,
        },
      ],
    },
  ];
}

export function matchJsonLd(match: MatchDetail): JsonLdNode[] {
  const url = absoluteUrl(`/p/${match.share_code}`);
  const venueUrl = absoluteUrl(`/canchas/${match.venues.slug}`);
  const sport = sportLabel[match.sport as Sport] ?? match.sport;
  const name = `${sport} en ${match.venues.name}`;
  const event: JsonLdNode = {
    "@type": "SportsEvent",
    "@id": `${url}#event`,
    name,
    url,
    startDate: match.starts_at,
    sport,
    eventStatus:
      match.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      "@id": `${venueUrl}#place`,
      name: match.venues.name,
      url: venueUrl,
      address: postalAddress({
        street: match.venues.address,
        locality: match.cities.name,
      }),
      geo: {
        "@type": "GeoCoordinates",
        latitude: match.venues.lat,
        longitude: match.venues.lng,
      },
    },
    organizer: {
      "@type": "Person",
      name: match.profiles.display_name,
    },
  };

  if (Number.isFinite(match.duration_min) && match.duration_min > 0) {
    event.duration = `PT${match.duration_min}M`;
  }

  const cost = match.cost_per_person;
  if (typeof cost === "number" && Number.isFinite(cost)) {
    event.offers = {
      "@type": "Offer",
      price: cost,
      priceCurrency: match.currency || "COP",
      url,
    };
  }

  return [
    event,
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Radar",
          item: absoluteUrl("/partidos"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: match.venues.name,
          item: venueUrl,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Hueco",
          item: url,
        },
      ],
    },
  ];
}
