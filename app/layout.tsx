import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Outfit } from "next/font/google";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { MobileNav } from "@/components/MobileNav";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveCity, getCities, getHostPendingClaimCount, getSessionUserId } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  SITE_NAME,
  TITLE_TEMPLATE,
  defaultOg,
  defaultTwitter,
} from "@/lib/seo";
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
  metadataBase: new URL(siteUrl()),
  title: {
    default: DEFAULT_TITLE,
    template: TITLE_TEMPLATE,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: defaultOg(),
  twitter: defaultTwitter(),
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
        <AuthHashHandler />
        <SiteHeader city={city} cities={cities} userId={userId} pendingCount={pendingCount} />
        {children}
        <SiteFooter />
        <MobileNav userId={userId} pendingCount={pendingCount} />
      </body>
    </html>
  );
}
