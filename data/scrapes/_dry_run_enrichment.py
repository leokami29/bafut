#!/usr/bin/env python3
"""Dry-run: show how enrichment would update existing BaFut venues. Does NOT write to DB."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
enrichment = json.loads(
    (ROOT / "data/scrapes/2026-09-02-canchas-enrichment-barranquilla.json").read_text(encoding="utf-8")
)

matched = [v for v in enrichment["venues"] if v.get("matched_existing_slug")]
print(f"Would enrich {len(matched)} existing venues (dry-run, no DB writes)")
print("Suggested SQL shape (do not auto-run):")
print("-- update venues set phone=..., website=..., rating=..., notes=<json> where slug=...;")
for v in matched[:8]:
    n = v["notes"]
    print(
        f"- {v['matched_existing_slug']}: rating={n.get('rating')} reviews={len(n.get('reviews') or [])} "
        f"phone={v.get('phone')} images={len(n.get('images') or [])}"
    )
print(f"... and {max(0, len(matched)-8)} more")
