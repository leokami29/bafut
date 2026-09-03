import type { Metadata } from "next";
import Link from "next/link";
import { robotsNoIndex } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: robotsNoIndex,
};

export default function NotFound() {
  return (
    <main className="page">
      <h1>Eso no está</h1>
      <p className="empty">El partido o la cancha no aparecen. Vuelve al feed de hoy.</p>
      <Link className="btn-flood" href="/partidos">
        Partidos de hoy
      </Link>
    </main>
  );
}
