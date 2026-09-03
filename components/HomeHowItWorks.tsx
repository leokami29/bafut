export function HomeHowItWorks() {
  return (
    <section className="how-it-works" aria-labelledby="how-title">
      <div className="home-inner">
        <header className="how-head">
          <p className="eyebrow">Cómo funciona</p>
          <h2 id="how-title">Tres toques y estás dentro</h2>
          <p className="how-lede">
            BaFut es el radar de pateadas en la ciudad: ves quién necesita gente y armás el equipo sin enredo.
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
      </div>
    </section>
  );
}
