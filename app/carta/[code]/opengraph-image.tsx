import { ImageResponse } from "next/og";
import { getPublicPlayerCardByCode } from "@/lib/data";
import { formatLabel, sportLabel } from "@/lib/labels";
import {
  cardTier,
  formatStatCount,
  formatTrustStat,
  PLAYER_CARD_STAT_LABELS,
} from "@/lib/player-card";
import { isPublicPlayerCard } from "@/lib/profile";
import { isSport } from "@/lib/sport-rules";

export const alt = "Carta de jugador en BaFut";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ code: string }> };

const tierBackground: Record<string, string> = {
  rookie: "linear-gradient(145deg, #1a4d3a 0%, #0C6B4C 55%, #123047 100%)",
  club: "linear-gradient(145deg, #0C6B4C 0%, #08553c 55%, #123047 100%)",
  oro: "linear-gradient(145deg, #3d3520 0%, #0C6B4C 45%, #1a1408 100%)",
  elite: "linear-gradient(145deg, #1a1408 0%, #0C6B4C 40%, #03140f 100%)",
};

export default async function Image({ params }: Props) {
  const { code } = await params;
  let data: Awaited<ReturnType<typeof getPublicPlayerCardByCode>> = null;
  try {
    data = await getPublicPlayerCardByCode(code);
  } catch {
    data = null;
  }
  const shareable = data ? isPublicPlayerCard(data.profile) : false;

  if (!data || !shareable) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            background: "linear-gradient(145deg, #0C6B4C 0%, #08553c 55%, #123047 100%)",
            color: "#F4F7F2",
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: 1 }}>BaFut</div>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>Carta de jugador</div>
          <div style={{ display: "flex", fontSize: 24, opacity: 0.75 }}>Tu ficha en BaFut</div>
        </div>
      ),
      { ...size },
    );
  }

  const { profile, stats } = data;
  const sport = profile.preferred_sport && isSport(profile.preferred_sport)
    ? sportLabel[profile.preferred_sport]
    : "Deporte";
  const format =
    profile.preferred_format && profile.preferred_format in formatLabel
      ? formatLabel[profile.preferred_format as keyof typeof formatLabel]
      : null;
  const tier = cardTier(stats);
  const name = profile.display_name.trim() || "Jugador";
  const overall = stats.overall;

  const statItems = [
    { label: PLAYER_CARD_STAT_LABELS.played, value: formatStatCount(stats.played) },
    { label: PLAYER_CARD_STAT_LABELS.confirmed, value: formatStatCount(stats.confirmed) },
    { label: PLAYER_CARD_STAT_LABELS.hosted, value: formatStatCount(stats.hosted) },
    { label: PLAYER_CARD_STAT_LABELS.trust, value: formatTrustStat(stats) },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: tierBackground[tier] ?? tierBackground.club,
          color: "#F4F7F2",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: 1 }}>BaFut</div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: 2,
              opacity: 0.85,
            }}
          >
            {tier}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>
            {sport}
            {format ? ` · ${format}` : ""}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
            <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 820 }}>
              {name}
            </div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 900, color: "#F5D547" }}>{overall}</div>
          </div>
          <div style={{ display: "flex", gap: 28, marginTop: 8 }}>
            {statItems.map((item) => (
              <div key={item.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", fontSize: 36, fontWeight: 800 }}>{item.value}</div>
                <div style={{ display: "flex", fontSize: 20, opacity: 0.75, letterSpacing: 1 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, opacity: 0.75 }}>Carta de jugador · BaFut</div>
      </div>
    ),
    { ...size },
  );
}
