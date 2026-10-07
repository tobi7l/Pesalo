"""Arma data/ar-products.json a partir del jsonl que genera fetch_off_ar.py.

Uso: python3 scripts/build_ar_products.py [ruta/off_ar.jsonl]
Se queda con productos de la region: codigo de barras de Argentina o de paises
vecinos que exportan mucho al pais (Chile, Uruguay, Paraguay, Brasil, etc.), o
productos que figuran unicamente en Argentina. Descarta los globales con codigos
de otros continentes. Deduplica por codigo de barras y por (nombre, marca),
conservando el orden (popularidad, de mas a menos escaneado).
"""
import json
import os
import sys

# Productos descartados a mano (datos dudosos); no vuelven al regenerar la base.
EXCLUDE_CODES = set(['77965233', '7798044150777'])

REGION_PREFIXES = ("773", "775", "777", "778", "779", "780", "784", "786", "789", "790")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "off_ar.jsonl")
OUT = os.path.join(HERE, "..", "data", "ar-products.json")

seen_codes = set()
seen_names = set()
items = []

with open(SRC, encoding="utf-8") as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        p = json.loads(line)
        if not (p["c"].startswith(REGION_PREFIXES) or p.get("nc", 99) == 1):
            continue
        key = (p["n"].lower(), p["b"].lower())
        if p["c"] in EXCLUDE_CODES or p["c"] in seen_codes or key in seen_names:
            continue
        seen_codes.add(p["c"])
        seen_names.add(key)
        items.append([p["c"], p["n"], p["b"], p["k"], p["p"], p["h"], p["f"]])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump({"v": 1, "source": "Open Food Facts (ODbL)", "items": items}, fh, ensure_ascii=False, separators=(",", ":"))

print(f"{len(items)} productos -> {os.path.abspath(OUT)} ({os.path.getsize(OUT) / 1024:.0f} KB)")
