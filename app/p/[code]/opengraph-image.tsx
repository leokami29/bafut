import { ImageResponse } from "next/og";
import { getMatchByCode } from "@/lib/data";
import { openSlotCount, slotIsOpen } from "@/lib/types";
import { formatWhen, openSlotsPhrase } from "@/lib/format";
import { positionLabel, sportLabel } from "@/lib/labels";
import type { Position } from "@/lib/constants";

export const alt = "Partido en BaFut";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ code: string }> };

export default async function Image({ params }: Props) {
  const { code } = await params;
  const match = await getMatchByCode(code);

  const title = match
    ? openSlotsPhrase(
        openSlotCount(match),
        positionLabel[
          (match.match_slots.find(slotIsOpen)?.position ??
            match.match_slots[0]?.position ??
            "any") as Position
        ] ?? "Cualquiera",
      )
    : "Partido en BaFut";

  const subtitle = match
    ? `${formatWhen(match.starts_at, match.cities.timezone)} · ${match.venues.name}`
    : "Falta un jugador. Encuéntralo.";

  const sport = match
    ? sportLabel[match.sport as keyof typeof sportLabel] ?? match.sport
    : "BaFut";

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
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>{sport}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.9, maxWidth: 980 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.75 }}>Sin teléfonos. Solo el hueco.</div>
      </div>
    ),
    { ...size },
  );
}
