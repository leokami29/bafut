import Link from "next/link";
import { MatchRow } from "@/components/MatchRow";
import { getActiveCity, getUpcomingMatches } from "@/lib/data";
import { isSameCityDay } from "@/lib/datetime";
import { aggregateVenueDemand, venuesWithDemandCount } from "@/lib/venue-demand";

export async function HomeFeed() {
  const city = await getActiveCity();
  const matches = city ? await getUpcomingMatches(city.id) : [];
  const timezone = city?.timezone ?? "America/Bogota";
  const today = matches.filter((match) => isSameCityDay(match.starts_at, timezone)).slice(0, 3);
  const cityName = city?.name ?? "la ciudad";
  const canchasConHuecos = venuesWithDemandCount(aggregateVenueDemand(matches, timezone));

  return (
    <section className="sheet home-sheet" aria-labelledby="hoy-title">
      <div className="home-inner">
        <header className="sheet-head sheet-head-row">
          <div>
            <p className="eyebrow">Radar</p>
            <h2 id="hoy-title">Hoy en {cityName}</h2>
            <p className="sheet-lede">Huecos abiertos para entrar hoy.</p>
          </div>
          <Link className="sheet-head-link" href="/partidos?filtro=hoy">
            Ver todos
          </Link>
        </header>

        {today.length > 0 ? (
          <>
            <ul className="roster" aria-label={`${today.length} partidos hoy`}>
              {today.map((match) => (
                <li key={match.id}>
                  <MatchRow match={match} />
                </li>
              ))}
            </ul>
            <Link className="text-link" href="/partidos?filtro=hoy">
              Ver todos los partidos de hoy
            </Link>
          </>
        ) : (
          <div className="empty empty-home">
            <p className="empty-title">No hay huecos hoy</p>
            <p>
              Publicá el primero y abrí la lista. Los demás piden cupo y vos confirmás la pateada.
            </p>
            <Link className="btn-flood" href="/partidos/nuevo">
              Publicar hueco
            </Link>
          </div>
        )}

        <Link className="text-link text-link-muted" href="/canchas">
          {canchasConHuecos > 0
            ? `${canchasConHuecos} canchas con huecos`
            : `Ver canchas de ${cityName}`}
        </Link>
      </div>
    </section>
  );
}
