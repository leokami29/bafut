# Queries used — Barranquilla multi-sport Google Maps scrape (2026-09-02)

Source: `gosom/google-maps-scraper` via `.agents/skills/google-maps-scraper`
Output: `/tmp/gmaps-bafut-sports-output/results.json` (119 places)
Repo copy: `tmp/gmaps-sports-results.json`
Queries file: `tmp/gmaps-bafut-sports-queries.txt`

## Search queries

```
canchas de basquet Barranquilla
canchas de baloncesto Barranquilla
cancha de básquet Barranquilla
cancha de baloncesto Barranquilla
coliseo basquet Barranquilla
canchas de voleibol Barranquilla
cancha de voleibol Barranquilla
canchas de pádel Barranquilla
canchas de padel Barranquilla
club de padel Barranquilla
canchas de padel Riomar Barranquilla
canchas de padel Norte Barranquilla
canchas de voleibol Riomar Barranquilla
canchas de basquet Riomar Barranquilla
canchas de basquet Norte Barranquilla
canchas de voleibol Norte Barranquilla
microfutbol Barranquilla
futbol sala Barranquilla
canchas de futsal Barranquilla
canchas sinteticas microfutbol Barranquilla
```

## Validation query

```
canchas de padel Barranquilla
```

## Processing

- `tmp/process-sports.py` — filter, infer sports, dedupe by name/slug/lat-lng
- `tmp/generate-sports-sql.py` — curated inserts + sports array enrichments
- Migration: `supabase/migrations/20260902210000_barranquilla_multisport_venues.sql`
