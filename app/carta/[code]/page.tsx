import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerCard } from "@/components/PlayerCard";
import { PublicPlayerCardShareBlock } from "@/components/PlayerCardShareBlock";
import { getPublicPlayerCardByCode, getSessionUserId } from "@/lib/data";
import { positionLabel, sportLabel } from "@/lib/labels";
import { toPlayerCardDraft } from "@/lib/player-card-draft";
import { isPublicPlayerCard } from "@/lib/profile";
import {
  absoluteUrl,
  defaultOg,
  defaultTwitter,
  fullTitle,
  robotsIndex,
  robotsNoIndex,
} from "@/lib/seo";
import { isSport } from "@/lib/sport-rules";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const data = await getPublicPlayerCardByCode(code);
  if (!data || !isPublicPlayerCard(data.profile)) {
    return { title: "Carta", robots: robotsNoIndex };
  }

  const name = data.profile.display_name.trim();
  const overall = data.stats.overall;
  const sport =
    data.profile.preferred_sport && isSport(data.profile.preferred_sport)
      ? sportLabel[data.profile.preferred_sport]
      : "Deporte";
  const title = `${name} · OVR ${overall}`;
  const description = `Mi carta BaFut — ${name} · OVR ${overall} · ${sport}. Ficha pública del jugador.`;
  const url = absoluteUrl(`/carta/${code}`);
  const ogImage = absoluteUrl(`/carta/${code}/opengraph-image`);
  const ogTitle = fullTitle(`Carta de ${name}`);
  const images = [
    {
      url: ogImage,
      width: 1200,
      height: 630,
      alt: `Carta de ${name} en BaFut`,
    },
  ];

  return {
    title,
    description,
    robots: robotsIndex,
    alternates: { canonical: url },
    openGraph: defaultOg({ title: ogTitle, description, url, images }),
    twitter: defaultTwitter({ title: ogTitle, description, images }),
  };
}

export default async function CartaPage({ params }: Props) {
  const { code } = await params;
  const [data, userId] = await Promise.all([getPublicPlayerCardByCode(code), getSessionUserId()]);
  if (!data || !isPublicPlayerCard(data.profile)) {
    notFound();
  }

  const { profile, cityName, stats } = data;
  const draft = toPlayerCardDraft({ ...profile, whatsapp: null }, stats, cityName);
  const sport =
    profile.preferred_sport && isSport(profile.preferred_sport)
      ? sportLabel[profile.preferred_sport]
      : "Deporte";
  const isOwner = userId === profile.id;

  return (
    <main className="page page-narrow page-carta" id="main">
      <header className="page-head">
        <p className="perfil-eyebrow">Carta BaFut</p>
        <h1>{profile.display_name}</h1>
        <p className="lede">
          Ficha pública · OVR {stats.overall} · {sport}
        </p>
      </header>

      <div className="carta-public">
        {isOwner ? (
          <PublicPlayerCardShareBlock
            draft={draft}
            cityName={cityName}
            share={{
              displayName: draft.displayName,
              overall: stats.overall,
              sport,
              position: draft.position ? positionLabel[draft.position] : null,
              cardCode: code,
            }}
          />
        ) : (
          <>
            <PlayerCard draft={draft} cityName={cityName} enter={false} />
            <p className="empty-home-actions" style={{ marginTop: "1rem" }}>
              <Link href={`/jugador/${code}`} className="btn-flood">
                Ver perfil
              </Link>
            </p>
          </>
        )}
      </div>

      <p className="field-help">
        {isOwner ? (
          <>
            La carta es la imagen. Tu ficha completa (posición, pierna, etc.) está en{" "}
            <Link href={`/jugador/${code}`}>tu perfil público</Link>
            {" · "}
            <Link href="/perfil">Volver al vestuario</Link>
          </>
        ) : (
          <>
            ¿Querés armar la tuya?{" "}
            <Link href="/perfil">Entrá a BaFut</Link>
          </>
        )}
      </p>
    </main>
  );
}
