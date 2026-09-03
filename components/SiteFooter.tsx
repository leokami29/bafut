import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <div className="site-footer-brand-row">
            <Link href="/" className="site-footer-mark">
              BaFut
            </Link>
            <p className="site-footer-copy">© 2026</p>
          </div>
          <p className="site-footer-tag">Open source · sin paywall</p>
        </div>

        <p className="site-footer-made">
          Hecho por{" "}
          <a
            href="https://www.macuttech.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Macuttech
          </a>
        </p>

        <nav className="site-footer-links" aria-label="Pie de página">
          <Link href="/apoyar">Apoyar BaFut</Link>
          <span className="site-footer-sep" aria-hidden="true" />
          <a
            href="https://github.com/leokami29/bafut"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
