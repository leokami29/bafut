#!/usr/bin/env python3
"""Normalize Google Maps scrape into BaFut venue enrichment + public candidates."""
from __future__ import annotations

import csv
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path("/mnt/c/EstudioALL/2026/BaFut")
SCRAPES = ROOT / "data" / "scrapes"
SEED = ROOT / "supabase" / "seed.sql"
MAX_REVIEWS = 15


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:80] or "venue"


def load_json_items(path: Path) -> list[dict]:
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        return []
    if raw.startswith("["):
        return json.loads(raw)
    items = []
    for line in raw.splitlines():
        line = line.strip()
        if line:
            items.append(json.loads(line))
    return items


def parse_existing_venues() -> list[dict]:
    text = SEED.read_text(encoding="utf-8")
    rows = []
    # Capture slug,name,neighborhood,address,lat,lng,...surface,covered,venue_kind
    pattern = re.compile(
        r"\(\s*'([^']+)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,"
        r"\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,"
        r".*?,\s*'([^']+)'\s*,\s*(?:true|false|null)::(?:boolean)?\s*,\s*'([^']+)'\s*,",
        re.S,
    )
    for m in pattern.finditer(text):
        rows.append(
            {
                "slug": m.group(1),
                "name": m.group(2).replace("\\'", "'"),
                "neighborhood": m.group(3).replace("\\'", "'"),
                "address": m.group(4).replace("\\'", "'"),
                "lat": float(m.group(5)),
                "lng": float(m.group(6)),
                "surface": m.group(7),
                "venue_kind": m.group(8),
            }
        )
    # Fallback simpler pattern for rows without ::boolean cast
    if len(rows) < 20:
        rows = []
        pattern2 = re.compile(
            r"\(\s*'([^']+)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,\s*'((?:\\'|[^'])*)'\s*,"
            r"\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,"
            r".*?array\[[^\]]*\]::text\[]\s*,\s*'([^']+)'\s*,\s*(true|false|null)(?:::boolean)?\s*,\s*'([^']+)'\s*,",
            re.S,
        )
        for m in pattern2.finditer(text):
            rows.append(
                {
                    "slug": m.group(1),
                    "name": m.group(2).replace("\\'", "'"),
                    "neighborhood": m.group(3).replace("\\'", "'"),
                    "address": m.group(4).replace("\\'", "'"),
                    "lat": float(m.group(5)),
                    "lng": float(m.group(6)),
                    "surface": m.group(7),
                    "venue_kind": m.group(9),
                }
            )
    return rows


def extract_images(images) -> list[str]:
    out: list[str] = []
    if not images:
        return out
    if isinstance(images, list):
        for item in images:
            if isinstance(item, str) and item.startswith("http"):
                out.append(item)
            elif isinstance(item, dict):
                url = item.get("image") or item.get("url") or item.get("src")
                if isinstance(url, str) and url.startswith("http"):
                    out.append(url)
    return out[:8]


PRIVATE_HINTS = re.compile(
    r"\b(alquiler|academy|academia|club|sas|\bfc\b|soccer house|la jaula|brazuca|zoccer|papiros|combarranquilla|padel|sports bar)\b",
    re.I,
)
PUBLIC_HINTS = re.compile(
    r"\b(parque|polideportivo|distrital|alcald[ií]a|p[uú]blic|todos al parque|unidad deportiva|malecon|malec[oó]n|athletic park|city park)\b",
    re.I,
)


def classify_public(item: dict) -> tuple[str, str]:
    blob = " ".join(
        str(x or "")
        for x in [
            item.get("title"),
            item.get("category"),
            item.get("description"),
            item.get("address"),
            " ".join(item.get("categories") or []),
        ]
    )
    if PRIVATE_HINTS.search(blob):
        # Club/academy almost never free district courts
        if PUBLIC_HINTS.search(blob) and re.search(r"\b(parque|polideportivo|unidad deportiva|athletic park)\b", blob, re.I):
            return "dudosa", "medium"
        return "privada", "high"
    if PUBLIC_HINTS.search(blob):
        return "publica", "high"
    cats = " ".join(item.get("categories") or []) + " " + str(item.get("category") or "")
    if re.search(r"athletic park|city park|recreation center|park\b", cats, re.I):
        return "publica", "medium"
    return "dudosa", "low"


def normalize_hours(open_hours) -> str | None:
    if not open_hours:
        return None
    if isinstance(open_hours, str):
        return open_hours.strip() or None
    if isinstance(open_hours, dict):
        parts = []
        for day, hours in open_hours.items():
            if isinstance(hours, list):
                hours = ", ".join(str(h) for h in hours)
            parts.append(f"{day}: {hours}")
        return "; ".join(parts) if parts else None
    if isinstance(open_hours, list):
        return "; ".join(str(x) for x in open_hours)
    return str(open_hours)


def normalize_reviews(item: dict) -> list[dict]:
    raw = item.get("user_reviews_extended") or item.get("user_reviews") or []
    out = []
    if not isinstance(raw, list):
        return out
    for r in raw[:MAX_REVIEWS]:
        if isinstance(r, str):
            out.append(
                {
                    "author": None,
                    "rating": None,
                    "text": r.strip(),
                    "date": None,
                    "ownerResponse": None,
                }
            )
            continue
        if not isinstance(r, dict):
            continue
        text = (
            r.get("Description")
            or r.get("description")
            or r.get("text")
            or r.get("snippet")
            or r.get("review")
            or ""
        )
        out.append(
            {
                "author": r.get("Name") or r.get("name") or r.get("author") or r.get("reviewerName"),
                "rating": r.get("Rating") or r.get("rating") or r.get("stars"),
                "text": str(text).strip() if text else None,
                "date": r.get("When") or r.get("date") or r.get("publishedAtDate") or r.get("relative_date"),
                "ownerResponse": r.get("OwnerResponse")
                or r.get("ownerResponse")
                or r.get("owner_response"),
            }
        )
    return [r for r in out if r.get("text")]


def haversine_m(lat1, lon1, lat2, lon2) -> float:
    from math import asin, cos, radians, sin, sqrt

    r = 6371000
    p1, p2 = radians(lat1), radians(lat2)
    dphi = radians(lat2 - lat1)
    dl = radians(lon2 - lon1)
    a = sin(dphi / 2) ** 2 + cos(p1) * cos(p2) * sin(dl / 2) ** 2
    return 2 * r * asin(sqrt(a))


def match_existing(item: dict, existing: list[dict]) -> dict | None:
    lat = item.get("latitude")
    lng = item.get("longitude") or item.get("longtitude")
    title = (item.get("title") or "").lower()
    best = None
    best_score = 1e18
    for v in existing:
        dist = 1e9
        if lat is not None and lng is not None:
            dist = haversine_m(float(lat), float(lng), v["lat"], v["lng"])
        name_hit = v["name"].lower() in title or title in v["name"].lower() or slugify(v["name"]) in slugify(title)
        if dist < 120 or (name_hit and dist < 400) or (name_hit and dist > 1e8):
            score = dist if dist < 1e8 else 500
            if name_hit:
                score *= 0.5
            if score < best_score:
                best_score = score
                best = {**v, "match_distance_m": round(dist) if dist < 1e8 else None}
    return best


def infer_sports(item: dict) -> list[str]:
    blob = " ".join(
        [
            str(item.get("title") or ""),
            str(item.get("category") or ""),
            " ".join(item.get("categories") or []),
            str(item.get("description") or ""),
        ]
    ).lower()
    sports = []
    if re.search(r"f[uú]tbol sala|futsal|microf[uú]tbol", blob):
        sports.append("futbol_sala")
    if re.search(r"f[uú]tbol|soccer|campo de f", blob) and "sala" not in blob:
        sports.append("futbol")
    if re.search(r"basquet|básquet|basket", blob):
        sports.append("basquet")
    if re.search(r"voleibol|volleyball", blob):
        sports.append("voleibol")
    if re.search(r"p[aá]del|padel", blob):
        sports.append("padel")
    if not sports:
        sports = ["futbol"]
    return list(dict.fromkeys(sports))


def infer_surface(item: dict, sports: list[str]) -> str:
    blob = " ".join([str(item.get("title") or ""), str(item.get("description") or "")]).lower()
    if "sint" in blob:
        return "sintetica"
    if "grama" in blob or "césped" in blob or "cesped" in blob:
        return "grama"
    if "basquet" in sports or "voleibol" in sports:
        return "cemento"
    return "sintetica"


def neighborhood_from_address(address: str | None, complete: dict | None) -> str | None:
    if isinstance(complete, dict):
        for key in ("neighborhood", "borough", "suburb", "city"):
            if complete.get(key):
                return str(complete[key])
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    # Prefer segment that is not city/dept
    for p in parts:
        if re.search(r"barranquilla|atl[aá]ntico|colombia", p, re.I):
            continue
        if re.match(r"^(cra|cl|calle|carrera|av|diagonal|transversal)\b", p, re.I):
            continue
        return p
    return parts[1] if len(parts) > 1 else None


def main() -> None:
    src = SCRAPES / "2026-09-02-gmaps-multisport-partial.json"
    items = load_json_items(src)
    existing = parse_existing_venues()
    print("existing_venues", len(existing), "scraped", len(items))

    # Peek one review structure
    for it in items:
        ur = it.get("user_reviews_extended") or it.get("user_reviews")
        if isinstance(ur, list) and ur:
            print("review_sample_keys", list(ur[0].keys()) if isinstance(ur[0], dict) else type(ur[0]).__name__)
            print("review_sample", json.dumps(ur[0], ensure_ascii=False)[:400])
            print("open_hours_sample", it.get("open_hours"))
            break

    enriched = []
    public_candidates = []
    duplicates = []
    total_reviews = 0

    seen_place = set()
    for item in items:
        pid = item.get("place_id") or item.get("cid") or item.get("link")
        if pid in seen_place:
            continue
        seen_place.add(pid)

        lat = item.get("latitude")
        lng = item.get("longitude") or item.get("longtitude")
        if lat is None or lng is None:
            continue

        conf_kind, confidence = classify_public(item)
        sports = infer_sports(item)
        matched = match_existing(item, existing)
        reviews = normalize_reviews(item)
        total_reviews += len(reviews)
        images = extract_images(item.get("images"))
        thumb = item.get("thumbnail")
        if isinstance(thumb, str) and thumb.startswith("http") and thumb not in images:
            images = [thumb, *images][:8]

        row = {
            "name": item.get("title"),
            "slug": matched["slug"] if matched else slugify(item.get("title") or "venue"),
            "address": item.get("address"),
            "neighborhood": neighborhood_from_address(item.get("address"), item.get("complete_address")),
            "lat": float(lat),
            "lng": float(lng),
            "sports": sports,
            "venue_kind": (
                matched["venue_kind"]
                if matched and matched.get("venue_kind") in {"publica", "alquiler", "club"}
                else ("publica" if conf_kind == "publica" else ("alquiler" if conf_kind == "privada" else "publica"))
            ),
            "surface": infer_surface(item, sports),
            "covered": None,
            "phone": item.get("phone"),
            "website": item.get("web_site") or item.get("website"),
            "notes": {
                "source": "google",
                "place_id": item.get("place_id"),
                "category": item.get("category"),
                "categories": item.get("categories"),
                "status": item.get("status"),
                "description": item.get("description"),
                "rating": item.get("review_rating"),
                "review_count": item.get("review_count"),
                "hours": normalize_hours(item.get("open_hours")),
                "images": images,
                "thumbnail": item.get("thumbnail"),
                "maps_url": item.get("link"),
                "reviews": reviews,
                "confidence": confidence,
                "public_guess": conf_kind,
            },
            "source": "google_maps_scraper",
            "confidence": confidence,
            "matched_existing_slug": matched["slug"] if matched else None,
            "match_distance_m": matched.get("match_distance_m") if matched else None,
            "existing_venue_kind": matched.get("venue_kind") if matched else None,
        }

        # Prefer existing venue_kind when matched and valid
        if matched and matched.get("venue_kind") in {"publica", "alquiler", "club"}:
            row["venue_kind"] = matched["venue_kind"]

        enriched.append(row)
        if matched:
            duplicates.append(
                {
                    "scraped": row["name"],
                    "existing_slug": matched["slug"],
                    "existing_name": matched["name"],
                    "distance_m": matched.get("match_distance_m"),
                }
            )
        if conf_kind == "publica" or (matched and matched.get("venue_kind") == "publica"):
            public_candidates.append(row)

    out_all = SCRAPES / "2026-09-02-canchas-enrichment-barranquilla.json"
    out_public = SCRAPES / "2026-09-02-canchas-publicas-barranquilla.json"
    out_csv = SCRAPES / "2026-09-02-canchas-publicas-barranquilla.csv"
    meta = {
        "generated_at": "2026-09-02",
        "source_file": str(src.name),
        "total_scraped_unique": len(enriched),
        "total_reviews_kept": total_reviews,
        "max_reviews_per_venue": MAX_REVIEWS,
        "matched_existing": len(duplicates),
        "public_candidates": len(public_candidates),
        "apify": None,
        "notes": "Reviews from local gosom scraper (user_reviews). Extra-reviews crawl may expand later.",
    }

    out_all.write_text(
        json.dumps({"meta": meta, "venues": enriched}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    out_public.write_text(
        json.dumps({"meta": meta, "venues": public_candidates, "duplicates": duplicates}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    with out_csv.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "name",
                "slug",
                "neighborhood",
                "address",
                "lat",
                "lng",
                "venue_kind",
                "phone",
                "website",
                "rating",
                "review_count",
                "reviews_kept",
                "confidence",
                "public_guess",
                "matched_existing_slug",
            ],
        )
        w.writeheader()
        for v in public_candidates:
            n = v["notes"]
            w.writerow(
                {
                    "name": v["name"],
                    "slug": v["slug"],
                    "neighborhood": v["neighborhood"],
                    "address": v["address"],
                    "lat": v["lat"],
                    "lng": v["lng"],
                    "venue_kind": v["venue_kind"],
                    "phone": v["phone"],
                    "website": v["website"],
                    "rating": n.get("rating"),
                    "review_count": n.get("review_count"),
                    "reviews_kept": len(n.get("reviews") or []),
                    "confidence": v["confidence"],
                    "public_guess": n.get("public_guess"),
                    "matched_existing_slug": v.get("matched_existing_slug"),
                }
            )

    print("wrote", out_all)
    print("wrote", out_public)
    print("wrote", out_csv)
    print("meta", json.dumps(meta))
    # Preview up to 20 public
    for v in public_candidates[:20]:
        n = v["notes"]
        print(
            "PREVIEW|",
            v["name"],
            "|",
            v.get("neighborhood"),
            "|",
            n.get("rating"),
            "|",
            v.get("phone"),
            "|",
            n.get("public_guess"),
            "|reviews",
            len(n.get("reviews") or []),
        )


if __name__ == "__main__":
    main()
