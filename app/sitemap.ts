import type { MetadataRoute } from "next";
import { getActiveCity, getUpcomingMatches, getVenuesByCity } from "@/lib/data";
import { absoluteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), priority: 1 },
    { url: absoluteUrl("/partidos"), priority: 0.9 },
    { url: absoluteUrl("/canchas"), priority: 0.9 },
    { url: absoluteUrl("/apoyar") },
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
      lastModified: venue.created_at,
      priority: 0.7,
    });
  }

  for (const match of matches) {
    entries.push({
      url: absoluteUrl(`/p/${match.share_code}`),
      lastModified: match.starts_at ?? match.created_at,
      priority: 0.5,
    });
  }

  return entries;
}
