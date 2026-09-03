export function HomeHowItWorks() {
  return (
    <section className="how-it-works" aria-label="Cómo funciona BaFut">
      <div className="home-inner">
        <ol className="how-steps">
          <li className="how-step">
            <span className="how-step-num" aria-hidden="true">
              1
            </span>
            <strong>Publicás el hueco</strong>
            <span>Cancha, hora y posición que falta — no el alquiler.</span>
          </li>
          <li className="how-step">
            <span className="how-step-num" aria-hidden="true">
              2
            </span>
            <strong>Piden cupo</strong>
            <span>Los jugadores entran con un toque.</span>
          </li>
          <li className="how-step">
            <span className="how-step-num" aria-hidden="true">
              3
            </span>
            <strong>Confirmás y compartís</strong>
            <span>Aceptás al que encaja y mandás el link por WhatsApp.</span>
          </li>
        </ol>
      </div>
    </section>
  );
}
