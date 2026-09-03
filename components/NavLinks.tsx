"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/partidos", label: "Hoy" },
  { href: "/canchas", label: "Canchas" },
  { href: "/partidos/nuevo", label: "Publicar" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/partidos") {
    return pathname === "/partidos" || pathname.startsWith("/p/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  userId,
  pendingCount = 0,
}: {
  userId: string | null;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const pedidosActive = pathname.startsWith("/perfil/partidos");
  const perfilActive = pathname === "/perfil";

  return (
    <>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className={isActive(pathname, href) ? "is-active" : undefined}
        >
          {label}
        </Link>
      ))}
      {userId ? (
        <>
          <Link
            href="/perfil/partidos"
            aria-current={pedidosActive ? "page" : undefined}
            className={pedidosActive ? "is-active" : undefined}
          >
            <span className="nav-label-wrap">
              <span className="nav-label-long">Mis partidos</span>
              <span className="nav-label-short">Pedidos</span>
              {pendingCount > 0 ? (
                <span className="nav-badge" aria-label={`${pendingCount} pedidos pendientes`}>
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              ) : null}
            </span>
          </Link>
          <Link
            href="/perfil"
            aria-current={perfilActive ? "page" : undefined}
            className={perfilActive ? "is-active" : undefined}
          >
            Perfil
          </Link>
        </>
      ) : (
        <Link
          href="/entrar"
          aria-current={pathname === "/entrar" ? "page" : undefined}
          className={pathname === "/entrar" ? "is-active" : undefined}
        >
          Entrar
        </Link>
      )}
    </>
  );
}
