"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderDonateLink() {
  const pathname = usePathname();
  const active = pathname.startsWith("/apoyar");

  return (
    <Link
      href="/apoyar"
      className={`nav-link-donate site-header-donate${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      Apoyar
    </Link>
  );
}
