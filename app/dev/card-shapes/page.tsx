import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PlayerCard } from "@/components/PlayerCard";
import type { Format, Position, Sport } from "@/lib/constants";
import { sportLabel } from "@/lib/labels";
import {
  sportUsesPreferredFoot,
  type CardTier,
  type PlayerCardDraft,
  type PlayerCardStats,
} from "@/lib/player-card";
import "./shapes.css";

export const metadata: Metadata = {
  title: "Formas de carta (dev)",
  robots: { index: false, follow: false },
};

type ShapeSection = {
  id: string;
  heading: string;
  description: string;
};

type ShapeVariant = {
  id: string;
  title: string;
  badge?: string;
  note: string;
  pros: string;
  cons: string;
  render: () => ReactNode;
};

const PROD_SPORTS: Sport[] = ["futbol", "futbol_sala", "basquet", "voleibol", "padel"];

const PROD_TIERS: { id: CardTier; label: string; threshold: string }[] = [
  { id: "rookie", label: "Rookie", threshold: "OVR 0 o <3 PJ" },
  { id: "club", label: "Club", threshold: "Umbral base" },
  { id: "oro", label: "Oro", threshold: "OVR ≥60 o confianza ≥70% (≥3 feedbacks)" },
  { id: "elite", label: "Elite", threshold: "OVR ≥80" },
];

function parseProdSport(raw?: string): Sport {
  if (raw && PROD_SPORTS.includes(raw as Sport)) {
    return raw as Sport;
  }
  return "futbol";
}

function prodSportHref(sport: Sport): string {
  return sport === "futbol" ? "/dev/card-shapes" : `/dev/card-shapes?deporte=${sport}`;
}

const PROD_TIER_STATS: Record<CardTier, PlayerCardStats> = {
  rookie: {
    played: 2,
    confirmed: 0,
    hosted: 0,
    decidedClaims: 0,
    levelOk: 0,
    levelFeedback: 0,
    overall: 0,
  },
  club: {
    played: 18,
    confirmed: 14,
    hosted: 3,
    decidedClaims: 16,
    levelOk: 2,
    levelFeedback: 2,
    overall: 52,
  },
  oro: {
    played: 35,
    confirmed: 30,
    hosted: 8,
    decidedClaims: 32,
    levelOk: 22,
    levelFeedback: 30,
    overall: 67,
  },
  elite: {
    played: 42,
    confirmed: 38,
    hosted: 12,
    decidedClaims: 40,
    levelOk: 35,
    levelFeedback: 38,
    overall: 87,
  },
};

const PROD_SPORT_META: Record<
  Sport,
  { position: Position; format: Format; displayName: string; neighborhood: string }
> = {
  futbol: { position: "mid", format: "7v7", displayName: "Juan P.", neighborhood: "El Prado" },
  futbol_sala: { position: "cierre", format: "5v5", displayName: "Luis M.", neighborhood: "Boston" },
  basquet: { position: "base", format: "5v5", displayName: "Carlos R.", neighborhood: "Villa Santos" },
  voleibol: { position: "central", format: "6v6", displayName: "Ana V.", neighborhood: "Riomar" },
  padel: { position: "reves", format: "2v2", displayName: "Diego S.", neighborhood: "Country" },
};

function buildProdDraft(sport: Sport, tier: CardTier): PlayerCardDraft {
  const meta = PROD_SPORT_META[sport];
  return {
    displayName: meta.displayName,
    avatarUrl: null,
    sport,
    format: meta.format,
    position: meta.position,
    neighborhood: meta.neighborhood,
    cityName: "Barranquilla",
    preferredFoot: sportUsesPreferredFoot(sport) ? "right" : null,
    heightCm: 178,
    age: 28,
    playsForPay: false,
    level: "mid",
    stats: PROD_TIER_STATS[tier],
  };
}

function ProductionMatrix({ activeSport }: { activeSport: Sport }) {
  return (
    <div className="shape-lab__section prod-preview-section">
      <header className="shape-lab__section-head">
        <h2 className="shape-lab__section-title">Sistema en producción — deporte × logros</h2>
        <p className="shape-lab__section-desc">
          Componente real <code>PlayerCard</code> con Motion (enter, hover lift, tilt oro/elite e
          idle CSS). Drafts mock por tier; temas por <code>data-sport</code>; marco por{" "}
          <code>data-tier</code>. También en <Link href="/perfil">/perfil</Link>.
        </p>
      </header>

      <p className="prod-preview__legend">
        <strong>Umbrales:</strong> rookie — OVR 0 o &lt;3 PJ · club — base · oro — OVR≥60 o
        confianza≥70% con ≥3 feedbacks · elite — OVR≥80
      </p>

      <nav className="prod-preview__tabs" aria-label="Deporte">
        {PROD_SPORTS.map((sport) => {
          const isActive = sport === activeSport;
          return (
            <Link
              key={sport}
              href={prodSportHref(sport)}
              className={[
                "prod-preview__tab",
                isActive && "prod-preview__tab--active",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {sportLabel[sport]}
            </Link>
          );
        })}
      </nav>

      <div
        className="prod-preview__grid"
        role="list"
        aria-label={`Variantes de tier — ${sportLabel[activeSport]}`}
      >
        {PROD_TIERS.map((tier) => (
          <figure key={tier.id} className="prod-preview__item" role="listitem">
            <div key={`${activeSport}-${tier.id}`} className="prod-preview__card-slot">
              <PlayerCard draft={buildProdDraft(activeSport, tier.id)} interactive={false} />
            </div>
            <figcaption className="prod-preview__caption">
              <span className="prod-preview__tier-name">{tier.label}</span>
              <span className="prod-preview__tier-threshold">{tier.threshold}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

const SECTIONS: ShapeSection[] = [
  {
    id: "legacy",
    heading: "Clip-path puro (problema)",
    description:
      "Variantes originales. clip-path recorta border, box-shadow y outline — el borde dorado desaparece en chaflanes y la sombra no sigue la silueta.",
  },
  {
    id: "fixes",
    heading: "Técnicas con borde y sombra",
    description:
      "Alternativas que mantienen el marco dorado siguiendo la forma y una sombra coherente con la silueta.",
  },
];

function MockCardContent() {
  return (
    <>
      <div className="mock-card__glow" aria-hidden="true" />
      <header className="mock-card__top">
        <p className="mock-card__overall">
          <span className="mock-card__ovr">87</span>
          <span className="mock-card__pos">MC</span>
        </p>
        <p className="mock-card__brand">BaFut</p>
      </header>
      <div className="mock-card__shot">
        <div className="mock-card__silhouette" aria-hidden="true">
          <span />
        </div>
      </div>
      <div className="mock-card__meta">
        <p className="mock-card__name">Juan P.</p>
        <p className="mock-card__club">Fútbol · 7 vs 7</p>
        <p className="mock-card__place">El Prado · Barranquilla</p>
      </div>
      <dl className="mock-card__stats">
        <div>
          <dt>PJ</dt>
          <dd>42</dd>
        </div>
        <div>
          <dt>CF</dt>
          <dd>38</dd>
        </div>
        <div>
          <dt>ORG</dt>
          <dd>12</dd>
        </div>
        <div>
          <dt>OK</dt>
          <dd>94</dd>
        </div>
      </dl>
      <p className="mock-card__foot">28 años · 178 cm · Diestro</p>
    </>
  );
}

function MockCard({
  className,
  inner = false,
}: {
  className: string;
  inner?: boolean;
}) {
  return (
    <article
      className={["mock-card", inner && "mock-card--inner", className].filter(Boolean).join(" ")}
      aria-label="Carta de ejemplo — Juan P."
    >
      <MockCardContent />
    </article>
  );
}

function CardDemo({
  wrapClass,
  shellClass,
  cardClass,
  inner = false,
}: {
  wrapClass?: string;
  shellClass?: string;
  cardClass: string;
  inner?: boolean;
}) {
  const card = <MockCard className={cardClass} inner={inner} />;

  if (shellClass) {
    return (
      <div className={["mock-wrap", wrapClass].filter(Boolean).join(" ")}>
        <div className={["mock-shell", shellClass].join(" ")}>{card}</div>
      </div>
    );
  }

  return <div className={["mock-wrap", wrapClass].filter(Boolean).join(" ")}>{card}</div>;
}

const LEGACY_SHAPES: ShapeVariant[] = [
  {
    id: "octagon-legacy",
    title: "Octágono actual",
    badge: "clip-path puro — pierde borde/sombra",
    note: "Referencia del PlayerCard productivo. inset box-shadow simula borde pero clip-path lo corta en chaflanes.",
    pros: "Un solo nodo, CSS mínimo.",
    cons: "Sin borde en esquinas; box-shadow rectangular o ausente.",
    render: () => <CardDemo cardClass="mock-card--octagon" />,
  },
  {
    id: "ticket-legacy",
    title: "Ticket (chaflanes)",
    badge: "clip-path puro — pierde borde/sombra",
    note: "Chaflán de 1.1rem en las cuatro esquinas vía polygon().",
    pros: "Forma clara tipo entrada/ticket.",
    cons: "Borde dorado cortado en diagonales; sombra no sigue chaflán.",
    render: () => <CardDemo cardClass="mock-card--ticket" />,
  },
  {
    id: "asymmetric-legacy",
    title: "Panel asimétrico",
    badge: "clip-path puro — pierde borde/sombra",
    note: "Base plana con corte inferior en V — estilo placa deportiva.",
    pros: "Silueta distintiva, fácil de parametrizar.",
    cons: "Mismo recorte de borde/sombra en vértices.",
    render: () => <CardDemo cardClass="mock-card--asymmetric" />,
  },
  {
    id: "hexagon-legacy",
    title: "Hexágono suave",
    badge: "clip-path puro — pierde borde/sombra",
    note: "Hexágono vertical con lados suavizados (8 puntos).",
    pros: "Look premium / cromo coleccionable.",
    cons: "Bordes superiores/inferiores casi invisibles; sombra plana.",
    render: () => <CardDemo cardClass="mock-card--hexagon" />,
  },
  {
    id: "rounded",
    title: "Rectángulo redondeado",
    note: "Control sano: border-radius no recorta border ni box-shadow.",
    pros: "Borde y sombra nativos, accesible, sin hacks.",
    cons: "Menos “cromo”; no evoca ticket/octágono.",
    render: () => <CardDemo cardClass="mock-card--rounded" />,
  },
];

const FIX_SHAPES: ShapeVariant[] = [
  {
    id: "asymmetric-double-layer",
    title: "Panel asimétrico — doble capa clip-path",
    note: "Técnica 1: shell dorado con clip-path + inner con polygon() inset + drop-shadow en wrapper externo sin clip.",
    pros: "Borde sigue la forma al 100%; sombra respeta silueta; patrón reutilizable.",
    cons: "3 capas DOM; polygon interior hay que calibrar manualmente.",
    render: () => (
      <CardDemo
        wrapClass="mock-wrap--shadow"
        shellClass="mock-shell--asymmetric"
        cardClass="mock-card--asymmetric-inner"
        inner
      />
    ),
  },
  {
    id: "octagon-drop-shadow",
    title: "Octágono — drop-shadow + doble capa",
    note: "Técnica 7: octágono actual corregido — borde simulado con shell dorado + filter: drop-shadow.",
    pros: "Drop-in visual para reemplazar la carta actual; borde uniforme en chaflanes.",
    cons: "Sigue siendo doble capa; no arregla clip-path de un solo nodo.",
    render: () => (
      <CardDemo
        wrapClass="mock-wrap--shadow"
        shellClass="mock-shell--octagon"
        cardClass="mock-card--octagon-inner"
        inner
      />
    ),
  },
  {
    id: "ticket-drop-shadow",
    title: "Ticket — solo drop-shadow",
    note: "Técnica 2: mantiene clip-path puro pero sustituye box-shadow por filter: drop-shadow en wrapper sin clip.",
    pros: "Sombra sigue chaflanes; cambio mínimo (1 wrapper).",
    cons: "Borde inset sigue cortado — solo arregla sombra, no el marco.",
    render: () => (
      <CardDemo wrapClass="mock-wrap--shadow" cardClass="mock-card--ticket" />
    ),
  },
  {
    id: "ticket-double-layer",
    title: "Ticket — doble capa clip-path",
    note: "Shell dorado + inner con polygon() inset; sombra en wrapper externo.",
    pros: "Borde continuo en las 4 esquinas cortadas; sombra tipo ticket.",
    cons: "Dos clip-path sincronizados; más CSS que rounded.",
    render: () => (
      <CardDemo
        wrapClass="mock-wrap--shadow"
        shellClass="mock-shell--ticket"
        cardClass="mock-card--ticket-inner"
        inner
      />
    ),
  },
  {
    id: "grad-corners",
    title: "Ticket — gradientes en esquinas",
    note: "Técnica 3: rectángulo con border: 2px real; linear-gradient en cada esquina simula chaflán sin clip-path.",
    pros: "Borde CSS nativo intacto; box-shadow rectangular funciona; un solo nodo.",
    cons: "Chaflán es ilusión (triángulos del fondo); no sirve para formas complejas.",
    render: () => (
      <CardDemo wrapClass="mock-wrap--box-shadow" cardClass="mock-card--grad-ticket" />
    ),
  },
  {
    id: "svg-notch",
    title: "Ticket — SVG background (notch)",
    note: "Técnica 4: border normal + SVG inline en background recorta visualmente las esquinas tipo notch.",
    pros: "Borde rectangular completo; forma precisa y escalable vía viewBox.",
    cons: "SVG + gradiente compiten en background; color de “corte” atado a --paper.",
    render: () => (
      <CardDemo wrapClass="mock-wrap--box-shadow" cardClass="mock-card--svg-notch" />
    ),
  },
  {
    id: "mask-scoop",
    title: "Scooped — mask radial en esquinas",
    note: "Técnica 5: mask con radial-gradient en las 4 esquinas (ticket perforado); borde vía doble capa dorada.",
    pros: "Esquinas cóncavas modernas; borde sigue curva con shell.",
    cons: "mask-composite inconsistente en Safari viejo; dos capas.",
    render: () => (
      <CardDemo
        wrapClass="mock-wrap--shadow"
        shellClass="mock-shell--scoop"
        cardClass="mock-card--scoop-inner"
        inner
      />
    ),
  },
  {
    id: "label-tag",
    title: "Etiqueta deportiva — chaflán único",
    note: "Técnica 6: solo top-right cortado (estilo tag); doble capa clip-path + drop-shadow.",
    pros: "Asimetría editorial; borde dorado en el chaflán superior derecho.",
    cons: "Forma no simétrica; requiere shell dedicado.",
    render: () => (
      <CardDemo
        wrapClass="mock-wrap--shadow"
        shellClass="mock-shell--label"
        cardClass="mock-card--label-inner"
        inner
      />
    ),
  },
  {
    id: "hexagon-double-layer",
    title: "Hexágono — doble capa + drop-shadow",
    note: "Hexágono vertical con shell dorado, inner inset y sombra en wrapper sin clip.",
    pros: "Bordes visibles en picos superiores/inferiores; sombra sigue hexágono.",
    cons: "Polygon de 8 puntos difícil de mantener; 3 capas.",
    render: () => (
      <CardDemo
        wrapClass="mock-wrap--shadow"
        shellClass="mock-shell--hexagon"
        cardClass="mock-card--hexagon-inner"
        inner
      />
    ),
  },
];

function ShapeColumn({ shape }: { shape: ShapeVariant }) {
  return (
    <section className="shape-lab__col">
      <div className="shape-lab__col-head">
        <h2 className="shape-lab__label">{shape.title}</h2>
        {shape.badge ? <p className="shape-lab__badge">{shape.badge}</p> : null}
      </div>
      {shape.render()}
      <div className="shape-lab__notes">
        <p className="shape-lab__note">{shape.note}</p>
        <p className="shape-lab__pros">
          <span>Pros:</span> {shape.pros}
        </p>
        <p className="shape-lab__cons">
          <span>Contras:</span> {shape.cons}
        </p>
      </div>
    </section>
  );
}

type CardShapesPageProps = {
  searchParams: Promise<{ deporte?: string }>;
};

export default async function CardShapesPage({ searchParams }: CardShapesPageProps) {
  const { deporte } = await searchParams;
  const activeSport = parseProdSport(deporte);

  return (
    <main className="shape-lab">
      <header className="shape-lab__header">
        <Link className="shape-lab__back" href="/perfil">
          ← Volver a perfil
        </Link>
        <h1 className="shape-lab__title">Formas de player card</h1>
        <p className="shape-lab__lead">
          Comparación temporal de siluetas con tokens turf, chalk, ink, flood y card-gold (#e8c35a).
          Arriba: sistema productivo (deporte × tier). Abajo: clip-path puro y técnicas alternativas
          de borde/sombra.
        </p>
      </header>

      <ProductionMatrix activeSport={activeSport} />

      {SECTIONS.map((section) => {
        const shapes = section.id === "legacy" ? LEGACY_SHAPES : FIX_SHAPES;
        return (
          <div key={section.id} className="shape-lab__section">
            <header className="shape-lab__section-head">
              <h2 className="shape-lab__section-title">{section.heading}</h2>
              <p className="shape-lab__section-desc">{section.description}</p>
            </header>
            <div className="shape-lab__grid">
              {shapes.map((shape) => (
                <ShapeColumn key={shape.id} shape={shape} />
              ))}
            </div>
          </div>
        );
      })}
    </main>
  );
}
