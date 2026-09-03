"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/partidos", label: "Hoy", match: (p: string) => p === "/partidos" || p.startsWith("/p/") },
  { href: "/canchas", label: "Canchas", match: (p: string) => p.startsWith("/canchas") },
  { href: "/partidos/nuevo", label: "Publicar", match: (p: string) => p === "/partidos/nuevo" },
] as const;

export function MobileNav({ userId }: { userId: string | null }) {
  const pathname = usePathname();
  const profileHref = userId ? "/perfil" : "/entrar";
  const profileLabel = userId ? "Perfil" : "Entrar";
  const profileMatch = userId ? (p: string) => p === "/perfil" : (p: string) => p === "/entrar";

  const all = [...items, { href: profileHref, label: profileLabel, match: profileMatch }];

  return (
    <nav className="mobile-nav" aria-label="Navegación móvil">
      {all.map(({ href, label, match }) => (
        <Link
          key={href}
          href={href}
          aria-current={match(pathname) ? "page" : undefined}
          className={match(pathname) ? "is-active" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
