"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page" id="main">
      <h1>Algo falló</h1>
      <p className="empty">No pudimos cargar esta pantalla. Intenta otra vez o vuelve al feed.</p>
      <div className="hero-ctas">
        <button type="button" className="btn-flood" onClick={() => reset()}>
          Reintentar
        </button>
        <Link className="btn-ghost" href="/partidos">
          Partidos de hoy
        </Link>
      </div>
    </main>
  );
}
