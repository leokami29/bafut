import Link from "next/link";

type HomeDifferentialProps = {
  cityName: string;
};

export function HomeDifferential({ cityName }: HomeDifferentialProps) {
  return (
    <section className="home-diff" aria-labelledby="diff-title">
      <div className="home-inner">
        <p className="eyebrow">El punto</p>
        <h2 id="diff-title">No reservamos la cancha. Armamos la pateada.</h2>
        <p className="home-diff-lede">
          BaFut no es una app de alquiler ni reemplaza WhatsApp. Es la lista pública del hueco:
          posición, hora y cancha — para que entre quien falta en {cityName}.
        </p>

        <dl className="home-diff-lanes">
          <div className="home-diff-lane">
            <dt>Si jugás</dt>
            <dd>
              Publicás o pedís el cupo. El host confirma. Compartís el link al grupo. Se acabó el
              “¿quién falta?” perdido en el chat.
            </dd>
          </div>
          <div className="home-diff-lane home-diff-lane-owner">
            <dt>Si tenés la cancha</dt>
            <dd>
              Cuando publican un hueco en tu predio, la demanda se ve en tu ficha. Concentramos
              interés — no cobramos el alquiler.
            </dd>
          </div>
        </dl>

        <div className="home-diff-actions">
          <Link className="btn-flood" href="/partidos/nuevo">
            Publicar hueco
          </Link>
          <Link className="btn-ghost home-diff-owner-link" href="/duenos">
            Soy dueño de cancha
          </Link>
        </div>
      </div>
    </section>
  );
}
