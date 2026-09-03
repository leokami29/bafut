import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BaFut",
    short_name: "BaFut",
    description: "Falta un jugador. Encuéntralo.",
    start_url: "/",
    display: "standalone",
    background_color: "#0C6B4C",
    theme_color: "#0C6B4C",
    lang: "es-CO",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
