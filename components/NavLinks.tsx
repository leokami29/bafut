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

export function NavLinks({ userId }: { userId: string | null }) {
  const pathname = usePathname();

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
        <Link
          href="/perfil"
          aria-current={pathname === "/perfil" ? "page" : undefined}
          className={pathname === "/perfil" ? "is-active" : undefined}
        >
          Perfil
        </Link>
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
