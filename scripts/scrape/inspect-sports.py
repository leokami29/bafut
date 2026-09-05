#!/usr/bin/env python3
"""Inspect sports scrape results."""
import json
from collections import Counter
from pathlib import Path

RESULTS = Path(__file__).parent / "gmaps-sports-results.json"
rows = []
with open(RESULTS, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            rows.append(json.loads(line))

print(f"total rows: {len(rows)}")
if rows:
    print("keys:", sorted(rows[0].keys()))
cats = Counter((r.get("category") or "") for r in rows)
print("top categories:")
for k, v in cats.most_common(40):
    print(f"  {v:3d} {k}")
print("\nsample titles:")
for r in rows[:20]:
    print(f"- {r.get('title')} | {r.get('category')} | {r.get('address')}")
