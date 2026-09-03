"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/partidos", label: "Hoy", match: (p: string) => p === "/partidos" || p.startsWith("/p/") },
  { href: "/canchas", label: "Canchas", match: (p: string) => p.startsWith("/canchas") },
  { href: "/partidos/nuevo", label: "Publicar", match: (p: string) => p === "/partidos/nuevo" },
] as const;

export function MobileNav({
  userId,
  pendingCount = 0,
}: {
  userId: string | null;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const profileHref = userId ? "/perfil/partidos" : "/entrar";
  const profileLabel = userId ? "Partidos" : "Entrar";
  const profileMatch = userId
    ? (p: string) => p.startsWith("/perfil")
    : (p: string) => p === "/entrar";

  const all = [...items, { href: profileHref, label: profileLabel, match: profileMatch }];

  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      {all.map(({ href, label, match }) => {
        const showBadge = href.startsWith("/perfil") && pendingCount > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={match(pathname) ? "page" : undefined}
            className={match(pathname) ? "is-active" : undefined}
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
    </nav>
  );
}
