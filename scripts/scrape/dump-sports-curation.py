#!/usr/bin/env python3
"""Dump candidate venues with coords for manual curation."""
from __future__ import annotations
import json
from pathlib import Path

new = json.loads((Path(__file__).parent / "venues-sports-new.json").read_text(encoding="utf-8"))
enr = json.loads((Path(__file__).parent / "venues-sports-enriched.json").read_text(encoding="utf-8"))

print("=== ENRICH ===")
for e in enr:
    print(f"{e['existing_slug']}: +{e['add_sports']} <- {e['scraped_name']} score={e['match_score']} dist={e['distance_m']}m")
    print(f"  addr={e.get('new_address')}")
    print(f"  notes={e.get('new_notes')}")

print("\n=== NEW (detail) ===")
for v in new:
    print(f"{v['slug']}: {v['name']} | {v['sports']} | {v['neighborhood']}")
    print(f"  {v['lat']},{v['lng']} | {v.get('category')} | {v.get('notes')}")
    print(f"  {v['address']}")
