#!/usr/bin/env python3
"""Generate SQL migration for new Barranquilla venues."""
import json
from pathlib import Path

NEW = json.loads((Path(__file__).parent / "venues-new.json").read_text(encoding="utf-8"))
ENRICH = json.loads((Path(__file__).parent / "venues-enriched.json").read_text(encoding="utf-8"))

# Manual curation: remove false positives / duplicates
EXCLUDE_SLUGS = {
    "polideportivo-canchas-el-pibe",  # duplicate pibe-valderrama
    "parque-y-cancha-las-mercedes",   # duplicate las-mercedes
    "cancha-multiple",                # Uninorte / Puerto Colombia
    "cancha-de-futbol-profesional-universidad-reformada",  # university-only
}

# Add Club de Leones from scrape (missed by deduper)
CLUB_LEONES = {
    "slug": "club-de-leones",
    "name": "Cancha Club de Leones",
    "neighborhood": "Norte Centro Histórico",
    "address": "Cra. 38 #66-90 Loc 3, Norte Centro Histórico, Barranquilla",
    "lat": 10.9837765,
    "lng": -74.8025051,
    "sports": ["futbol", "futbol_sala"],
    "surface": "sintetica",
    "covered": None,
    "venue_kind": "club",
    "notes": "Cancha de fútbol sala. ★ 4.2 (219 reseñas). Tel: 53608401",
}

venues = [v for v in NEW if v["slug"] not in EXCLUDE_SLUGS]
venues.append(CLUB_LEONES)

# Best enrichment per slug (prefer longer address)
best_enrich = {}
for e in ENRICH:
    slug = e["existing_slug"]
    if slug not in best_enrich or len(e.get("new_address", "")) > len(best_enrich[slug].get("new_address", "")):
        best_enrich[slug] = e

# Only enrich venues where scraper clearly improves data
ENRICH_APPLY = {
    "mundialito": ("address", "lat", "lng"),
    "zoccer-plaza": ("address", "lat", "lng", "notes"),
    "simon-bolivar": ("address", "lat", "lng"),
    "san-isidro": ("address", "lat", "lng"),
    "pibe-valderrama": ("address", "lat", "lng", "notes"),
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


lines = [
    "-- Barranquilla venue enrichment from Google Maps scrape (2026-09-02)",
    "-- Source: gosom/google-maps-scraper via google-maps-scraper skill",
    "",
]

# Inserts
lines.append("insert into public.venues (")
lines.append("  city_id, slug, name, neighborhood, address, lat, lng, sports, surface, covered, venue_kind, notes")
lines.append(")")
lines.append("select c.id, v.slug, v.name, v.neighborhood, v.address, v.lat, v.lng, v.sports, v.surface, v.covered, v.venue_kind, v.notes")
lines.append("from public.cities c")
lines.append("cross join (")
lines.append("  values")

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

# Updates
for slug, fields in ENRICH_APPLY.items():
    e = best_enrich.get(slug)
    if not e:
        continue
    sets = []
    if "address" in fields and e.get("new_address"):
        sets.append(f"address = {sql_str(e['new_address'])}")
    if "lat" in fields:
        sets.append(f"lat = {e['new_lat']}")
    if "lng" in fields:
        sets.append(f"lng = {e['new_lng']}")
    if "notes" in fields and e.get("new_notes"):
        # append scraper rating info without losing original notes
        sets.append(
            f"notes = coalesce(notes || ' | ', '') || {sql_str('Google Maps: ' + e['new_notes'])}"
        )
    if not sets:
        continue
    lines.append(f"update public.venues set {', '.join(sets)}")
    lines.append(f"where slug = {sql_str(slug)}")
    lines.append(
        "  and city_id = (select id from public.cities where slug = 'barranquilla');"
    )
    lines.append("")

out = Path(__file__).parent.parent / "supabase" / "migrations" / "20260902180000_barranquilla_venues_scrape.sql"
out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {out}")
print(f"New venues: {len(venues)}")
print(f"Enrichments: {len(ENRICH_APPLY)}")
for v in venues:
    print(f"  + {v['name']}")
