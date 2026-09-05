#!/usr/bin/env python3
"""Curate multi-sport venues and generate SQL migration + seed updates."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent
NEW = json.loads((ROOT / "venues-sports-new.json").read_text(encoding="utf-8"))
by_slug = {v["slug"]: v for v in NEW}
by_name = {v["name"].lower(): v for v in NEW}

# --- Curated KEEP list (slugs from process-sports) ---
KEEP_SLUGS = {
    # Pádel (la-jaula-padel → enrich la-jaula-ensenanza; same address)
    "padel-zenter-del-rio",
    "padel-park",
    "casa-padel-patio",
    "padel-zenter-la-arenosa",
    "rooftop-padel-club",
    "x3-padel-club",
    "padelya",
    "one-padel-academy-barranquilla",
    # Básquet (titanes = mismo lat/lng que los-cachorros)
    "club-de-baloncesto-cocodrilos-de-barranquilla",
    "cancha-de-baloncesto-las-palmas",
    "cancha-villa-santos",
    "club-de-baloncesto-aguilas-azules",
    "cancha-de-baloncesto-los-cachorros",
    "park-renowitzky-2",
    "cancha-de-baloncesto-el-divino-nino",
    "cancha-multiple-nuestra-senora-de-guadalupe",
    "cancha-de-baloncesto-designado",
    "cancha-basquetbol",
    # Voleibol
    "club-de-voleibol-ballbreakers",
    "elements-voley-club",
    "canchas-cc-metropolitano",
    "campo-de-voleibol-playa",
    "voleibol-club-aston-quilla-voley",
    "cancha-multiple-del-eden",
    "cancha-de-voleibol-villa-santos",
    "club-deportivo-snow-volley-barranquilla",
    # Fútbol sala nuevos
    "cancha-sintetica-brasileirao",
    "canchas-sinteticas-la-27",
    "canchas-de-piso-los-manantiales",
    "cancha-de-futbol-sala-caribe-campestre",
    "cancha-de-futbol-las-flores",
    "cancha-la-19",
}

DROP_SLUGS = {
    "cancha-multiple",  # Uninorte / Puerto Colombia
    "liga-de-voleibol-del-atlantico",  # sede administrativa
    "cancha-de-voleibol",  # genérico
    "cancha-de-baloncesto",  # genérico Sur Orient
    "cancha-de-baloncesto-titanes",  # dup Los Cachorros
    "la-jaula-padel",  # same pin as la-jaula-ensenanza
}

# Manual extras recovered from false enrich matches
MANUAL_NEW = [
    {
        "slug": "cancha-de-futbol-barranquilla-cra-22",
        "name": "Cancha De Fútbol Barranquilla",
        "neighborhood": "Barranquilla",
        "address": "Cra. 22 #112c66, Barranquilla, Atlántico",
        "lat": 10.9602936,
        "lng": -74.7721962,
        "sports": ["futbol", "futbol_sala"],
        "surface": "sintetica",
        "covered": None,
        "venue_kind": "alquiler",
        "notes": "Futsal court. ★ 4.1 (52 reseñas)",
    },
    {
        "slug": "cancha-de-baloncesto-simon-bolivar",
        "name": "Cancha De Baloncesto Simón Bolívar",
        "neighborhood": "Simón Bolívar",
        "address": "Cl. 19 #7a-2, Barranquilla, Atlántico",
        "lat": 10.9475064,
        "lng": -74.7754531,
        "sports": ["basquet"],
        "surface": "cemento",
        "covered": None,
        "venue_kind": "publica",
        "notes": "Sports school. ★ 5 (2 reseñas)",
    },
    {
        "slug": "cancha-de-cemento-la-sierra",
        "name": "Cancha de Cemento La Sierra",
        "neighborhood": "La Sierra",
        "address": "La Sierra, Barranquilla, Atlántico",
        "lat": 10.9562946,
        "lng": -74.8013652,
        "sports": ["futbol_sala"],
        "surface": "cemento",
        "covered": None,
        "venue_kind": "alquiler",
        "notes": "Futsal court. ★ 5 (2 reseñas)",
    },
    {
        "slug": "casa-padel-colombia-rooftop",
        "name": "Casa Padel Colombia Rooftop",
        "neighborhood": "Villa Campestre",
        "address": "Cl. 135 #53, Sabanilla Montecarmelo, Barranquilla, Puerto Colombia, Atlántico",
        "lat": 11.023782,
        "lng": -74.8617924,
        "sports": ["padel"],
        "surface": "cemento",
        "covered": True,
        "venue_kind": "alquiler",
        "notes": "Sports club. ★ 5 (19 reseñas). Web: https://reservadeportes.com/Casapadel.html?domain=CO",
    },
]

# Enrich existing: only clear multi-sport additions
ENRICH = [
    {
        "slug": "complejo-tivoli",
        "sports": ["futbol", "voleibol"],
        "notes_append": "Google Maps: cancha de voleibol en Complejo Tívoli (Cra. 64c #94-57).",
    },
    {
        "slug": "la-jaula-ensenanza",
        "sports": ["futbol", "padel"],
        "notes_append": "Google Maps: también ofrece pádel (La Jaula Padel, misma sede Cra. 53 #86-119).",
    },
]

# Rename/normalize display names for es-CO
NAME_OVERRIDES = {
    "padel-zenter-del-rio": "Padel Zenter Del Río",
    "club-de-baloncesto-aguilas-azules": "Club de baloncesto Águilas Azules",
    "cancha-multiple-del-eden": "Cancha múltiple del Edén",
    "cancha-multiple-nuestra-senora-de-guadalupe": "Cancha Múltiple Nuestra Señora De Guadalupe",
    "cancha-basquetbol": "Cancha de básquet Las Flores",
    "park-renowitzky-2": "Parque Renowitzky 2",
    "padelya": "PadelYa",
}


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


venues = []
for slug in sorted(KEEP_SLUGS):
    if slug in DROP_SLUGS:
        continue
    v = by_slug.get(slug)
    if not v:
        # try fuzzy: accents stripped in slugify
        continue
    if not v.get("address") or v["lat"] is None:
        continue
    item = {k: v[k] for k in (
        "slug", "name", "neighborhood", "address", "lat", "lng",
        "sports", "surface", "covered", "venue_kind", "notes",
    )}
    if slug in NAME_OVERRIDES:
        item["name"] = NAME_OVERRIDES[slug]
    # Prefer covered false for outdoor public courts when unknown → leave null
    venues.append(item)

# Add any KEEP that wasn't found (slug mismatch)
missing = KEEP_SLUGS - {v["slug"] for v in venues} - DROP_SLUGS
if missing:
    # rematch by normalized slug from NEW
    for v in NEW:
        if v["slug"] in missing:
            item = {k: v[k] for k in (
                "slug", "name", "neighborhood", "address", "lat", "lng",
                "sports", "surface", "covered", "venue_kind", "notes",
            )}
            if v["slug"] in NAME_OVERRIDES:
                item["name"] = NAME_OVERRIDES[v["slug"]]
            venues.append(item)
            missing.discard(v["slug"])

venues.extend(MANUAL_NEW)

# Dedupe by slug
seen = set()
unique = []
for v in venues:
    if v["slug"] in seen:
        continue
    seen.add(v["slug"])
    unique.append(v)
venues = unique

# Sort by sport priority then name
SPORT_ORDER = {"padel": 0, "basquet": 1, "voleibol": 2, "futbol_sala": 3, "futbol": 4}

def sort_key(v):
    primary = min(SPORT_ORDER.get(s, 9) for s in v["sports"])
    return (primary, v["name"].lower())

venues.sort(key=sort_key)

lines = [
    "-- Barranquilla multi-sport venue enrichment from Google Maps scrape (2026-09-02)",
    "-- Source: gosom/google-maps-scraper (queries: básquet/baloncesto, voleibol, pádel, fútbol sala/microfútbol)",
    "-- Schema: sports text[] already supports multi-sport; no DDL required.",
    "",
    "insert into public.venues (",
    "  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes",
    ")",
    "select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes",
    "from public.cities c",
    "cross join (",
    "  values",
]

value_rows = []
for v in venues:
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

for e in ENRICH:
    lines.append(
        f"update public.venues set sports = {sql_array(e['sports'])},"
    )
    lines.append(
        f"  notes = coalesce(notes || ' | ', '') || {sql_str(e['notes_append'])}"
    )
    lines.append(f"where slug = {sql_str(e['slug'])}")
    lines.append(
        "  and city_id = (select id from public.cities where slug = 'barranquilla');"
    )
    lines.append("")

out = ROOT.parent / "supabase" / "migrations" / "20260902210000_barranquilla_multisport_venues.sql"
out.write_text("\n".join(lines) + "\n", encoding="utf-8")

# Summary by sport
from collections import Counter
c = Counter()
for v in venues:
    for s in v["sports"]:
        c[s] += 1

report = {
    "migration": str(out),
    "new_count": len(venues),
    "enrich_count": len(ENRICH),
    "by_sport": dict(c),
    "venues": [{"slug": v["slug"], "name": v["name"], "sports": v["sports"]} for v in venues],
    "missing_keep_slugs": sorted(missing),
}
(ROOT / "venues-sports-curated-report.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps(report, ensure_ascii=False, indent=2))
print(f"Wrote {out}")
