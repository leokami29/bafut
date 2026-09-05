import type { MatchDetail, Venue } from "@/lib/types";
import { sportLabel } from "@/lib/labels";
import type { Sport } from "@/lib/constants";
import { DEFAULT_DESCRIPTION, SITE_NAME, absoluteUrl } from "@/lib/seo";

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

export function homeJsonLd(cityName = "Barranquilla"): JsonLdNode[] {
  const url = absoluteUrl("/");
  return [
    {
      "@type": "Organization",
      "@id": `${url}#organization`,
      name: SITE_NAME,
      url,
      logo: absoluteUrl("/icon.svg"),
      description: DEFAULT_DESCRIPTION,
      areaServed: {
        "@type": "City",
        name: cityName,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: "Atlántico",
        },
      },
    },
    {
      "@type": "WebSite",
      "@id": `${url}#website`,
      name: SITE_NAME,
      url,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "es-CO",
      publisher: { "@id": `${url}#organization` },
      about: {
        "@type": "Thing",
        name: `Pateadas y canchas sintéticas en ${cityName}`,
      },
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

export function venueDirectoryJsonLd(
  venues: Pick<Venue, "name" | "slug">[],
  cityName: string,
): JsonLdNode[] {
  const url = absoluteUrl("/canchas");
  return [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      name: `Canchas sintéticas en ${cityName}`,
      url,
      description: `Directorio de canchas sintéticas y de fútbol en ${cityName} con demanda visible en BaFut.`,
      isPartOf: { "@id": `${absoluteUrl("/")}#website` },
    },
    {
      "@type": "ItemList",
      "@id": `${url}#itemlist`,
      name: `Canchas en ${cityName}`,
      numberOfItems: venues.length,
      itemListElement: venues.slice(0, 50).map((venue, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: venue.name,
        url: absoluteUrl(`/canchas/${venue.slug}`),
      })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Canchas",
          item: url,
        },
      ],
    },
  ];
}

export function matchRadarJsonLd(
  matches: Pick<MatchDetail, "share_code" | "venues" | "sport">[],
  cityName: string,
): JsonLdNode[] {
  const url = absoluteUrl("/partidos");
  return [
    {
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      name: `Partidos y huecos abiertos en ${cityName}`,
      url,
      description: `Radar de pateadas y partidos de fútbol con cupos abiertos en ${cityName}.`,
      isPartOf: { "@id": `${absoluteUrl("/")}#website` },
    },
    {
      "@type": "ItemList",
      "@id": `${url}#itemlist`,
      name: `Huecos abiertos en ${cityName}`,
      numberOfItems: matches.length,
      itemListElement: matches.slice(0, 30).map((match, index) => {
        const sport = sportLabel[match.sport as Sport] ?? match.sport;
        return {
          "@type": "ListItem",
          position: index + 1,
          name: `${sport} en ${match.venues.name}`,
          url: absoluteUrl(`/p/${match.share_code}`),
        };
      }),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: absoluteUrl("/"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Partidos",
          item: url,
        },
      ],
    },
  ];
}

export function venueJsonLd(venue: Venue, cityName: string): JsonLdNode[] {
  const url = absoluteUrl(`/canchas/${venue.slug}`);
  const surface =
    venue.surface === "sintetica"
      ? "Cancha sintética"
      : venue.surface === "grama" || venue.surface === "grass"
        ? "Cancha de grama"
        : "Cancha deportiva";
  const place: JsonLdNode = {
    "@type": ["SportsActivityLocation", "Place"],
    "@id": `${url}#place`,
    name: venue.name,
    url,
    description: `${venue.name}: ${surface.toLowerCase()} en ${
      venue.neighborhood ? `${venue.neighborhood}, ${cityName}` : cityName
    }. Partidos y pateadas de fútbol con huecos abiertos en BaFut.`,
    address: postalAddress({
      street: venue.address,
      locality: cityName,
    }),
    geo: {
      "@type": "GeoCoordinates",
      latitude: venue.lat,
      longitude: venue.lng,
    },
    amenityFeature: {
      "@type": "LocationFeatureSpecification",
      name: surface,
      value: true,
    },
  };

  if (venue.neighborhood?.trim()) {
    place.containedInPlace = {
      "@type": "Place",
      name: venue.neighborhood.trim(),
      containedInPlace: {
        "@type": "City",
        name: cityName,
      },
    };
  }

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
  const placeLabel = match.venues.neighborhood?.trim() || match.cities.name;
  const event: JsonLdNode = {
    "@type": "SportsEvent",
    "@id": `${url}#event`,
    name,
    description: `Partido de ${sport} en ${match.venues.name} (${placeLabel}). Huecos abiertos para completar la pateada en BaFut.`,
    url,
    startDate: match.starts_at,
    sport,
    eventStatus:
      match.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
    location: {
      "@type": ["SportsActivityLocation", "Place"],
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
      availability: "https://schema.org/InStock",
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
