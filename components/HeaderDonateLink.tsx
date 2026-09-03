"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function HeaderDonateLink() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const active = pathname.startsWith("/apoyar");

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 899px)");
    const update = () => setShow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (!show) return null;

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
