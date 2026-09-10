"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  LayoutGrid,
  LayoutList,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "@/components/tournaments/TournamentIcons";
import { TournamentSportIcon } from "@/components/tournaments/TournamentSportIcon";
import { TournamentStatusChip } from "@/components/tournaments/TournamentStatusChip";
import type {
  TournamentFormat,
  TournamentSport,
  TournamentStatus,
} from "@/lib/tournaments/authz";
import {
  tournamentFormatLabel,
  tournamentSportLabel,
} from "@/lib/tournaments/labels";
import type { TournamentListItem } from "@/lib/tournaments/load";

type Props = {
  tournaments: TournamentListItem[];
  venue: {
    id: string;
    name: string;
    slug: string;
    neighborhood: string | null;
    address: string | null;
    phone: string | null;
    sports?: string[] | null;
  };
  cityName: string;
};

const SPORT_ACCENT: Record<string, { badge: string; color: string; term: string }> = {
  padel: { badge: "Pádel", color: "#10b981", term: "parejas" },
  futbol: { badge: "Fútbol", color: "#0c6b4c", term: "equipos" },
  futbol_sala: { badge: "Futsal", color: "#0c6b4c", term: "equipos" },
  basquet: { badge: "Básquet", color: "#f59e0b", term: "equipos" },
  voleibol: { badge: "Voleibol", color: "#0ea5e9", term: "equipos" },
};

function getCtaLabel(format: string, status: string): string {
  if (status === "registration") return "Ver cupos e inscripción →";
  if (format === "round_robin") return "Ver tabla y fixture →";
  if (format === "groups_knockout") return "Ver grupos y llaves →";
  return "Ver árbol de llaves →";
}

export function VenueTournamentsHub({ tournaments, venue, cityName }: Props) {
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "teams" | "name">("recent");

  // Sport statistics
  const sportsAvailable = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tournaments) {
      counts[t.sport] = (counts[t.sport] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [tournaments]);

  // Overall statistics
  const stats = useMemo(() => {
    const total = tournaments.length;
    const active = tournaments.filter((t) => t.status === "active").length;
    const registration = tournaments.filter((t) => t.status === "registration").length;
    const completed = tournaments.filter((t) => t.status === "completed").length;
    return { total, active, registration, completed };
  }, [tournaments]);

  // Spotlight tournament: prioritize active first, then registration, then most recent
  const spotlight = useMemo(() => {
    if (tournaments.length === 0) return null;
    return (
      tournaments.find((t) => t.status === "active") ||
      tournaments.find((t) => t.status === "registration") ||
      tournaments[0]
    );
  }, [tournaments]);

  // Filtered & sorted tournaments
  const filteredTournaments = useMemo(() => {
    return tournaments
      .filter((t) => {
        if (selectedSport !== "all" && t.sport !== selectedSport) return false;
        if (selectedStatus !== "all" && t.status !== selectedStatus) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = t.name.toLowerCase().includes(q);
          const matchSport = (tournamentSportLabel[t.sport as TournamentSport] || t.sport)
            .toLowerCase()
            .includes(q);
          const matchFormat = (tournamentFormatLabel[t.format as TournamentFormat] || t.format)
            .toLowerCase()
            .includes(q);
          if (!matchName && !matchSport && !matchFormat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "teams") {
          return b.team_count / b.max_teams - a.team_count / a.max_teams;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [tournaments, selectedSport, selectedStatus, searchQuery, sortBy]);

  const hasActiveFilters =
    selectedSport !== "all" || selectedStatus !== "all" || searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedSport("all");
    setSelectedStatus("all");
    setSearchQuery("");
  };

  const whatsappHref = venue.phone
    ? `https://wa.me/${venue.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola, me comunico desde BaFut y me gustaría consultar información sobre los torneos en ${venue.name}.`
      )}`
    : null;

  return (
    <div className="tournament-hub-container">
      {/* 1. Header & Navigation Context */}
      <nav className="tournament-hub-nav" aria-label="Navegación de migas de pan">
        <Link href={`/canchas/${venue.slug}`} className="tournament-hub-back-btn">
          <ArrowLeft size={16} />
          <span>Volver a {venue.name}</span>
        </Link>
        <span className="tournament-hub-nav-sep">/</span>
        <span className="tournament-hub-nav-current">Torneos y Campeonatos</span>
      </nav>

      <header className="tournament-hub-hero">
        <div className="tournament-hub-hero-main">
          <div className="tournament-hub-eyebrow-row">
            <span className="tournament-hub-city-tag">
              <MapPin size={13} />
              {cityName} {venue.neighborhood ? `· ${venue.neighborhood}` : ""}
            </span>
            <span className="tournament-hub-live-badge">
              <span className="live-dot" /> Módulo Oficial de Torneos
            </span>
          </div>

          <h1 className="tournament-hub-title">{venue.name}</h1>
          <p className="tournament-hub-subtitle">
            Consulta fixtures, tablas de clasificación en tiempo real, llaves eliminatorias y cupos
            de inscripción para los torneos organizados en esta sede deportiva.
          </p>

          <div className="tournament-hub-actions-bar">
            <Link href={`/canchas/${venue.slug}`} className="tournament-hub-btn-outline">
              Ver perfil y reservas de la cancha
            </Link>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="tournament-hub-btn-whatsapp"
              >
                <Phone size={15} />
                <span>Contactar a la cancha por WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* Live KPI metrics dashboard */}
        <div className="tournament-hub-kpis">
          <div className="tournament-hub-kpi-card">
            <span className="tournament-hub-kpi-num">{stats.total}</span>
            <span className="tournament-hub-kpi-label">
              <Trophy size={14} className="kpi-icon" /> Torneos Totales
            </span>
          </div>
          <div className="tournament-hub-kpi-card is-active">
            <span className="tournament-hub-kpi-num">{stats.active}</span>
            <span className="tournament-hub-kpi-label">
              <span className="kpi-dot is-green" /> En Juego
            </span>
          </div>
          <div className="tournament-hub-kpi-card is-registration">
            <span className="tournament-hub-kpi-num">{stats.registration}</span>
            <span className="tournament-hub-kpi-label">
              <span className="kpi-dot is-amber" /> Inscripciones
            </span>
          </div>
          <div className="tournament-hub-kpi-card is-completed">
            <span className="tournament-hub-kpi-num">{stats.completed}</span>
            <span className="tournament-hub-kpi-label">
              <CheckCircle2 size={14} className="kpi-icon" /> Finalizados
            </span>
          </div>
        </div>
      </header>

      {/* 2. Spotlight Hero Banner (if at least 1 tournament exists) */}
      {spotlight && !hasActiveFilters && (
        <section className="tournament-spotlight-card" aria-label="Torneo destacado">
          <div className="spotlight-visual-accent" />
          <div className="spotlight-content">
            <div className="spotlight-top-strip">
              <span className="spotlight-kicker">
                <Sparkles size={14} /> Torneo Destacado
              </span>
              <div className="spotlight-status-wrap">
                <TournamentStatusChip status={spotlight.status} />
              </div>
            </div>

            <div className="spotlight-main-grid">
              <div className="spotlight-info">
                <div className="spotlight-sport-pill">
                  <TournamentSportIcon sport={spotlight.sport} size={16} />
                  <span>{tournamentSportLabel[spotlight.sport as TournamentSport] ?? spotlight.sport}</span>
                  <span className="spotlight-dot-sep">•</span>
                  <span>{tournamentFormatLabel[spotlight.format as TournamentFormat] ?? spotlight.format}</span>
                </div>
                <h2 className="spotlight-title">
                  <Link href={`/canchas/${venue.slug}/torneos/${spotlight.id}`}>
                    {spotlight.name}
                  </Link>
                </h2>
                <div className="spotlight-meta-row">
                  <span className="spotlight-capacity">
                    <Users size={15} />
                    <strong>{spotlight.team_count}</strong> de <strong>{spotlight.max_teams}</strong>{" "}
                    {spotlight.sport === "padel" ? "parejas" : "equipos"} inscritos
                  </span>
                  {spotlight.starts_at && (
                    <span className="spotlight-date">
                      <Calendar size={15} />
                      Inicia: {new Date(spotlight.starts_at).toLocaleDateString("es-CO", { dateStyle: "medium" })}
                    </span>
                  )}
                </div>
              </div>

              <div className="spotlight-cta-side">
                <div className="spotlight-progress-box">
                  <div className="spotlight-progress-header">
                    <span>Cupos ocupados</span>
                    <span className="spotlight-progress-pct">
                      {Math.round((spotlight.team_count / spotlight.max_teams) * 100)}%
                    </span>
                  </div>
                  <div className="spotlight-progress-bar-track">
                    <div
                      className="spotlight-progress-bar-fill"
                      style={{
                        width: `${Math.min(100, Math.max(6, (spotlight.team_count / spotlight.max_teams) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <Link
                  href={`/canchas/${venue.slug}/torneos/${spotlight.id}`}
                  className="spotlight-cta-button"
                >
                  <span>{getCtaLabel(spotlight.format, spotlight.status)}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Filter Bar and Controls */}
      <section className="tournament-hub-filters-section" aria-label="Filtros y búsqueda">
        {/* Sport Tabs */}
        <div className="tournament-sport-tabs-bar" role="tablist" aria-label="Filtrar por deporte">
          <button
            type="button"
            role="tab"
            aria-selected={selectedSport === "all"}
            className={`tournament-sport-tab ${selectedSport === "all" ? "is-active" : ""}`}
            onClick={() => setSelectedSport("all")}
          >
            <Trophy size={16} />
            <span>Todos</span>
            <span className="tab-count-pill">{tournaments.length}</span>
          </button>

          {sportsAvailable.map(([sp, count]) => {
            const conf = SPORT_ACCENT[sp] ?? { badge: sp, color: "#0c6b4c", term: "equipos" };
            return (
              <button
                key={sp}
                type="button"
                role="tab"
                aria-selected={selectedSport === sp}
                className={`tournament-sport-tab ${selectedSport === sp ? "is-active" : ""}`}
                onClick={() => setSelectedSport(sp)}
              >
                <TournamentSportIcon sport={sp} size={16} />
                <span>{tournamentSportLabel[sp as TournamentSport] ?? conf.badge}</span>
                <span className="tab-count-pill">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Secondary Filter & Search Row */}
        <div className="tournament-filters-subrow">
          {/* Status chips */}
          <div className="tournament-status-pills">
            <button
              type="button"
              className={`status-pill ${selectedStatus === "all" ? "is-selected" : ""}`}
              onClick={() => setSelectedStatus("all")}
            >
              Todos los estados
            </button>
            <button
              type="button"
              className={`status-pill ${selectedStatus === "active" ? "is-selected" : ""}`}
              onClick={() => setSelectedStatus("active")}
            >
              <span className="kpi-dot is-green" /> En juego ({stats.active})
            </button>
            <button
              type="button"
              className={`status-pill ${selectedStatus === "registration" ? "is-selected" : ""}`}
              onClick={() => setSelectedStatus("registration")}
            >
              <span className="kpi-dot is-amber" /> Inscripciones ({stats.registration})
            </button>
            <button
              type="button"
              className={`status-pill ${selectedStatus === "completed" ? "is-selected" : ""}`}
              onClick={() => setSelectedStatus("completed")}
            >
              Finalizados ({stats.completed})
            </button>
          </div>

          {/* Search box & View Switcher */}
          <div className="tournament-search-view-group">
            <div className="tournament-search-box">
              <Search size={15} className="tournament-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar torneo o formato..."
                className="tournament-search-input"
                aria-label="Buscar torneos"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="tournament-search-clear"
                  aria-label="Borrar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "recent" | "teams" | "name")}
              className="tournament-sort-select"
              aria-label="Ordenar torneos"
            >
              <option value="recent">Más recientes</option>
              <option value="teams">Mayor ocupación</option>
              <option value="name">Nombre A-Z</option>
            </select>

            {/* View Mode Toggle */}
            <div className="tournament-view-mode-toggle" role="group" aria-label="Modo de vista">
              <button
                type="button"
                className={`view-btn ${viewMode === "grid" ? "is-active" : ""}`}
                onClick={() => setViewMode("grid")}
                title="Vista de cuadrícula"
                aria-label="Vista cuadrícula"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === "list" ? "is-active" : ""}`}
                onClick={() => setViewMode("list")}
                title="Vista de lista"
                aria-label="Vista lista"
              >
                <LayoutList size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Active Filter Badges bar */}
      {hasActiveFilters && (
        <div className="tournament-active-filters-bar">
          <span className="active-filters-label">
            Mostrando <strong>{filteredTournaments.length}</strong> de <strong>{tournaments.length}</strong> torneos
          </span>
          <button type="button" onClick={resetFilters} className="reset-filters-btn">
            Restablecer filtros ✕
          </button>
        </div>
      )}

      {/* 5. Tournament List / Grid View */}
      {filteredTournaments.length === 0 ? (
        <div className="tournament-empty-hero">
          <div className="tournament-empty-icon-wrap">
            <Trophy size={42} strokeWidth={1.5} />
          </div>
          <h3 className="tournament-empty-heading">No se encontraron torneos</h3>
          <p className="tournament-empty-desc">
            {hasActiveFilters
              ? "No hay campeonatos que coincidan con los filtros o término de búsqueda aplicado."
              : `Esta cancha aún no tiene torneos oficiales publicados.`}
          </p>
          {hasActiveFilters ? (
            <button type="button" onClick={resetFilters} className="tournament-empty-btn">
              Ver todos los torneos ({tournaments.length})
            </button>
          ) : (
            <Link href={`/canchas/${venue.slug}`} className="tournament-empty-btn">
              Volver al perfil de {venue.name}
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="tournament-hub-cards-grid">
          {filteredTournaments.map((t) => {
            const sport = t.sport as TournamentSport;
            const format = t.format as TournamentFormat;
            const status = t.status as TournamentStatus;
            const sportConf = SPORT_ACCENT[sport] ?? {
              badge: sport,
              color: "#0c6b4c",
              term: "equipos",
            };
            const teamUnit = sport === "padel" ? "parejas" : "equipos";
            const fillPct = Math.round((t.team_count / t.max_teams) * 100);
            const isFull = t.team_count >= t.max_teams;

            return (
              <article key={t.id} className={`tournament-hub-card is-sport-${sport}`}>
                <div className="tournament-hub-card-header">
                  <div className="tournament-hub-sport-badge">
                    <TournamentSportIcon sport={sport} size={15} />
                    <span>{tournamentSportLabel[sport] ?? sport}</span>
                  </div>
                  <TournamentStatusChip status={status} />
                </div>

                <div className="tournament-hub-card-body">
                  <h3 className="tournament-hub-card-title">
                    <Link href={`/canchas/${venue.slug}/torneos/${t.id}`}>{t.name}</Link>
                  </h3>

                  <div className="tournament-hub-card-tags">
                    <span className="tournament-tag-format">
                      {tournamentFormatLabel[format] ?? t.format}
                    </span>
                    {t.starts_at && (
                      <span className="tournament-tag-date">
                        <Calendar size={12} />
                        {new Date(t.starts_at).toLocaleDateString("es-CO", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Capacity & Teams Progress bar */}
                  <div className="tournament-hub-capacity-block">
                    <div className="tournament-capacity-labels">
                      <span className="capacity-count">
                        <Users size={13} />
                        <strong>{t.team_count}</strong>/{t.max_teams} {teamUnit}
                      </span>
                      <span className={`capacity-pct ${isFull ? "is-full" : ""}`}>
                        {isFull ? "Lleno" : `${fillPct}%`}
                      </span>
                    </div>
                    <div className="tournament-capacity-track">
                      <div
                        className={`tournament-capacity-fill ${isFull ? "is-full" : ""}`}
                        style={{
                          width: `${Math.min(100, Math.max(4, fillPct))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="tournament-hub-card-footer">
                  <Link
                    href={`/canchas/${venue.slug}/torneos/${t.id}`}
                    className="tournament-hub-card-cta"
                  >
                    <span>{getCtaLabel(format, status)}</span>
                    <ArrowRight size={15} className="cta-arrow-icon" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List / Table View */
        <div className="tournament-hub-table-frame">
          <table className="tournament-hub-table">
            <thead>
              <tr>
                <th>Deporte</th>
                <th>Torneo</th>
                <th>Formato</th>
                <th>Estado</th>
                <th>Inscripciones</th>
                <th className="th-action">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredTournaments.map((t) => {
                const sport = t.sport as TournamentSport;
                const format = t.format as TournamentFormat;
                const status = t.status as TournamentStatus;
                const teamUnit = sport === "padel" ? "parejas" : "equipos";
                return (
                  <tr key={t.id}>
                    <td>
                      <div className="table-sport-cell">
                        <TournamentSportIcon sport={sport} size={16} />
                        <span>{tournamentSportLabel[sport] ?? sport}</span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`/canchas/${venue.slug}/torneos/${t.id}`}
                        className="table-tournament-name-link"
                      >
                        {t.name}
                      </Link>
                    </td>
                    <td>
                      <span className="table-format-tag">
                        {tournamentFormatLabel[format] ?? t.format}
                      </span>
                    </td>
                    <td>
                      <TournamentStatusChip status={status} />
                    </td>
                    <td>
                      <span className="table-teams-count">
                        {t.team_count}/{t.max_teams} {teamUnit}
                      </span>
                    </td>
                    <td className="td-action">
                      <Link
                        href={`/canchas/${venue.slug}/torneos/${t.id}`}
                        className="table-view-btn"
                      >
                        Ver torneo →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Host / Organizer Callout Card */}
      <footer className="tournament-organizer-callout">
        <div className="organizer-callout-icon">
          <Trophy size={28} />
        </div>
        <div className="organizer-callout-content">
          <h4 className="organizer-callout-title">
            ¿Organizas un campeonato o quieres inscribir a tu equipo en {venue.name}?
          </h4>
          <p className="organizer-callout-desc">
            Ponte en contacto directo con la administración de la cancha para conocer bases del torneo,
            fechas de inscripción, premios y reglamento oficial.
          </p>
        </div>
        <div className="organizer-callout-actions">
          {whatsappHref ? (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="organizer-whatsapp-btn"
            >
              <Phone size={16} />
              <span>Contactar por WhatsApp</span>
            </a>
          ) : (
            <Link href={`/canchas/${venue.slug}`} className="organizer-venue-btn">
              Ver datos de la cancha
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}
