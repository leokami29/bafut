import type { CSSProperties } from "react";
import Link from "next/link";
import { MatchRow } from "@/components/MatchRow";
import { SportMark } from "@/components/SportMark";
import { getActiveCity, getUpcomingMatches } from "@/lib/data";
import { isSameCityDay } from "@/lib/datetime";
import type { Sport } from "@/lib/constants";
import { openSlotCount, type MatchDetail } from "@/lib/types";
import { aggregateVenueDemand, venuesWithDemandCount } from "@/lib/venue-demand";

const HOME_MATCH_LIMIT = 6;

function nearestOpenMatches(matches: MatchDetail[], limit: number) {
  const open = matches.filter((match) => openSlotCount(match) > 0);
  return (open.length > 0 ? open : matches).slice(0, limit);
}

function sportsInList(matches: MatchDetail[]): Sport[] {
  const seen = new Set<Sport>();
  const ordered: Sport[] = [];
  for (const match of matches) {
    const sport = match.sport as Sport;
    if (!seen.has(sport)) {
      seen.add(sport);
      ordered.push(sport);
    }
  }
  return ordered;
}

export async function HomeFeed() {
  const city = await getActiveCity();
  const matches = city ? await getUpcomingMatches(city.id) : [];
  const timezone = city?.timezone ?? "America/Bogota";
  const nearest = nearestOpenMatches(matches, HOME_MATCH_LIMIT);
  const todayCount = nearest.filter((match) => isSameCityDay(match.starts_at, timezone)).length;
  const cityName = city?.name ?? "la ciudad";
  const canchasConHuecos = venuesWithDemandCount(aggregateVenueDemand(matches, timezone));
  const sports = sportsInList(nearest);
  const hasToday = todayCount > 0;

  return (
    <section className="sheet home-sheet" id="proximas" aria-labelledby="hoy-title">
      <div className="home-inner home-inner-wide">
        <header className="sheet-head sheet-head-row">
          <div>
            <p className="eyebrow">Radar</p>
            <h2 id="hoy-title">Próximas pateadas</h2>
            <p className="sheet-lede">
              {hasToday
                ? `${todayCount === 1 ? "1 hueco hoy" : `${todayCount} huecos hoy`} · lo más cerca en el tiempo.`
                : `Las más cercanas en ${cityName}. Entrá o publicá la tuya.`}
            </p>
          </div>
          <Link className="sheet-head-link" href="/partidos">
            Ver todas
          </Link>
        </header>

        {sports.length > 1 ? (
          <ul className="home-sport-strip" aria-label="Deportes en la lista">
            {sports.map((sport) => (
              <li key={sport}>
                <SportMark sport={sport} compact />
              </li>
            ))}
          </ul>
        ) : null}

        {nearest.length > 0 ? (
          <>
            <ul className="roster home-roster" aria-label={`${nearest.length} próximas pateadas`}>
              {nearest.map((match, index) => (
                <li
                  key={match.id}
                  className="home-roster-item"
                  style={{ "--home-stagger": index } as CSSProperties}
                >
                  <MatchRow match={match} />
                </li>
              ))}
            </ul>
            <div className="home-feed-actions">
              <Link className="text-link" href="/partidos">
                Ver todos los huecos
              </Link>
              <Link className="text-link text-link-muted" href="/canchas">
                {canchasConHuecos > 0
                  ? `${canchasConHuecos} canchas con huecos`
                  : `Ver canchas de ${cityName}`}
              </Link>
            </div>
          </>
        ) : (
          <div className="empty empty-home" role="status">
            <p className="empty-title">Todavía no hay huecos cerca</p>
            <p>
              Sé el primero en {cityName}: publicá cancha, hora y posición. Los demás piden cupo y vos
              confirmás la pateada.
            </p>
            <div className="empty-home-actions">
              <Link className="btn-flood" href="/partidos/nuevo">
                Publicar hueco
              </Link>
              <Link className="btn-ghost empty-home-ghost" href="/canchas">
                Explorar canchas
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
