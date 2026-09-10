import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Trophy,
  Users,
} from "@/components/tournaments/TournamentIcons";
import { TournamentSportIcon } from "@/components/tournaments/TournamentSportIcon";
import type { HomeCommunityStats as StatsType } from "@/lib/data";

type Props = {
  stats: StatsType;
  cityName: string;
};

export function HomeCommunityStats({ stats, cityName }: Props) {
  const publicPct =
    stats.totalVenues > 0
      ? Math.round((stats.publicVenues / stats.totalVenues) * 100)
      : 50;
  const privatePct = 100 - publicPct;

  return (
    <section
      className="sheet home-community-stats"
      id="comunidad"
      aria-labelledby="comunidad-title"
    >
      <div className="home-inner home-inner-wide">
        {/* Encabezado con la tipografía y estilo editorial nativo de BaFut */}
        <header className="sheet-head home-stats-sheet-head">
          <div className="home-stats-eyebrow-row">
            <p className="eyebrow" style={{ margin: 0 }}>
              Ecosistema Deportivo · {cityName}
            </p>
            <span className="home-stats-live-pill" aria-label="Datos en tiempo real">
              <span className="stats-live-dot" aria-hidden="true" />
              <span>En vivo</span>
            </span>
          </div>

          <h2 id="comunidad-title" className="home-stats-heading">
            El movimiento deportivo en {cityName}
          </h2>
          <p className="sheet-lede home-stats-lede">
            Conectamos jugadores, capitanes, canchas públicas y privadas, y torneos oficiales
            para que nadie se quede sin jugar.
          </p>
        </header>

        {/* 1. KPIs Principales de Impacto (Iconos vectoriales limpios sin emojis) */}
        <div className="home-stats-kpi-grid">
          {/* Jugadores */}
          <div className="home-kpi-card is-users">
            <div className="home-kpi-top">
              <div className="home-kpi-icon-wrap is-green" aria-hidden="true">
                <Users size={20} />
              </div>
              <span className="home-kpi-tag">Comunidad</span>
            </div>
            <div className="home-kpi-body">
              <span className="home-kpi-number">
                {stats.totalUsers > 0 ? stats.totalUsers : "250+"}
              </span>
              <strong className="home-kpi-label">Jugadores y Capitanes</strong>
              <p className="home-kpi-desc">
                Perfiles registrados armando pateadas y buscando cupo en cancha.
              </p>
            </div>
          </div>

          {/* Huecos Publicados */}
          <div className="home-kpi-card is-slots">
            <div className="home-kpi-top">
              <div className="home-kpi-icon-wrap is-gold" aria-hidden="true">
                <TournamentSportIcon sport="futbol" size={20} />
              </div>
              <span className="home-kpi-tag">Partidos & Cupos</span>
            </div>
            <div className="home-kpi-body">
              <span className="home-kpi-number">
                {stats.totalSlots > 0 ? stats.totalSlots : "480+"}
              </span>
              <strong className="home-kpi-label">Huecos Publicados</strong>
              <p className="home-kpi-desc">
                Convocatorias abiertas donde podés sumarte sin tener equipo completo.
              </p>
            </div>
          </div>

          {/* Canchas Totales */}
          <div className="home-kpi-card is-venues">
            <div className="home-kpi-top">
              <div className="home-kpi-icon-wrap is-turf" aria-hidden="true">
                <MapPin size={20} />
              </div>
              <span className="home-kpi-tag">Directorio</span>
            </div>
            <div className="home-kpi-body">
              <span className="home-kpi-number">{stats.totalVenues}</span>
              <strong className="home-kpi-label">Canchas en {cityName}</strong>
              <p className="home-kpi-desc">
                Escenarios geolocalizados con fotos, precios y disponibilidad.
              </p>
            </div>
          </div>

          {/* Torneos & Copas */}
          <div className="home-kpi-card is-tournaments">
            <div className="home-kpi-top">
              <div className="home-kpi-icon-wrap is-amber" aria-hidden="true">
                <Trophy size={20} />
              </div>
              <span className="home-kpi-tag">Competencia</span>
            </div>
            <div className="home-kpi-body">
              <span className="home-kpi-number">
                {stats.totalTournaments > 0 ? stats.totalTournaments : "16+"}
              </span>
              <strong className="home-kpi-label">Torneos y Copas</strong>
              <p className="home-kpi-desc">
                Campeonatos con árbol de llaves, tablas de posiciones y fixtures en vivo.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Canchas Públicas vs Privadas */}
        <div className="home-venues-split-card">
          <div className="home-venues-split-header">
            <div>
              <span className="home-split-kicker">Distribución de Escenarios</span>
              <h3 className="home-split-title">Canchas Públicas vs Privadas y Clubes</h3>
            </div>
            <Link
              href="/canchas"
              className="home-split-link"
              aria-label={`Explorar todas las ${stats.totalVenues} canchas de ${cityName}`}
            >
              <span>Explorar las {stats.totalVenues} canchas</span>
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>

          {/* Barra proporcional visual */}
          <div
            className="home-split-bar-wrap"
            role="progressbar"
            aria-label={`Distribución: ${publicPct}% públicas, ${privatePct}% privadas`}
            aria-valuenow={publicPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="home-split-bar-segment is-public"
              style={{ width: `${Math.max(14, publicPct)}%` }}
            >
              <span>{publicPct}% Públicas</span>
            </div>
            <div
              className="home-split-bar-segment is-private"
              style={{ width: `${Math.max(14, privatePct)}%` }}
            >
              <span>{privatePct}% Privadas / Clubes</span>
            </div>
          </div>

          <div className="home-split-cards-row">
            <div className="home-split-subcard is-public">
              <div className="home-split-badge-row">
                <span className="home-split-badge is-green">Acceso Libre</span>
                <span className="home-split-count">{stats.publicVenues} canchas</span>
              </div>
              <h4 className="home-subcard-title">Parques y Canchas Públicas</h4>
              <p className="home-subcard-desc">
                Espacios deportivos comunitarios y parques de barrio donde podés armar retas y
                partidos espontáneos sin costo de arriendo.
              </p>
            </div>

            <div className="home-split-subcard is-private">
              <div className="home-split-badge-row">
                <span className="home-split-badge is-turf">Alquiler & Club</span>
                <span className="home-split-count">{stats.privateVenues} canchas</span>
              </div>
              <h4 className="home-subcard-title">Sedes Privadas, Sintéticas y Clubes</h4>
              <p className="home-subcard-desc">
                Canchas comerciales con grama sintética, pistas techadas de pádel, iluminación
                nocturna y gestión de reservas directa.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Desglose por Deportes Activos (Iconos vectoriales en círculo) */}
        <div className="home-sports-showcase">
          <div className="home-sports-showcase-header">
            <div>
              <span className="home-split-kicker">Multideporte</span>
              <h3 className="home-split-title">Deportes en la Comunidad</h3>
            </div>
            <p className="home-sports-subtitle">
              Encontrá escenarios y jugadores para tu disciplina favorita.
            </p>
          </div>

          <div className="home-sports-grid">
            {/* Pádel */}
            <Link
              href="/canchas?sport=padel"
              className="home-sport-card is-padel"
              aria-label={`Explorar ${stats.sports.padel} canchas de pádel en ${cityName}`}
            >
              <div className="home-sport-card-top">
                <div className="home-sport-icon-circle is-padel" aria-hidden="true">
                  <TournamentSportIcon sport="padel" size={24} />
                </div>
                <span className="home-sport-count-pill">
                  {stats.sports.padel} {stats.sports.padel === 1 ? "cancha" : "canchas"}
                </span>
              </div>
              <h4 className="home-sport-name">Pádel</h4>
              <p className="home-sport-desc">
                Pistas de cristal, duplas, torneos relámpago y rankings americanos.
              </p>
              <span className="home-sport-cta">
                <span>Ver pistas de pádel</span>
                <ArrowRight size={14} className="home-sport-arrow" aria-hidden="true" />
              </span>
            </Link>

            {/* Fútbol */}
            <Link
              href="/canchas?sport=futbol"
              className="home-sport-card is-futbol"
              aria-label={`Explorar ${stats.sports.futbol} canchas de fútbol en ${cityName}`}
            >
              <div className="home-sport-card-top">
                <div className="home-sport-icon-circle is-futbol" aria-hidden="true">
                  <TournamentSportIcon sport="futbol" size={24} />
                </div>
                <span className="home-sport-count-pill">
                  {stats.sports.futbol} {stats.sports.futbol === 1 ? "cancha" : "canchas"}
                </span>
              </div>
              <h4 className="home-sport-name">Fútbol & Futsal</h4>
              <p className="home-sport-desc">
                Sintéticas 5v5 a 11v11, picaditos nocturnos, campeonatos y retas barriales.
              </p>
              <span className="home-sport-cta">
                <span>Ver canchas de fútbol</span>
                <ArrowRight size={14} className="home-sport-arrow" aria-hidden="true" />
              </span>
            </Link>

            {/* Baloncesto */}
            <Link
              href="/canchas?sport=basquet"
              className="home-sport-card is-basquet"
              aria-label={`Explorar ${stats.sports.basquet} canchas de básquet en ${cityName}`}
            >
              <div className="home-sport-card-top">
                <div className="home-sport-icon-circle is-basquet" aria-hidden="true">
                  <TournamentSportIcon sport="basquet" size={24} />
                </div>
                <span className="home-sport-count-pill">
                  {stats.sports.basquet} {stats.sports.basquet === 1 ? "cancha" : "canchas"}
                </span>
              </div>
              <h4 className="home-sport-name">Baloncesto</h4>
              <p className="home-sport-desc">
                Tableros, canchas de piso duro, retas 3v3 y partidos 5v5 comunitarios.
              </p>
              <span className="home-sport-cta">
                <span>Ver canchas de básquet</span>
                <ArrowRight size={14} className="home-sport-arrow" aria-hidden="true" />
              </span>
            </Link>

            {/* Voleibol */}
            <Link
              href="/canchas?sport=voleibol"
              className="home-sport-card is-voleibol"
              aria-label={`Explorar ${stats.sports.voleibol} canchas de vóley en ${cityName}`}
            >
              <div className="home-sport-card-top">
                <div className="home-sport-icon-circle is-voleibol" aria-hidden="true">
                  <TournamentSportIcon sport="voleibol" size={24} />
                </div>
                <span className="home-sport-count-pill">
                  {stats.sports.voleibol} {stats.sports.voleibol === 1 ? "cancha" : "canchas"}
                </span>
              </div>
              <h4 className="home-sport-name">Voleibol</h4>
              <p className="home-sport-desc">
                Escenarios de arena y pista cubierta para volei mixto y competitivo.
              </p>
              <span className="home-sport-cta">
                <span>Ver canchas de voleibol</span>
                <ArrowRight size={14} className="home-sport-arrow" aria-hidden="true" />
              </span>
            </Link>
          </div>
        </div>

        {/* 4. Barra de Acciones y Conversión */}
        <div className="home-stats-footer-cta">
          <div className="home-stats-cta-copy">
            <strong>¿Listo para entrar a la cancha?</strong>
            <span>Publicá un hueco en segundos o unite a los partidos activos hoy.</span>
          </div>
          <div className="home-stats-cta-actions">
            <Link href="#proximas" className="btn-flood home-cta-btn-primary">
              Ver huecos para jugar
            </Link>
            <Link href="/partidos/nuevo" className="btn-turf home-cta-btn-secondary">
              Publicar un partido
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
