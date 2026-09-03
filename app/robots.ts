import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/entrar", "/perfil", "/perfil/partidos", "/partidos/nuevo"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
