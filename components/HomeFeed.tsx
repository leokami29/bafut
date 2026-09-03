import Link from "next/link";
import { MatchRow } from "@/components/MatchRow";
import { getActiveCity, getUpcomingMatches } from "@/lib/data";

export async function HomeFeed() {
  const city = await getActiveCity();
  const matches = city ? await getUpcomingMatches(city.id) : [];
  const preview = matches.slice(0, 3);
  const cityName = city?.name ?? "la ciudad";

  return (
    <section className="sheet home-sheet" aria-labelledby="hoy-title">
      <div className="home-inner">
        <header className="sheet-head sheet-head-row">
          <div>
            <p className="eyebrow">Feed</p>
            <h2 id="hoy-title">Hoy en {cityName}</h2>
            <p className="sheet-lede">Huecos abiertos para entrar hoy.</p>
          </div>
          <Link className="sheet-head-link" href="/partidos">
            Ver todos
          </Link>
        </header>

        {preview.length > 0 ? (
          <>
            <ul className="roster" aria-label={`${preview.length} partidos hoy`}>
              {preview.map((match) => (
                <li key={match.id}>
                  <MatchRow match={match} />
                </li>
              ))}
            </ul>
            <Link className="text-link" href="/partidos">
              Ver todos los partidos de hoy
            </Link>
          </>
        ) : (
          <div className="empty empty-home">
            <p className="empty-title">Nadie ha publicado todavía</p>
            <p>
              Armá la cancha y abrí la lista. El primero publica el hueco; los demás piden cupo y vos
              confirmás.
            </p>
            <Link className="btn-flood" href="/partidos/nuevo">
              Publicar hueco
            </Link>
          </div>
        )}

        <Link className="text-link text-link-muted" href="/canchas">
          Ver canchas de {cityName}
        </Link>
      </div>
    </section>
  );
}
