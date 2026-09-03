#!/usr/bin/env python3
"""Process Google Maps scrape results for BaFut Barranquilla venues."""
import json
import re
import unicodedata
from pathlib import Path

RESULTS = Path(__file__).parent / "gmaps-bafut-results.json"
OUT_NEW = Path(__file__).parent / "venues-new.json"
OUT_ENRICH = Path(__file__).parent / "venues-enriched.json"

EXISTING = [
    ("la-jaula-ensenanza", "La Jaula — La Enseñanza", "Cra. 53 #86-119"),
    ("la-jaula-americano", "La Jaula — Americano", "Cra. 38A #74-179"),
    ("brazuca-villa-campestre", "Brazuca Soccer", "Villa Campestre"),
    ("soccer-papiros", "Soccer Papiros", "Norte de Barranquilla"),
    ("zoccer-plaza", "Zoccer Plaza", "Calle 77 #58-53"),
    ("canchas-biffi", "Canchas Biffi", "Calle 85 con Cra. 56"),
    ("soccer-44", "Soccer 44", "Calle 44 #44-52"),
    ("combarranquilla-boston", "Combarranquilla Boston", "Unidad Boston"),
    ("combarranquilla-solinilla", "Combarranquilla Solinilla", "Centro Recreacional Solinilla"),
    ("los-tubos", "Cancha Los Tubos", "Sector Domingo Marino"),
    ("san-isidro", "Cancha San Isidro", "Barrio San Isidro"),
    ("pibe-valderrama", "Unidad Deportiva Pibe Valderrama", "Unidad Deportiva El Pibe"),
    ("malecon-del-rio", "Cancha sintética Malecón del Río", "Malecón del Río"),
    ("complejo-tivoli", "Complejo Tívoli", "Complejo Tívoli"),
    ("sagrado-corazon", "Parque Sagrado Corazón", "Parque Sagrado Corazón"),
    ("la-electrificadora", "Canchas La Electrificadora", "Parque La Electrificadora"),
    ("los-andes", "Cancha Los Andes", "Barrio Los Andes"),
    ("buena-esperanza", "Cancha Buena Esperanza", "Buena Esperanza"),
    ("mundialito", "Cancha Mundialito", "Rebolo"),
    ("lluvia-de-oro", "Parque Lluvia de Oro", "Parque Lluvia de Oro"),
    ("las-mercedes", "Cancha Las Mercedes", "Las Mercedes"),
    ("cristo-rey", "Cancha Cristo Rey", "Cristo Rey"),
    ("la-inmaculada", "Parque La Inmaculada", "Parque La Inmaculada"),
    ("altos-de-silencio", "Cancha Altos de Silencio", "Altos de Silencio"),
    ("eugenio-macias", "Cancha Eugenio Macías", "Eugenio Macías"),
    ("simon-bolivar", "Cancha Simón Bolívar", "Simón Bolívar"),
    ("parque-olivos", "Parque Olivos", "Parque Olivos"),
    ("los-suenos", "Cancha Los Sueños", "Los Sueños"),
]

FOOTBALL_KEYWORDS = re.compile(
    r"cancha|fútbol|futbol|soccer|microfutbol|microfútbol|fútbol\s*5|futbol\s*5|"
    r"fútbol\s*sala|futbol\s*sala|deportiv|sintétic|sintetic|gramilla|campo",
    re.I,
)
EXCLUDE_KEYWORDS = re.compile(
    r"estadio|coliseo|gimnasio|natación|piscina|tenis|basket|baloncesto|voleibol|"
    r"rugby|beisbol|béisbol|atletismo|skate|parque\s+recreativo\s+general|"
    r"restaurante|hotel|bar\s|discoteca|universidad|colegio\s(?!.*cancha)",
    re.I,
)


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


def token_set(text: str) -> set[str]:
    stop = {"cancha", "de", "la", "el", "los", "las", "del", "y", "en", "barranquilla", "futbol", "futbol5", "sintetica", "sintetico"}
    return {t for t in normalize(text).split() if t not in stop and len(t) > 2}


def similarity(a: str, b: str) -> float:
    ta, tb = token_set(a), token_set(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def is_duplicate(title: str, address: str, existing_name: str, existing_addr: str) -> bool:
    if similarity(title, existing_name) >= 0.55:
        return True
    if similarity(address, existing_addr) >= 0.5:
        return True
    # special cases
    pairs = [
        ("mundialito", "mundialito"),
        ("club de leones", "leones"),
        ("pibe valderrama", "pibe"),
        ("malecon", "malecon"),
        ("solinilla", "solinilla"),
        ("combarranquilla boston", "combarranquilla boston"),
        ("jaula", "jaula"),
        ("brazuca", "brazuca"),
        ("papiros", "papiros"),
        ("zoccer", "zoccer"),
        ("biffi", "biffi"),
        ("soccer 44", "soccer 44"),
        ("tivoli", "tivoli"),
        ("sagrado corazon", "sagrado corazon"),
        ("electrificadora", "electrificadora"),
        ("san isidro", "san isidro"),
        ("los tubos", "los tubos"),
    ]
    nt, ne = normalize(title), normalize(existing_name)
    for a, b in pairs:
        if a in nt and b in ne:
            return True
    return False


def infer_venue_kind(title: str, category: str, address: str) -> str:
    t = normalize(f"{title} {category} {address}")
    if any(k in t for k in ("club", "combarranquilla", "leones")):
        return "club"
    if any(k in t for k in ("parque", "unidad deportiva", "distrital", "publica", "público", "adi")):
        return "publica"
    return "alquiler"


def infer_covered(title: str, category: str, about: list | None) -> bool | None:
    t = normalize(f"{title} {category}")
    if any(k in t for k in ("techad", "cubierta", "indoor", "bajo techo")):
        return True
    if "descubiert" in t:
        return False
    return None


def infer_sports(title: str, category: str) -> list[str]:
    t = normalize(f"{title} {category}")
    sports = ["futbol"]
    if any(k in t for k in ("futbol sala", "microfutbol", "micro futbol", "futbol 5", "futsal")):
        sports.append("futbol_sala")
    return list(dict.fromkeys(sports))


def is_relevant(row: dict) -> bool:
    title = row.get("title", "")
    category = row.get("category", "") or " ".join(row.get("categories", []) or [])
    text = f"{title} {category}"
    if not FOOTBALL_KEYWORDS.search(text):
        return False
    if EXCLUDE_KEYWORDS.search(text) and not FOOTBALL_KEYWORDS.search(title):
        return False
    addr = row.get("address", "")
    if "barranquilla" not in normalize(addr) and "barranquilla" not in normalize(
        (row.get("complete_address") or {}).get("city", "")
    ):
        return False
    return True


def main():
    rows = []
    with open(RESULTS, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    seen_place_ids: set[str] = set()
    new_venues = []
    enriched = []

    for row in rows:
        pid = row.get("place_id", "")
        if pid in seen_place_ids:
            continue
        seen_place_ids.add(pid)

        if not is_relevant(row):
            continue

        title = row.get("title", "").strip()
        address = row.get("address", "") or row.get("complete_address", {}).get("street", "")
        lat = row.get("latitude")
        lng = row.get("longitude")
        if not title or lat is None or lng is None:
            continue

        borough = (row.get("complete_address") or {}).get("borough", "")
        neighborhood = borough.split(",")[0].strip() if borough else ""
        if not neighborhood:
            neighborhood = (row.get("complete_address") or {}).get("city", "Barranquilla")

        category = row.get("category", "")
        rating = row.get("review_rating")
        review_count = row.get("review_count")
        phone = row.get("phone", "")
        website = row.get("web_site", "")

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

        matched_existing = None
        for slug, name, addr in EXISTING:
            if is_duplicate(title, address, name, addr):
                matched_existing = (slug, name, addr)
                break

        venue = {
            "slug": slugify(title),
            "name": title.title() if title.isupper() else title,
            "neighborhood": neighborhood,
            "address": address,
            "lat": lat,
            "lng": lng,
            "sports": infer_sports(title, category),
            "surface": "sintetica",
            "covered": infer_covered(title, category, row.get("about")),
            "venue_kind": infer_venue_kind(title, category, address),
            "notes": notes,
            "place_id": pid,
        }

        if matched_existing:
            slug, ename, eaddr = matched_existing
            # enrich if we have better address/coords
            enrich = {"existing_slug": slug, "existing_name": ename}
            if address and len(address) > len(eaddr or ""):
                enrich["new_address"] = address
            enrich["new_lat"] = lat
            enrich["new_lng"] = lng
            if notes:
                enrich["new_notes"] = notes
            enriched.append(enrich)
        else:
            # dedupe among new
            if any(is_duplicate(title, address, v["name"], v["address"]) for v in new_venues):
                continue
            new_venues.append(venue)

    # ensure unique slugs
    used_slugs = {s for s, _, _ in EXISTING}
    for v in new_venues:
        base = v["slug"]
        i = 2
        while v["slug"] in used_slugs:
            v["slug"] = f"{base}-{i}"
            i += 1
        used_slugs.add(v["slug"])

    with open(OUT_NEW, "w", encoding="utf-8") as f:
        json.dump(new_venues, f, ensure_ascii=False, indent=2)
    with open(OUT_ENRICH, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f"Total scraped: {len(rows)}")
    print(f"Relevant unique: {len(seen_place_ids)}")
    print(f"New venues: {len(new_venues)}")
    print(f"Matched existing (enrich): {len(enriched)}")
    for v in new_venues:
        print(f"  + {v['name']} ({v['neighborhood']})")


if __name__ == "__main__":
    main()
