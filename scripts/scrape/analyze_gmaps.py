#!/usr/bin/env python3
import json
from pathlib import Path

p = Path("/mnt/c/EstudioALL/2026/BaFut/data/scrapes/2026-09-02-gmaps-multisport-partial.json")
raw = p.read_text(encoding="utf-8").strip()
items = []
if raw.startswith("["):
    items = json.loads(raw)
else:
    for line in raw.splitlines():
        line = line.strip()
        if line:
            items.append(json.loads(line))
print("count", len(items))
if not items:
    raise SystemExit(0)
k = sorted(items[0].keys())
print("keys", k)
print("sample_title", items[0].get("title"))
print("has_user_reviews", "user_reviews" in items[0], "user_reviews_extended" in items[0])
ur = items[0].get("user_reviews") or items[0].get("user_reviews_extended")
print("reviews_type", type(ur).__name__, "len", (len(ur) if isinstance(ur, list) else ur))
print("review_count", items[0].get("review_count"), "rating", items[0].get("review_rating"))
with_phone = sum(1 for i in items if i.get("phone"))
with_web = sum(1 for i in items if i.get("website"))
with_hours = sum(1 for i in items if i.get("open_hours"))
with_images = sum(1 for i in items if i.get("images"))
print("with_phone", with_phone, "with_web", with_web, "with_hours", with_hours, "with_images", with_images)
