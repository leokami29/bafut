#!/usr/bin/env python3
"""Process multi-sport Google Maps scrape for BaFut Barranquilla."""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

RESULTS = Path(__file__).parent / "gmaps-bafut-sports-results.json"
OUT_NEW = Path(__file__).parent / "venues-sports-new.json"
OUT_ENRICH = Path(__file__).parent / "venues-sports-enrich.json"
MIGRATION = (
    Path(__file__).parent.parent
    / "supabase"
    / "migrations"
    / "20260902200000_barranquilla_sports_scrape.sql"
)

EXISTING_SLUGS = [
    "la-jaula-ensenanza",
    "la-jaula-americano",
    "brazuca-villa-campestre",
    "soccer-papiros",
    "zoccer-plaza",
    "canchas-biffi",
    "soccer-44",
    "combarranquilla-boston",
    "combarranquilla-solinilla",
    "los-tubos",
    "san-isidro",
    "pibe-valderrama",
    "malecon-del-rio",
    "complejo-tivoli",
    "sagrado-corazon",
    "la-electrificadora",
    "los-andes",
    "buena-esperanza",
    "mundialito",
    "lluvia-de-oro",
    "las-mercedes",
    "cristo-rey",
    "la-inmaculada",
    "altos-de-silencio",
    "eugenio-macias",
    "simon-bolivar",
    "parque-olivos",
    "los-suenos",
    "cancha-sintetica-la-patiada",
    "cancha-el-moderno",
    "la-8-fc-cancha-sintetica",
    "cancha-san-martin-7-de-abril",
    "la-21-futbol-club",
    "cancha-de-futbol-barrio-la-sierra",
    "cancha-de-futbol-la-victoria",
    "cancha-de-futbol-sintetica-del-bosque",
    "cancha-de-futbol-5-hermanos-almendros",
    "cancha-de-futbol-nueva-granada",
    "cancha-sintetica-rojiblanca",
    "cancha-de-futbol-los-mosquitos",
    "cancha-de-futbol-la-magdalena",
    "canchas-el-tiburon",
    "cancha-de-microfutbol-los-andes",
    "cancha-la-tiburona-sas",
    "cancha-sintetica-de-futbol-bosques-del-norte",
    "cancha-ringo-makro-club-deportivo",
    "fsb-la-cancha",
    "cancha-7-bocas",
    "soccer-house",
    "cancha-de-futbol-del-carmen",
    "cancha-de-futbol-el-pana",
    "cancha-del-brasil",
    "canchas-de-futbol-napoleon-salcedo-cotes",
    "club-de-leones",
]

EXISTING = [
    ("la-jaula-ensenanza", "La Jaula — La Enseñanza"),
    ("la-jaula-americano", "La Jaula — Americano"),
    ("brazuca-villa-campestre", "Brazuca Soccer"),
    ("soccer-papiros", "Soccer Papiros"),
    ("zoccer-plaza", "Zoccer Plaza"),
    ("canchas-biffi", "Canchas Biffi"),
    ("soccer-44", "Soccer 44"),
    ("combarranquilla-boston", "Combarranquilla Boston"),
    ("combarranquilla-solinilla", "Combarranquilla Solinilla"),
    ("los-tubos", "Cancha Los Tubos"),
    ("san-isidro", "Cancha San Isidro"),
    ("pibe-valderrama", "Unidad Deportiva Pibe Valderrama"),
    ("malecon-del-rio", "Cancha sintética Malecón del Río"),
    ("complejo-tivoli", "Complejo Tívoli"),
    ("sagrado-corazon", "Parque Sagrado Corazón"),
    ("la-electrificadora", "Canchas La Electrificadora"),
    ("los-andes", "Cancha Los Andes"),
    ("buena-esperanza", "Cancha Buena Esperanza"),
    ("mundialito", "Cancha Mundialito"),
    ("lluvia-de-oro", "Parque Lluvia de Oro"),
    ("las-mercedes", "Cancha Las Mercedes"),
    ("cristo-rey", "Cancha Cristo Rey"),
    ("la-inmaculada", "Parque La Inmaculada"),
    ("altos-de-silencio", "Cancha Altos de Silencio"),
    ("eugenio-macias", "Cancha Eugenio Macías"),
    ("simon-bolivar", "Cancha Simón Bolívar"),
    ("parque-olivos", "Parque Olivos"),
    ("los-suenos", "Cancha Los Sueños"),
    ("cancha-sintetica-la-patiada", "Cancha Sintética La Patiada"),
    ("cancha-el-moderno", "Cancha el Moderno"),
    ("la-8-fc-cancha-sintetica", "La 8 FC Cancha Sintética"),
    ("cancha-san-martin-7-de-abril", "Cancha San Martin 7 De Abril"),
    ("la-21-futbol-club", "La 21 Fútbol Club"),
    ("cancha-de-futbol-barrio-la-sierra", "Cancha de Fútbol Barrio La Sierra"),
    ("cancha-de-futbol-la-victoria", "Cancha de Fútbol La Victoria"),
    ("cancha-de-futbol-sintetica-del-bosque", "Cancha de fútbol sintética del bosque"),
    ("cancha-de-futbol-5-hermanos-almendros", "Cancha de Fútbol 5 Hermanos Almendros"),
    ("cancha-de-futbol-nueva-granada", "Cancha de Fútbol Nueva Granada"),
    ("cancha-sintetica-rojiblanca", "Cancha Sintética Rojiblanca"),
    ("cancha-de-futbol-los-mosquitos", "Cancha de Fútbol Los Mosquitos"),
    ("cancha-de-futbol-la-magdalena", "Cancha de Fútbol La Magdalena"),
    ("canchas-el-tiburon", "Canchas El Tiburón"),
    ("cancha-de-microfutbol-los-andes", "Cancha de Microfútbol — Los Andes"),
    ("cancha-la-tiburona-sas", "Cancha La Tiburona SAS"),
    ("cancha-sintetica-de-futbol-bosques-del-norte", "Cancha Sintetica de Futbol - Bosques del Norte"),
    ("cancha-ringo-makro-club-deportivo", "Cancha Ringo Makro Club Deportivo"),
    ("fsb-la-cancha", "FSB La Cancha"),
    ("cancha-7-bocas", "Cancha 7 Bocas"),
    ("soccer-house", "Soccer House"),
    ("cancha-de-futbol-del-carmen", "Cancha De Fútbol Del Carmen"),
    ("cancha-de-futbol-el-pana", "Cancha de Fútbol El Pana"),
    ("cancha-del-brasil", "Cancha del brasil"),
    ("canchas-de-futbol-napoleon-salcedo-cotes", "Canchas de Fútbol Napoleón Salcedo Cotes"),
    ("club-de-leones", "Cancha Club de Leones"),
]

SPORT_ORDER = ["futbol", "futbol_sala", "basquet", "voleibol", "padel"]

EXCLUDE = re.compile(
    r"restaurante|hotel|bar\s|discoteca|supermercado|droguer|farmacia|"
    r"universidad|colegio\s(?!.*cancha)|iglesia|cementerio|funeraria|"
    r"conjunto\s+residencial|apartamento|residencial\s+los\s+robles\s+park|"
    r"arena\s+deportiva\s+elias\s+chegwin|coliseo",
    re.I,
)

GENERIC_TITLES = {
    "soccer field",
    "futsal court",
    "volleyball court",
    "basketball court",
    "cancha de baloncesto",
    "cancha de voleibol",
}

SKIP_NEW_IF_ONLY_FUTBOL = False

NON_BARRANQUILLA = re.compile(r"puerto\s+colombia|soledad,\s*atlantico(?!\s*,\s*barranquilla)", re.I)


def normalize(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def slugify(name: str) -> str:
    s = normalize(name)
    s = re.sub(r"\s+", "-", s)
    return re.sub(r"-+", "-", s)[:80].strip("-")


def token_set(text: str) -> set[str]:
    stop = {
        "cancha", "de", "la", "el", "los", "las", "del", "y", "en",
        "barranquilla", "club", "campo", "sintetica", "sintetico",
    }
    return {t for t in normalize(text).split() if t not in stop and len(t) > 2}


def similarity(a: str, b: str) -> float:
    ta, tb = token_set(a), token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def infer_sports(title: str, category: str, categories: list[str] | None) -> list[str]:
    text = normalize(f"{title} {category} {' '.join(categories or [])}")
    sports: list[str] = []

    if re.search(r"padel|pádel", text):
        sports.append("padel")
    if re.search(r"voleibol|volleyball|beach volleyball", text):
        sports.append("voleibol")
    if re.search(r"basquet|baloncesto|basketball|basket", text):
        sports.append("basquet")
    if re.search(
        r"futbol\s*sala|futsal|microfutbol|micro\s*futbol|futbol\s*5|futbol5",
        text,
    ):
        sports.extend(["futbol", "futbol_sala"])
    elif re.search(
        r"futbol|soccer|futsal court|soccer field|cancha sintetica|cancha de futbol",
        text,
    ):
        sports.append("futbol")

    if not sports and re.search(r"polideportivo|sports complex|complejo deportivo", text):
        sports.extend(["futbol", "basquet", "voleibol"])

    # dedupe preserving order
    seen: set[str] = set()
    ordered: list[str] = []
    for s in sports:
        if s not in seen:
            seen.add(s)
            ordered.append(s)
    return ordered


def is_relevant(row: dict) -> bool:
    title = row.get("title", "")
    category = row.get("category", "") or " ".join(row.get("categories") or [])
    text = f"{title} {category}"
    sports = infer_sports(title, category, row.get("categories"))
    if not sports:
        return False
    if EXCLUDE.search(text):
        return False
    addr = row.get("address", "") or (row.get("complete_address") or {}).get("street", "")
    city = (row.get("complete_address") or {}).get("city", "")
    if "barranquilla" not in normalize(f"{addr} {city}"):
        return False
    if NON_BARRANQUILLA.search(normalize(addr)):
        return False
    return True


def infer_venue_kind(title: str, category: str) -> str:
    t = normalize(f"{title} {category}")
    if any(k in t for k in ("club", "liga", "academia")):
        return "club"
    if any(k in t for k in ("parque", "unidad deportiva", "distrital", "publica", "polideportivo")):
        return "publica"
    return "alquiler"


def infer_surface(sports: list[str]) -> str:
    if "padel" in sports:
        return "sintetica"
    if "basquet" in sports:
        return "dura"
    if "voleibol" in sports:
        return "arena" if False else "dura"
    return "sintetica"


def infer_covered(title: str, category: str) -> bool | None:
    t = normalize(f"{title} {category}")
    if any(k in t for k in ("techad", "cubierta", "indoor", "bajo techo")):
        return True
    if "descubiert" in t or "playa" in t or "beach" in t:
        return False
    return None


def match_existing(title: str, address: str) -> str | None:
    nt = normalize(title)
    special = [
        ("pibe", "pibe-valderrama"),
        ("jaula", "la-jaula-ensenanza"),
        ("mundialito", "mundialito"),
        ("la 8 fc", "la-8-fc-cancha-sintetica"),
        ("8 fc", "la-8-fc-cancha-sintetica"),
        ("los mosquitos", "cancha-de-futbol-los-mosquitos"),
        ("tivoli", "complejo-tivoli"),
        ("tivoly", "complejo-tivoli"),
        ("sagrado corazon", "sagrado-corazon"),
        ("las mercedes", "las-mercedes"),
        ("del carmen", "cancha-de-futbol-del-carmen"),
    ]
    for needle, slug in special:
        if needle in nt:
            return slug

    best_slug = None
    best_score = 0.0
    for slug, name in EXISTING:
        score = similarity(title, name)
        if score > best_score:
            best_score = score
            best_slug = slug
    if best_score >= 0.55:
        return best_slug
    for slug, name in EXISTING:
        if slug.replace("-", " ") in nt or normalize(name) in nt:
            return slug
    return None


def build_notes(row: dict) -> str | None:
    parts = []
    category = row.get("category", "")
    if category:
        parts.append(category)
    rating = row.get("review_rating")
    review_count = row.get("review_count")
    if rating:
        parts.append(f"★ {rating} ({review_count or 0} reseñas)")
    phone = row.get("phone", "")
    if phone:
        parts.append(f"Tel: {phone}")
    website = row.get("web_site", "")
    if website:
        parts.append(f"Web: {website}")
    return ". ".join(parts) if parts else None


def sort_sports(sports: list[str]) -> list[str]:
    return sorted(sports, key=lambda s: SPORT_ORDER.index(s) if s in SPORT_ORDER else 99)


def sql_str(s):
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


def sql_bool(v):
    if v is None:
        return "null"
    return "true" if v else "false"


def sql_array(arr):
    items = ", ".join(f"'{x}'" for x in arr)
    return f"array[{items}]::text[]"


def main():
    rows = []
    with open(RESULTS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    seen_place: set[str] = set()
    new_venues: list[dict] = []
    enrich_map: dict[str, dict] = {}

    for row in rows:
        pid = row.get("place_id", "")
        if pid in seen_place:
            continue
        if not is_relevant(row):
            continue
        seen_place.add(pid)

        title = row.get("title", "").strip()
        address = row.get("address", "") or (row.get("complete_address") or {}).get("street", "")
        lat = row.get("latitude")
        lng = row.get("longitude")
        if not title or lat is None or lng is None:
            continue

        category = row.get("category", "")
        sports = sort_sports(infer_sports(title, category, row.get("categories")))
        borough = (row.get("complete_address") or {}).get("borough", "")
        neighborhood = borough.split(",")[0].strip() if borough else "Barranquilla"

        venue = {
            "slug": slugify(title),
            "name": title,
            "neighborhood": neighborhood,
            "address": address,
            "lat": lat,
            "lng": lng,
            "sports": sports,
            "surface": infer_surface(sports),
            "covered": infer_covered(title, category),
            "venue_kind": infer_venue_kind(title, category),
            "notes": build_notes(row),
            "place_id": pid,
        }

        existing_slug = match_existing(title, address)
        if existing_slug:
            entry = enrich_map.setdefault(
                existing_slug,
                {"slug": existing_slug, "sports": set(), "notes": None, "address": None, "lat": None, "lng": None},
            )
            entry["sports"].update(sports)
            if venue["notes"]:
                entry["notes"] = venue["notes"]
            if address and (not entry["address"] or len(address) > len(entry["address"])):
                entry["address"] = address
                entry["lat"] = lat
                entry["lng"] = lng
            continue

        # Nuevas canchas: priorizar deportes distintos a solo fútbol 11
        if not any(s in ("basquet", "voleibol", "padel", "futbol_sala") for s in sports):
            continue

        if normalize(title) in GENERIC_TITLES:
            continue
        if SKIP_NEW_IF_ONLY_FUTBOL and sports == ["futbol"]:
            continue
        if any(is_duplicate_new(v, venue) for v in new_venues):
            continue
        new_venues.append(venue)

    used_slugs: set[str] = set(EXISTING_SLUGS)
    for v in new_venues:
        base = v["slug"]
        i = 2
        while v["slug"] in used_slugs:
            v["slug"] = f"{base}-{i}"
            i += 1
        used_slugs.add(v["slug"])

    enrich_list = []
    existing_set = set(EXISTING_SLUGS)
    for slug, data in enrich_map.items():
        if slug not in existing_set:
            continue
        enrich_list.append(
            {
                "slug": slug,
                "add_sports": sort_sports(list(data["sports"])),
                "notes": data["notes"],
                "address": data["address"],
                "lat": data["lat"],
                "lng": data["lng"],
            }
        )

    OUT_NEW.write_text(json.dumps(new_venues, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_ENRICH.write_text(json.dumps(enrich_list, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [
        "-- Barranquilla multi-sport venue enrichment (Google Maps scrape 2026-09-02)",
        "-- Queries: tmp/gmaps-bafut-sports-queries.txt",
        "-- Sports: basquet, voleibol, padel, futbol_sala (+ enrich existing futbol venues)",
        "",
    ]

    if new_venues:
        lines.append("insert into public.venues (")
        lines.append("  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes")
        lines.append(")")
        lines.append("select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes")
        lines.append("from public.cities c")
        lines.append("cross join (")
        lines.append("  values")
        value_rows = []
        for v in new_venues:
            value_rows.append(
                f"    ({sql_str(v['slug'])}, {sql_str(v['name'])}, {sql_str(v['neighborhood'])}, {sql_str(v['address'])}, "
                f"{v['lat']}, {v['lng']}, {sql_array(v['sports'])}, {sql_str(v['surface'])}, "
                f"{sql_bool(v['covered'])}, {sql_str(v['venue_kind'])}, {sql_str(v.get('notes'))})"
            )
        lines.append(",\n".join(value_rows))
        lines.append(") as v(slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes)")
        lines.append("where c.slug = 'barranquilla'")
        lines.append("on conflict (city_id, slug) do nothing;")
        lines.append("")

    for e in enrich_list:
        add = e["add_sports"]
        if not add:
            continue
        # Prefer enriching with non-football sports; futbol_sala still valuable
        add = [s for s in add if s not in ("futbol",) or s == "futbol_sala"]
        if not add:
            continue
        sports_expr = " || ".join(f"array['{s}']::text[]" for s in add)
        sets = [
            f"sports = (select array_agg(distinct x order by x) from unnest(sports || {sports_expr}) as x)",
        ]
        if e.get("notes"):
            sets.append(
                f"notes = coalesce(notes || ' | ', '') || {sql_str('Google Maps: ' + e['notes'])}"
            )
        lines.append(f"update public.venues set {', '.join(sets)}")
        lines.append(f"where slug = {sql_str(e['slug'])}")
        lines.append("  and city_id = (select id from public.cities where slug = 'barranquilla');")
        lines.append("")

    MIGRATION.write_text("\n".join(lines), encoding="utf-8")

    by_sport: dict[str, int] = {}
    for v in new_venues:
        for s in v["sports"]:
            by_sport[s] = by_sport.get(s, 0) + 1

    print(f"Scraped rows: {len(rows)}")
    print(f"Relevant unique: {len(seen_place)}")
    print(f"New venues: {len(new_venues)}")
    print(f"Enriched existing: {len(enrich_list)}")
    print("New by sport:", by_sport)
    print(f"Migration: {MIGRATION}")
    for v in new_venues:
        print(f"  + [{', '.join(v['sports'])}] {v['name']}")


def is_duplicate_new(a: dict, b: dict) -> bool:
    if similarity(a["name"], b["name"]) >= 0.7:
        return True
    if a.get("place_id") == b.get("place_id"):
        return True
    # proximity ~80m
    if abs(a["lat"] - b["lat"]) < 0.0008 and abs(a["lng"] - b["lng"]) < 0.0008:
        return similarity(a["name"], b["name"]) >= 0.4
    return False


if __name__ == "__main__":
    main()
