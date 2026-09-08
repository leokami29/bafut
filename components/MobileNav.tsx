"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/app/actions";

const primaryItems = [
  {
    href: "/partidos",
    label: "Hoy",
    match: (p: string) => p === "/partidos" || p.startsWith("/p/"),
  },
  {
    href: "/canchas",
    label: "Canchas",
    match: (p: string) => p.startsWith("/canchas"),
  },
  {
    href: "/partidos/nuevo",
    label: "Publicar",
    match: (p: string) => p === "/partidos/nuevo",
  },
] as const;

export function MobileNav({
  userId,
  pendingCount = 0,
  pendingInboxHref = "/perfil/partidos",
  isAdmin = false,
}: {
  userId: string | null;
  pendingCount?: number;
  /** Con pendientes: deep-link al partido #cupos; si no, lista de partidos. */
  pendingInboxHref?: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const panelId = useId();
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const partidosHref = pendingCount > 0 ? pendingInboxHref : "/perfil/partidos";
  const accountHref = userId ? partidosHref : "/entrar";
  const accountLabel = userId ? "Yo" : "Entrar";
  const accountMatch = userId
    ? (p: string) => p.startsWith("/perfil")
    : (p: string) => p === "/entrar";

  const moreActive =
    pathname.startsWith("/apoyar") ||
    pathname === "/perfil" ||
    (Boolean(userId) && (pathname === "/admin" || pathname.startsWith("/admin/")));

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
        moreBtnRef.current?.focus();
      }
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || moreBtnRef.current?.contains(target)) {
        return;
      }
      setMoreOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [moreOpen]);

  const primary = [
    ...primaryItems,
    { href: accountHref, label: accountLabel, match: accountMatch },
  ];

  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      {primary.map(({ href, label, match }) => {
        const showBadge = Boolean(userId) && href === accountHref && pendingCount > 0;
        const active = match(pathname);
        return (
          <Link
            key={`${href}-${label}`}
            href={href}
            aria-current={active ? "page" : undefined}
            className={active ? "is-active" : undefined}
          >
            <span className="nav-label-wrap">
              {label}
              {showBadge ? (
                <span className="nav-badge" aria-label={`${pendingCount} pedidos pendientes`}>
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}

      <div className="mobile-nav-more">
        <button
          ref={moreBtnRef}
          type="button"
          className={moreOpen || moreActive ? "is-active" : undefined}
          aria-expanded={moreOpen}
          aria-controls={panelId}
          onClick={() => setMoreOpen((open) => !open)}
        >
          Más
        </button>

        {moreOpen ? (
          <div
            ref={panelRef}
            id={panelId}
            className="mobile-nav-panel"
          >
            {userId ? (
              <>
                <Link
                  href={partidosHref}
                  aria-current={pathname.startsWith("/perfil/partidos") ? "page" : undefined}
                  className={pathname.startsWith("/perfil/partidos") ? "is-active" : undefined}
                  onClick={() => setMoreOpen(false)}
                >
                  <span className="nav-label-wrap">
                    Mis partidos
                    {pendingCount > 0 ? (
                      <span className="nav-badge" aria-label={`${pendingCount} pedidos pendientes`}>
                        {pendingCount > 9 ? "9+" : pendingCount}
                      </span>
                    ) : null}
                  </span>
                </Link>
                <Link
                  href="/perfil"
                  aria-current={pathname === "/perfil" ? "page" : undefined}
                  className={pathname === "/perfil" ? "is-active" : undefined}
                  onClick={() => setMoreOpen(false)}
                >
                  Perfil
                </Link>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    aria-current={
                      pathname === "/admin" || pathname.startsWith("/admin/") ? "page" : undefined
                    }
                    className={`nav-link-admin${
                      pathname === "/admin" || pathname.startsWith("/admin/") ? " is-active" : ""
                    }`}
                    onClick={() => setMoreOpen(false)}
                  >
                    Admin
                  </Link>
                ) : null}
              </>
            ) : null}

            <Link
              href="/apoyar"
              aria-current={pathname.startsWith("/apoyar") ? "page" : undefined}
              className={`nav-link-donate${pathname.startsWith("/apoyar") ? " is-active" : ""}`}
              onClick={() => setMoreOpen(false)}
            >
              Apoyar
            </Link>

            {userId ? (
              <form action={signOutAction}>
                <button type="submit">Salir</button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
