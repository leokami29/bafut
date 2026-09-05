import Link from "next/link";

type HomeHowItWorksProps = {
  cityName?: string;
};

export function HomeHowItWorks({ cityName = "Barranquilla" }: HomeHowItWorksProps) {
  return (
    <section className="how-it-works" aria-labelledby="how-title">
      <div className="home-inner">
        <header className="how-head">
          <p className="eyebrow">Cómo funciona</p>
          <h2 id="how-title">Tres toques y estás dentro</h2>
          <p className="how-lede">
            BaFut es el radar de pateadas en {cityName}: ves quién necesita gente en canchas sintéticas y
            armás el partido de fútbol sin enredo.
          </p>
        </header>
        <ol className="how-steps">
          <li className="how-step">
            <span className="how-step-num" aria-hidden="true">
              01
            </span>
            <strong>Publicás el hueco</strong>
            <span>Cancha, hora y la posición que falta. Listo.</span>
          </li>
          <li className="how-step">
            <span className="how-step-num" aria-hidden="true">
              02
            </span>
            <strong>La gente pide cupo</strong>
            <span>Quien esté cerca entra con un toque. Vos ves quién llegó.</span>
          </li>
          <li className="how-step">
            <span className="how-step-num" aria-hidden="true">
              03
            </span>
            <strong>Confirmás y compartís</strong>
            <span>Aceptás al que encaja y mandás el link por WhatsApp.</span>
          </li>
        </ol>
        <p className="how-seo-links">
          Explorá el{" "}
          <Link href="/partidos">radar de partidos y huecos abiertos</Link>
          {" · "}
          <Link href="/canchas">canchas sintéticas en {cityName}</Link>
        </p>
      </div>
    </section>
  );
}
