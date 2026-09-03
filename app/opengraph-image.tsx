import { ImageResponse } from "next/og";

export const alt = "BaFut · pateadas y huecos en Barranquilla";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>Barranquilla</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05, maxWidth: 980 }}>
            Pateadas y huecos
          </div>
          <div style={{ display: "flex", fontSize: 30, opacity: 0.9, maxWidth: 980 }}>
            Canchas abiertas. Concentrá la demanda.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.75 }}>Sin reserva. Solo el hueco.</div>
      </div>
    ),
    { ...size },
  );
}
