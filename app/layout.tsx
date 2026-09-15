import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, IBM_Plex_Mono, Outfit } from "next/font/google";
import { AccountDeletionBanner } from "@/components/AccountDeletionBanner";
import { AuthHashHandler } from "@/components/AuthHashHandler";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { MobileNav } from "@/components/MobileNav";
import { PwaRegister } from "@/components/PwaRegister";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { rejectPurgedProfileSession } from "@/lib/auth";
import { canCancelAccountDeletion } from "@/lib/account-deletion";
import { getActiveCity, getCities, getHostPendingInbox, getIsAdmin, getProfile, getSessionUserId } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
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
  const [pendingInbox, profile, isAdmin] = userId
    ? await Promise.all([
        getHostPendingInbox(userId),
        getProfile(userId),
        getIsAdmin(userId),
      ])
    : [{ count: 0, href: "/perfil/partidos" }, null, false];

  if (userId && profile) {
    const supabase = await createClient();
    await rejectPurgedProfileSession(supabase, userId, profile);
  }

  const pendingCount = pendingInbox.count;
  const deletionBannerPurgeAt =
    profile && canCancelAccountDeletion(profile) && profile.purge_at ? profile.purge_at : null;

  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Saltar al contenido
        </a>
        <GoogleAnalytics />
        <PwaRegister />
        <AuthHashHandler />
        <SiteHeader
          city={city}
          cities={cities}
          userId={userId}
          pendingCount={pendingCount}
          pendingInboxHref={pendingInbox.href}
          isAdmin={isAdmin}
        />
        {deletionBannerPurgeAt ? <AccountDeletionBanner purgeAt={deletionBannerPurgeAt} /> : null}
        {children}
        <SiteFooter />
        <MobileNav
          userId={userId}
          pendingCount={pendingCount}
          pendingInboxHref={pendingInbox.href}
          isAdmin={isAdmin}
        />
      </body>
    </html>
  );
}
