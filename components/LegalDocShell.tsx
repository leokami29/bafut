import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_PRIVACY_PATH, LEGAL_TERMS_PATH } from "@/lib/legal";

type LegalDocShellProps = {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
  /** Ruta hermana para el pie de navegación legal. */
  sibling: "terminos" | "privacidad";
};

export function LegalDocShell({
  eyebrow,
  title,
  updated,
  children,
  sibling,
}: LegalDocShellProps) {
  const siblingHref = sibling === "terminos" ? LEGAL_TERMS_PATH : LEGAL_PRIVACY_PATH;
  const siblingLabel = sibling === "terminos" ? "Términos de uso" : "Política de privacidad";

  return (
    <main className="page page-narrow legal-doc" id="main">
      <header className="page-head">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="legal-doc-updated">Última actualización: {updated}</p>
      </header>
      <div className="legal-doc-body">{children}</div>
      <nav className="legal-doc-nav" aria-label="Documentos legales">
        <Link href={siblingHref}>{siblingLabel}</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/">Inicio</Link>
      </nav>
    </main>
  );
}
