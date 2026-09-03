import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Outfit } from "next/font/google";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { MobileNav } from "@/components/MobileNav";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveCity, getCities, getHostPendingClaimCount, getSessionUserId } from "@/lib/data";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800"],
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "BaFut",
    template: "%s · BaFut",
  },
  description: "Falta un jugador. Encuéntralo. Partidos abiertos en canchas, empezando por Barranquilla.",
  applicationName: "BaFut",
  appleWebApp: {
    capable: true,
    title: "BaFut",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C6B4C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [city, cities, userId] = await Promise.all([
    getActiveCity(),
    getCities(),
    getSessionUserId(),
  ]);
  const pendingCount = userId ? await getHostPendingClaimCount(userId) : 0;

  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>
        <GoogleAnalytics />
        <PwaRegister />
        <SiteHeader city={city} cities={cities} userId={userId} pendingCount={pendingCount} />
        {children}
        <SiteFooter />
        <MobileNav userId={userId} pendingCount={pendingCount} />
      </body>
    </html>
  );
}
