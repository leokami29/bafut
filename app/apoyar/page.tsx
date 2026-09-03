import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Apoyar",
  description: "Invita un café para hosting, mapa y curar canchas en BaFut.",
};

export default function ApoyarPage() {
  const kofi = process.env.NEXT_PUBLIC_DONATE_KOFI?.trim();
  const github = process.env.NEXT_PUBLIC_DONATE_GITHUB?.trim();
  const nequi = process.env.NEXT_PUBLIC_DONATE_NEQUI?.trim();
  const links = [
    kofi ? { href: kofi, label: "Ko-fi", blurb: "Un café para el hosting" } : null,
    github ? { href: github, label: "GitHub Sponsors", blurb: "Apoya el código abierto" } : null,
    nequi ? { href: nequi, label: "Nequi / transferencia", blurb: "Desde Colombia" } : null,
  ].filter((item): item is { href: string; label: string; blurb: string } => Boolean(item));

  return (
    <main className="page page-narrow" id="main">
      <header className="page-head">
        <p className="eyebrow">BaFut</p>
        <h1>Invita un café</h1>
        <p>
          BaFut no cobra el partido. Si te sirve armar la pateada, puedes aportar al hosting de Supabase, el dominio
          y el tiempo de curar canchas.
        </p>
      </header>

      {links.length > 0 ? (
        <ul className="donate-list">
          {links.map((link) => (
            <li key={link.href}>
              <a className="btn-flood" href={link.href} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
              <p className="donate-blurb">{link.blurb}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">
          Todavía no hay enlaces de donación configurados. Mientras tanto puedes{" "}
          <Link href="/partidos/nuevo">publicar un hueco</Link> o reportar canchas que falten.
        </p>
      )}

      <p className="foot-link">
        <Link href="/partidos">Volver a partidos</Link>
      </p>
    </main>
  );
}
