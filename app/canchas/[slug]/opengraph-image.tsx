import { ImageResponse } from "next/og";
import { getActiveCity, getVenueBySlug } from "@/lib/data";

export const alt = "Cancha en BaFut";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const city = await getActiveCity();
  const venue = city ? await getVenueBySlug(city.id, slug) : null;

  const title = venue?.name ?? "Cancha en BaFut";
  const barrio = venue?.neighborhood?.trim();
  const subtitle = barrio
    ? barrio
    : (city?.name ?? "Barranquilla");

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
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>{subtitle}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.9, maxWidth: 980 }}>Huecos aquí</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.75 }}>Pateadas abiertas en esta cancha.</div>
      </div>
    ),
    { ...size },
  );
}
