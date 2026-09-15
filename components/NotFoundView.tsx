import Link from "next/link";
import { NotFoundSportsScene } from "@/components/NotFoundSportsScene";

export type NotFoundSurface = "web" | "ops";

type Props = {
  surface: NotFoundSurface;
};

export function NotFoundView({ surface }: Props) {
  const isOps = surface === "ops";

  return (
    <main className="nf-page" id="main">
      <div className="nf-stage">
        <p className="nf-brand">{isOps ? "BaFut Ops" : "BaFut"}</p>

        <div className="nf-scoreboard" aria-hidden="true">
          <span className="nf-score-digit">4</span>
          <span className="nf-score-ball" />
          <span className="nf-score-digit">4</span>
        </div>

        <h1 className="nf-title">Eso no está en la cancha</h1>
        <p className="nf-lede">
          {isOps
            ? "La ruta no existe en el panel. Volvé al inicio o a la plataforma."
            : "El partido, la cancha o el enlace no aparecen. Probá el feed de hoy."}
        </p>

        <NotFoundSportsScene />

        <div className="nf-actions">
          {isOps ? (
            <>
              <Link className="btn-flood" href="/">
                Inicio ops
              </Link>
              <Link className="btn-ghost" href="/admin">
                Plataforma
              </Link>
            </>
          ) : (
            <>
              <Link className="btn-flood" href="/partidos">
                Partidos de hoy
              </Link>
              <Link className="btn-ghost" href="/canchas">
                Ver canchas
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
