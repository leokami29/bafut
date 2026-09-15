import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicPlayerProfileView } from "@/components/PublicPlayerProfileView";
import { SharePlayerProfile } from "@/components/SharePlayerProfile";
import {
  getPlayerRecentMatches,
  getPublicPlayerCardByCode,
  getSessionUserId,
  getVenuesForPlayerSport,
} from "@/lib/data";
import { positionLabel, sportLabel } from "@/lib/labels";
import { isPublicPlayerCard } from "@/lib/profile";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
  robotsIndex,
  robotsNoIndex,
} from "@/lib/seo";
import { isPosition, isSport } from "@/lib/sport-rules";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await getPublicPlayerCardByCode(code);
  if (!data || !isPublicPlayerCard(data.profile)) {
    return { title: "Jugador", robots: robotsNoIndex };
  }

  const name = data.profile.display_name.trim();
  const sport = isSport(data.profile.preferred_sport)
    ? sportLabel[data.profile.preferred_sport]
    : "Deporte";
  const position = isPosition(data.profile.preferred_position)
    ? positionLabel[data.profile.preferred_position]
    : null;
  const title = position ? `${name} · ${position}` : name;
  const description = `Perfil BaFut — ${name}${position ? ` · ${position}` : ""} · ${sport}. Ficha pública del jugador.`;
  const url = absoluteUrl(`/jugador/${code}`);
  const ogImage = absoluteUrl(`/carta/${code}/opengraph-image`);
  const ogTitle = fullTitle(`Perfil de ${name}`);
  const images = [{ url: ogImage, width: 1200, height: 630, alt: `Perfil de ${name} en BaFut` }];

  return {
    title,
    description,
    robots: robotsIndex,
    alternates: { canonical: url },
    openGraph: {
      ...defaultOg(),
      title: ogTitle,
      description,
      url,
      images,
    },
    twitter: {
      ...defaultTwitter(),
      title: ogTitle,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicPlayerPage({ params }: Props) {
  const { code } = await params;
  const data = await getPublicPlayerCardByCode(code);
  if (!data || !isPublicPlayerCard(data.profile)) notFound();

  const { profile, stats, cityName } = data;
  const sport = isSport(profile.preferred_sport) ? profile.preferred_sport : null;
  const position = isPosition(profile.preferred_position)
    ? positionLabel[profile.preferred_position]
    : null;

  const [userId, venues, recentMatches] = await Promise.all([
    getSessionUserId(),
    getVenuesForPlayerSport(profile.city_id, sport, 6),
    getPlayerRecentMatches(profile.id, 6),
  ]);
  const isOwner = userId === profile.id;

  return (
    <main className="page page-jugador" id="main">
      <p className="venue-back">
        <Link href="/partidos">← Partidos</Link>
      </p>

      <PublicPlayerProfileView
        profile={profile}
        cityName={cityName}
        stats={stats}
        cardCode={code}
        isOwner={isOwner}
        venues={venues}
        recentMatches={recentMatches}
      />

      {isOwner ? (
        <SharePlayerProfile
          cardCode={code}
          displayName={profile.display_name}
          sport={sport ? sportLabel[sport] : "Deporte"}
          position={position}
        />
      ) : null}
    </main>
  );
}
