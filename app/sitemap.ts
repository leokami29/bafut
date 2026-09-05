import type { MetadataRoute } from "next";
import { getActiveCity, getUpcomingMatches, getVenuesByCity } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/partidos"),
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/canchas"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: absoluteUrl("/apoyar"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const city = await getActiveCity();
  if (!city) {
    return entries;
  }

  const [venues, matches] = await Promise.all([
    getVenuesByCity(city.id),
    getUpcomingMatches(city.id),
  ]);

  for (const venue of venues) {
    entries.push({
      url: absoluteUrl(`/canchas/${venue.slug}`),
      lastModified: venue.created_at ? new Date(venue.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.75,
    });
  }

  for (const match of matches) {
    entries.push({
      url: absoluteUrl(`/p/${match.share_code}`),
      lastModified: match.starts_at
        ? new Date(match.starts_at)
        : match.created_at
          ? new Date(match.created_at)
          : now,
      changeFrequency: "hourly",
      priority: 0.55,
    });
  }

  return entries;
}
