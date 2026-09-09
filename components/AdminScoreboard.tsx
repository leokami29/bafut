"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminQueueCounts } from "@/lib/admin-queues";

type Segment = {
  href: string;
  label: string;
  count: number | null;
  urgent?: (count: number) => boolean;
};

export function AdminScoreboard({ counts }: { counts: AdminQueueCounts }) {
  const pathname = usePathname();

  const segments: Segment[] = [
    { href: "/admin", label: "Mesa", count: null },
    {
      href: "/admin/claims",
      label: "Reclamos",
      count: counts.pendingClaims,
      urgent: (n) => n > 0,
    },
    {
      href: "/admin/premium",
      label: "Premium",
      count: counts.pendingSubRequests,
      urgent: (n) => n > 0,
    },
    {
      href: "/admin/renewals",
      label: "Renovaciones",
      count: counts.pendingRenewals,
      urgent: (n) => n > 0,
    },
    { href: "/admin/flags", label: "Flags", count: null },
    { href: "/admin/venues", label: "Canchas", count: counts.totalVenues },
  ];

  return (
    <nav className="admin-board" aria-label="Secciones de administración">
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

      <ul className="admin-board-segments">
        {segments.map((segment) => {
          const active =
            segment.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(segment.href);
          return (
            <li key={segment.href}>
              <Link
                href={segment.href}
                className={`admin-board-segment${active ? " is-active" : ""}${
                  segment.count && segment.urgent?.(segment.count) ? " is-hot" : ""
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span className="admin-board-label">{segment.label}</span>
                {segment.count != null ? (
                  <span className="admin-board-num" aria-label={`${segment.count} pendientes`}>
                    {String(segment.count).padStart(2, "0")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link href="/admin/venues/nuevo" className="admin-board-new">
        + Cancha
      </Link>
    </nav>
  );
}
