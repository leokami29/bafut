"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type VenueAdminNavCounts = {
  photos?: number;
  pendingPremium?: number;
  promotions?: number;
  pendingTurnos?: number;
};

type Segment = {
  href: string;
  label: string;
  count: number | null;
  match: (pathname: string, tab: string | null) => boolean;
  urgent?: (count: number) => boolean;
};

type VenueAdminNavProps = {
  venueSlug: string;
  counts?: VenueAdminNavCounts;
  /** CTA derecha: crea promo en precios. */
  showPromoCta?: boolean;
};

export function VenueAdminNav({
  venueSlug,
  counts = {},
  showPromoCta = true,
}: VenueAdminNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const base = `/canchas/${venueSlug}/admin`;

  const segments: Segment[] = [
    {
      href: base,
      label: "Mesa",
      count: null,
      match: (path, t) => path === base && (!t || t === "mesa"),
    },
    {
      href: `${base}?tab=ficha`,
      label: "Ficha",
      count: null,
      match: (path, t) => path === base && t === "ficha",
    },
    {
      href: `${base}?tab=premium`,
      label: "Premium",
      count: counts.pendingPremium ?? null,
      urgent: (n) => n > 0,
      match: (path, t) => path === base && t === "premium",
    },
    {
      href: `${base}?tab=fotos`,
      label: "Fotos",
      count: counts.photos ?? null,
      match: (path, t) => path === base && t === "fotos",
    },
    {
      href: `${base}/precios`,
      label: "Precios",
      count: null,
      match: (path, t) => path.startsWith(`${base}/precios`) && t !== "promos",
    },
    {
      href: `${base}/precios?tab=promos`,
      label: "Promos",
      count: counts.promotions ?? null,
      match: (path, t) => path.startsWith(`${base}/precios`) && t === "promos",
    },
    {
      href: `${base}/turnos`,
      label: "Reservas",
      count: counts.pendingTurnos ?? null,
      urgent: (n) => n > 0,
      match: (path) => path.startsWith(`${base}/turnos`),
    },
    {
      href: `${base}/ingresos`,
      label: "Ingresos",
      count: null,
      match: (path) => path.startsWith(`${base}/ingresos`),
    },
    {
      href: `${base}/torneos`,
      label: "Torneos",
      count: null,
      match: (path) => path.startsWith(`${base}/torneos`),
    },
  ];

  return (
    <nav className="venue-admin-board admin-board" aria-label="Secciones de administración de cancha">
      <svg
        className="admin-board-lines"
        viewBox="0 0 1200 64"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="8"
          width="1184"
          height="48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <line x1="600" y1="8" x2="600" y2="56" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="600" cy="32" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <ul className="admin-board-segments venue-admin-board-segments">
        {segments.map((segment) => {
          const active = segment.match(pathname, tab);
          const hot =
            segment.count != null && segment.urgent?.(segment.count) ? " is-hot" : "";
          return (
            <li key={segment.href}>
              <Link
                href={segment.href}
                className={`admin-board-segment${active ? " is-active" : ""}${hot}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="admin-board-label">{segment.label}</span>
                {segment.count != null ? (
                  <span className="admin-board-num" aria-label={`${segment.count}`}>
                    {String(segment.count).padStart(2, "0")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {showPromoCta ? (
        <Link href={`${base}/precios?tab=promos&crear=1`} className="admin-board-new">
          + Promo
        </Link>
      ) : null}
    </nav>
  );
}
