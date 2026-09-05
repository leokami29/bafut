#!/usr/bin/env python3
"""Process multi-sport Google Maps scrape for BaFut Barranquilla."""
from __future__ import annotations

import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

RESULTS = Path(__file__).parent / "gmaps-sports-results.json"
OUT_NEW = Path(__file__).parent / "venues-sports-new.json"
OUT_ENRICH = Path(__file__).parent / "venues-sports-enriched.json"
OUT_REPORT = Path(__file__).parent / "venues-sports-report.json"

# Existing venues from seed + football scrape migration
EXISTING = [
    ("la-jaula-ensenanza", "La Jaula — La Enseñanza", "Cra. 53 #86-119", 11.0118, -74.8214, ["futbol"]),
    ("la-jaula-americano", "La Jaula — Americano", "Cra. 38A #74-179", 10.9992, -74.7961, ["futbol"]),
    ("brazuca-villa-campestre", "Brazuca Soccer", "Villa Campestre", 11.0234, -74.8695, ["futbol"]),
    ("soccer-papiros", "Soccer Papiros", "Norte de Barranquilla", 11.0086, -74.8298, ["futbol"]),
    ("zoccer-plaza", "Zoccer Plaza", "Cl. 77 #58-53", 11.0061857, -74.8019, ["futbol"]),
    ("canchas-biffi", "Canchas Biffi", "Calle 85 con Cra. 56", 11.0134, -74.8198, ["futbol"]),
    ("soccer-44", "Soccer 44", "Calle 44 #44-52", 10.9874, -74.7889, ["futbol"]),
    ("combarranquilla-boston", "Combarranquilla Boston", "Unidad Boston", 10.9848, -74.8047, ["futbol"]),
    ("combarranquilla-solinilla", "Combarranquilla Solinilla", "Centro Recreacional Solinilla", 11.0189, -74.8752, ["futbol", "futbol_sala"]),
    ("los-tubos", "Cancha Los Tubos", "Sector Domingo Marino", 10.9432, -74.7941, ["futbol"]),
    ("san-isidro", "Cancha San Isidro", "Carrera 24 Esquina 53D", 10.9707433, -74.7991675, ["futbol"]),
    ("pibe-valderrama", "Unidad Deportiva Pibe Valderrama", "Cra. 1c #46", 10.9300546, -74.801506, ["futbol"]),
    ("malecon-del-rio", "Cancha sintética Malecón del Río", "Malecón del Río Magdalena", 10.9862, -74.7778, ["futbol"]),
    ("complejo-tivoli", "Complejo Tívoli", "Complejo Tívoli", 10.9726, -74.8115, ["futbol"]),
    ("sagrado-corazon", "Parque Sagrado Corazón", "Parque Sagrado Corazón", 10.9915, -74.8032, ["futbol"]),
    ("la-electrificadora", "Canchas La Electrificadora", "Parque La Electrificadora", 10.9689, -74.7924, ["futbol"]),
    ("los-andes", "Cancha Los Andes", "Barrio Los Andes", 10.9598, -74.8194, ["futbol"]),
    ("buena-esperanza", "Cancha Buena Esperanza", "Buena Esperanza", 10.9512, -74.8088, ["futbol"]),
    ("mundialito", "Cancha Mundialito", "Cra. 3 #Calle 45D", 10.9356476, -74.8007297, ["futbol"]),
    ("lluvia-de-oro", "Parque Lluvia de Oro", "Parque Lluvia de Oro", 10.9621, -74.8015, ["futbol"]),
    ("las-mercedes", "Cancha Las Mercedes", "Las Mercedes", 10.9744, -74.8256, ["futbol"]),
    ("cristo-rey", "Cancha Cristo Rey", "Cristo Rey", 10.9668, -74.8142, ["futbol"]),
    ("la-inmaculada", "Parque La Inmaculada", "Parque La Inmaculada", 10.9817, -74.8089, ["futbol"]),
    ("altos-de-silencio", "Cancha Altos de Silencio", "Altos de Silencio", 10.9386, -74.8219, ["futbol"]),
    ("eugenio-macias", "Cancha Eugenio Macías", "Eugenio Macías", 10.9449, -74.8053, ["futbol"]),
    ("simon-bolivar", "Cancha Simón Bolívar", "Simón Bolívar", 10.9427129, -74.7783016, ["futbol"]),
    ("parque-olivos", "Parque Olivos", "Parque Olivos", 10.9577, -74.8364, ["futbol"]),
    ("los-suenos", "Cancha Los Sueños", "Los Sueños", 10.9411, -74.8128, ["futbol"]),
    ("cancha-sintetica-la-patiada", "Cancha Sintética La Patiada", "Cra. 20 #30-123", 10.9570953, -74.7869806, ["futbol", "futbol_sala"]),
    ("cancha-el-moderno", "Cancha el Moderno", "Cisneros", 10.9342038, -74.7958499, ["futbol"]),
    ("la-8-fc-cancha-sintetica", "La 8 FC Cancha Sintética", "Cra. 8 #38b-51", 10.9456989, -74.7947626, ["futbol"]),
    ("cancha-san-martin-7-de-abril", "Cancha San Martin 7 De Abril", "Metropolitana", 10.9302968, -74.813447, ["futbol"]),
    ("la-21-futbol-club", "La 21 Fútbol Club", "Cra 21B #58-71", 10.9683139, -74.8028465, ["futbol"]),
    ("cancha-de-futbol-barrio-la-sierra", "Cancha de Fútbol Barrio La Sierra", "Cl. 46 #14-4", 10.9567525, -74.8021769, ["futbol"]),
    ("cancha-de-futbol-la-victoria", "Cancha de Fútbol La Victoria", "Cra. 10 #45b", 10.9527409, -74.7996194, ["futbol"]),
    ("cancha-de-futbol-sintetica-del-bosque", "Cancha de fútbol sintética del bosque", "El Bosque", 10.9524972, -74.8189816, ["futbol"]),
    ("cancha-de-futbol-5-hermanos-almendros", "Cancha de Fútbol 5 Hermanos Almendros", "Cra. 18d #80-3", 10.9179851, -74.8162699, ["futbol", "futbol_sala"]),
    ("cancha-de-futbol-nueva-granada", "Cancha de Fútbol Nueva Granada", "Cra. 29 #Calle 65", 10.9785203, -74.804544, ["futbol"]),
    ("cancha-sintetica-rojiblanca", "Cancha Sintética Rojiblanca", "Cl. 56 #41a112", 10.9838908, -74.7941152, ["futbol", "futbol_sala"]),
    ("cancha-de-futbol-los-mosquitos", "Cancha de Fútbol Los Mosquitos", "Calle 40", 10.9516994, -74.7955508, ["futbol"]),
    ("cancha-de-futbol-la-magdalena", "Cancha de Fútbol La Magdalena", "Cra. 7c #37c1", 10.943237, -74.7933193, ["futbol"]),
    ("canchas-el-tiburon", "Canchas El Tiburón", "Murillo Toro #36-36", 10.9784932, -74.7872513, ["futbol", "futbol_sala"]),
    ("cancha-de-microfutbol-los-andes", "Cancha de Microfútbol — Los Andes", "Cl. 63c", 10.9721862, -74.8054746, ["futbol", "futbol_sala"]),
    ("cancha-la-tiburona-sas", "Cancha La Tiburona SAS", "Av. Murillo #43-120", 10.9867641, -74.7834608, ["futbol", "futbol_sala"]),
    ("cancha-sintetica-de-futbol-bosques-del-norte", "Cancha Sintetica de Futbol - Bosques del Norte", "Riomar", 11.0136898, -74.8229925, ["futbol"]),
    ("cancha-ringo-makro-club-deportivo", "Cancha Ringo Makro Club Deportivo", "Cra. 52 #106", 11.0166114, -74.8361298, ["futbol"]),
    ("fsb-la-cancha", "FSB La Cancha", "Belo Horizonte", 11.0138195, -74.7969872, ["futbol"]),
    ("cancha-7-bocas", "Cancha 7 Bocas", "Cl. 53a #2-2", 10.9366845, -74.815754, ["futbol"]),
    ("soccer-house", "Soccer House", "Carrera 25 & Cl. 3", 11.023818, -74.8612076, ["futbol"]),
    ("cancha-de-futbol-del-carmen", "Cancha De Fútbol Del Carmen", "Carrera 21", 10.9657325, -74.7990506, ["futbol"]),
    ("cancha-de-futbol-el-pana", "Cancha de Fútbol El Pana", "Las Americas", 10.9394784, -74.8143766, ["futbol"]),
    ("cancha-del-brasil", "Cancha del brasil", "Cr. De La Cordialidad", 10.9484155, -74.8126381, ["futbol"]),
    ("canchas-de-futbol-napoleon-salcedo-cotes", "Canchas de Fútbol Napoleón Salcedo Cotes", "Cl. 70b", 10.979739, -74.8095871, ["futbol", "futbol_sala"]),
    ("club-de-leones", "Cancha Club de Leones", "Cra. 38 #66-90", 10.9837765, -74.8025051, ["futbol", "futbol_sala"]),
]

TARGET_SPORTS = {"basquet", "voleibol", "padel", "futbol_sala"}

EXCLUDE = re.compile(
    r"restaurante|hotel|bar\s|discoteca|universidad|colegio|escuela|"
    r"piscina|natacion|natación|tenis(?!\s*padel)|golf|skate|"
    r"hamburger|billar|pool hall|gimnasio(?!.*baloncesto)|fitness center|"
    r"government office|event venue|playground(?!.*basket)|roller skating",
    re.I,
)

# Generic/low-value titles to skip unless category is strong
GENERIC_TITLE = re.compile(r"^(soccer field|basketball court|volleyball court|park|cancha)$", re.I)


def normalize(text: str) -> str:
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def slugify(name: str) -> str:
    s = normalize(name)
    s = re.sub(r"\s+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s[:80].strip("-")


def haversine_m(lat1, lng1, lat2, lng2) -> float:
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def token_set(text: str) -> set[str]:
    stop = {
        "cancha", "canchas", "de", "la", "el", "los", "las", "del", "y", "en",
        "barranquilla", "club", "deportivo", "sports", "court", "field",
        "sintetica", "sintetico", "parque",
    }
    return {t for t in normalize(text).split() if t not in stop and len(t) > 2}


def similarity(a: str, b: str) -> float:
    ta, tb = token_set(a), token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def infer_sports(title: str, category: str, categories: list | None) -> list[str]:
    blob = normalize(" ".join([title, category or "", " ".join(categories or [])]))
    sports: list[str] = []

    if any(k in blob for k in (
        "basketball", "basquet", "basquetbol", "baloncesto", "basket",
    )):
        sports.append("basquet")
    if any(k in blob for k in (
        "volleyball", "voleibol", "voley", "beach volleyball",
    )):
        sports.append("voleibol")
    if any(k in blob for k in ("padel", "pádel", "paddle tennis")):
        sports.append("padel")
    if any(k in blob for k in (
        "futsal", "futbol sala", "microfutbol", "micro futbol", "fútbol sala",
    )):
        sports.append("futbol_sala")
        # Colombian microfutbol venues are also usable as futbol small-sided
        if "futbol" not in sports:
            sports.insert(0, "futbol")

    # Category-only soccer field without futsal keywords → skip (already covered)
    if not sports and "soccer" in blob:
        return []

    return list(dict.fromkeys(sports))


def infer_surface(title: str, category: str, sports: list[str]) -> str:
    t = normalize(f"{title} {category}")
    if any(k in t for k in ("sintetic", "artificial")):
        return "sintetica"
    if "padel" in sports:
        return "cemento"
    if "basquet" in sports or "voleibol" in sports:
        return "cemento"
    if "futbol_sala" in sports:
        return "sintetica"
    return "sintetica"


def infer_covered(title: str, category: str) -> bool | None:
    t = normalize(f"{title} {category}")
    if any(k in t for k in ("techad", "cubierta", "indoor", "bajo techo", "coliseo")):
        return True
    if "descubiert" in t:
        return False
    if "padel" in t:
        return None  # often covered but unknown
    return None


def infer_venue_kind(title: str, category: str) -> str:
    t = normalize(f"{title} {category}")
    if any(k in t for k in ("club", "combarranquilla")):
        return "club"
    if any(k in t for k in ("parque", "unidad deportiva", "distrital", "publica", "coliseo", "polideportivo")):
        return "publica"
    return "alquiler"


def in_barranquilla(row: dict) -> bool:
    addr = normalize(row.get("address") or "")
    city = normalize((row.get("complete_address") or {}).get("city") or "")
    return "barranquilla" in addr or "barranquilla" in city or "soledad" in addr


def find_existing_match(title: str, address: str, lat: float, lng: float):
    best = None
    best_score = 0.0
    for slug, name, addr, elat, elng, sports in EXISTING:
        score = similarity(title, name)
        dist = haversine_m(lat, lng, elat, elng)
        if dist < 120:
            score = max(score, 0.7)
        if dist < 80 and score >= 0.35:
            score = max(score, 0.75)
        if similarity(address, addr) >= 0.55:
            score = max(score, 0.65)
        # keyword pairs
        nt, ne = normalize(title), normalize(name)
        for a, b in (
            ("patiada", "patiada"), ("tiburon", "tiburon"), ("tiburona", "tiburona"),
            ("rojiblanca", "rojiblanca"), ("mundialito", "mundialito"),
            ("zoccer", "zoccer"), ("leones", "leones"), ("pibe", "pibe"),
            ("tivoli", "tivoli"), ("tivoly", "tivoli"), ("microfutbol", "microfutbol"),
            ("napoleon", "napoleon"), ("bosque", "bosque"), ("magdalena", "magdalena"),
        ):
            if a in nt and b in ne:
                score = max(score, 0.8)
        if score > best_score:
            best_score = score
            best = (slug, name, addr, elat, elng, sports, score, dist)
    if best and best_score >= 0.55:
        return best
    return None


def is_relevant(row: dict, sports: list[str]) -> bool:
    if not sports:
        return False
    if not any(s in TARGET_SPORTS for s in sports):
        return False
    title = row.get("title") or ""
    category = row.get("category") or ""
    text = f"{title} {category}"
    if EXCLUDE.search(text) and not any(s in ("basquet", "voleibol", "padel") for s in sports):
        # allow exclude match only if sport keywords strong in title
        if not re.search(r"basquet|baloncesto|voleibol|padel|futsal|microfutbol", title, re.I):
            return False
    if GENERIC_TITLE.match(title.strip()) and not sports:
        return False
    if not in_barranquilla(row):
        return False
    return True


def main():
    rows = []
    with open(RESULTS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    seen_pids: set[str] = set()
    new_venues = []
    enrichments = []  # merge sports into existing
    sport_counts = Counter()
    skipped = []

    for row in rows:
        pid = row.get("place_id") or ""
        if pid in seen_pids:
            continue
        seen_pids.add(pid)

        title = (row.get("title") or "").strip()
        category = row.get("category") or ""
        categories = row.get("categories") or []
        sports = infer_sports(title, category, categories)

        if not is_relevant(row, sports):
            continue

        # Prefer non-generic titles; skip pure "Soccer field" without futsal if only futbol
        if GENERIC_TITLE.match(title) and set(sports) <= {"futbol", "futbol_sala"}:
            # keep only if futsal and we need more futbol_sala — still include named via address later skip
            if "futbol_sala" not in sports:
                skipped.append(("generic", title, category))
                continue

        lat = row.get("latitude")
        lng = row.get("longitude")
        if lat is None or lng is None or not title:
            continue

        address = row.get("address") or ""
        borough = (row.get("complete_address") or {}).get("borough") or ""
        neighborhood = borough.split(",")[0].strip() if borough else ""
        if not neighborhood:
            neighborhood = (row.get("complete_address") or {}).get("city") or "Barranquilla"

        rating = row.get("review_rating")
        review_count = row.get("review_count")
        phone = row.get("phone") or ""
        website = row.get("web_site") or ""

        notes_parts = []
        if category:
            notes_parts.append(category)
        if rating:
            notes_parts.append(f"★ {rating} ({review_count or 0} reseñas)")
        if phone:
            notes_parts.append(f"Tel: {phone}")
        if website:
            notes_parts.append(f"Web: {website}")
        notes = ". ".join(notes_parts) if notes_parts else None

        display_name = title.title() if title.isupper() else title
        match = find_existing_match(title, address, lat, lng)

        for s in sports:
            sport_counts[s] += 1

        if match:
            slug, ename, *_rest, score, dist = match
            existing_sports = match[5]
            merged = list(dict.fromkeys([*existing_sports, *sports]))
            enrich = {
                "existing_slug": slug,
                "existing_name": ename,
                "match_score": round(score, 2),
                "distance_m": round(dist, 1),
                "scraped_name": display_name,
                "add_sports": [s for s in sports if s not in existing_sports],
                "merged_sports": merged,
                "new_address": address if address else None,
                "new_lat": lat,
                "new_lng": lng,
                "new_notes": notes,
            }
            # only keep if new sports or useful address
            if enrich["add_sports"] or (address and len(address) > 20):
                enrichments.append(enrich)
            continue

        # skip pure football already covered by prior scrape (no new target sport alone... wait)
        # If only futbol_sala+futbol and looks like football venue already in DB via fuzzy miss
        venue = {
            "slug": slugify(display_name),
            "name": display_name,
            "neighborhood": neighborhood,
            "address": address,
            "lat": lat,
            "lng": lng,
            "sports": sports,
            "surface": infer_surface(title, category, sports),
            "covered": infer_covered(title, category),
            "venue_kind": infer_venue_kind(title, category),
            "notes": notes,
            "place_id": pid,
            "category": category,
        }

        # dedupe among new by geo + name
        dup = False
        for v in new_venues:
            if haversine_m(lat, lng, v["lat"], v["lng"]) < 80 and similarity(display_name, v["name"]) >= 0.4:
                # merge sports
                v["sports"] = list(dict.fromkeys([*v["sports"], *sports]))
                dup = True
                break
            if similarity(display_name, v["name"]) >= 0.7:
                v["sports"] = list(dict.fromkeys([*v["sports"], *sports]))
                dup = True
                break
        if dup:
            continue
        new_venues.append(venue)

    # unique slugs
    used = {s for s, *_ in EXISTING}
    for v in new_venues:
        base = v["slug"] or "cancha"
        i = 2
        while v["slug"] in used:
            v["slug"] = f"{base}-{i}"
            i += 1
        used.add(v["slug"])

    # Manual quality filter: drop stadiums / unrelated
    DROP_SLUGS = {
        "estadio-metropolitano",
        "estadio-romelio-martinez",
        "coliseo-elias-chegwin",  # keep if basketball — actually useful for basquet
    }
    # Prefer keeping coliseo for basquet
    new_venues = [v for v in new_venues if v["slug"] not in DROP_SLUGS or "basquet" in v["sports"]]

    # Prefer venues that have at least one non-football target OR are new futbol_sala not already seeded
    # (futbol_sala new venues are valuable)
    prioritized = []
    for v in new_venues:
        if any(s in ("basquet", "voleibol", "padel") for s in v["sports"]):
            prioritized.append(v)
        elif "futbol_sala" in v["sports"]:
            prioritized.append(v)

    # Merge enrichments by slug (union sports)
    best_enrich = {}
    for e in enrichments:
        slug = e["existing_slug"]
        if slug not in best_enrich:
            best_enrich[slug] = e
        else:
            prev = best_enrich[slug]
            prev["add_sports"] = list(dict.fromkeys([*prev["add_sports"], *e["add_sports"]]))
            prev["merged_sports"] = list(dict.fromkeys([*prev["merged_sports"], *e["merged_sports"]]))
            if e.get("new_address") and len(e["new_address"]) > len(prev.get("new_address") or ""):
                prev["new_address"] = e["new_address"]
                prev["new_lat"] = e["new_lat"]
                prev["new_lng"] = e["new_lng"]
            if e.get("new_notes") and (not prev.get("new_notes") or len(e["new_notes"]) > len(prev["new_notes"])):
                prev["new_notes"] = e["new_notes"]

    enrich_list = list(best_enrich.values())
    # Keep enrichments that add sports
    enrich_list = [e for e in enrich_list if e["add_sports"]]

    OUT_NEW.write_text(json.dumps(prioritized, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_ENRICH.write_text(json.dumps(enrich_list, ensure_ascii=False, indent=2), encoding="utf-8")

    by_sport_new = Counter()
    for v in prioritized:
        for s in v["sports"]:
            by_sport_new[s] += 1
    by_sport_enrich = Counter()
    for e in enrich_list:
        for s in e["add_sports"]:
            by_sport_enrich[s] += 1

    report = {
        "scraped_rows": len(rows),
        "unique_place_ids": len(seen_pids),
        "new_venues": len(prioritized),
        "enriched_venues": len(enrich_list),
        "sport_hits_raw": dict(sport_counts),
        "new_by_sport": dict(by_sport_new),
        "enrich_add_by_sport": dict(by_sport_enrich),
        "new_names": [{"name": v["name"], "sports": v["sports"], "neighborhood": v["neighborhood"]} for v in prioritized],
        "enrich_names": [{"slug": e["existing_slug"], "add_sports": e["add_sports"], "scraped": e["scraped_name"]} for e in enrich_list],
    }
    OUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(json.dumps(report, ensure_ascii=False, indent=2))
    print(f"\nWrote {OUT_NEW}")
    print(f"Wrote {OUT_ENRICH}")
    print(f"Wrote {OUT_REPORT}")


if __name__ == "__main__":
    main()
