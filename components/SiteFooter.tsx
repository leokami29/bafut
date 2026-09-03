import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        <Link href="/duenos">Dueños de cancha</Link>
        {" · "}
        <Link href="/apoyar">Apoyar BaFut</Link>
        {" · "}
        <span>Open source · sin paywall</span>
      </p>
    </footer>
  );
}
