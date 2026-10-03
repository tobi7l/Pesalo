"""Extrae los productos de Argentina de la exportacion completa de Open Food Facts.

Lee en streaming el CSV oficial (~1.3 GB comprimido) sin guardarlo en disco, se
queda solo con las filas que figuran en Argentina y que tienen kcal/macros por
100 g completos y coherentes, y escribe scripts/off_ar.jsonl ordenado por
popularidad (cantidad de escaneos).

Uso: python3 scripts/fetch_off_ar.py
Despues: python3 scripts/build_ar_products.py
"""
import gzip
import json
import os
import sys
import urllib.request

URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
UA = "Pesalo/1.0 (github.com/tobi7l/Pesalo)"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "off_ar.jsonl")


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def compact(row, col):
    def get(name):
        i = col.get(name)
        return row[i].strip() if i is not None and i < len(row) else ""

    name = get("product_name")
    brand = get("brands").split(",")[0].strip()
    code = get("code")
    if len(name) < 2 or not code.isdigit() or name.replace(" ", "").isdigit():
        return None
    kcal = num(get("energy-kcal_100g"))
    if kcal is None:
        kj = num(get("energy_100g"))
        kcal = kj / 4.184 if kj is not None else None
    p, c, f = num(get("proteins_100g")), num(get("carbohydrates_100g")), num(get("fat_100g"))
    if None in (kcal, p, c, f):
        return None
    if not (0 <= kcal <= 900) or any(not (0 <= x <= 100) for x in (p, c, f)) or p + c + f > 105:
        return None
    expected = 4 * p + 4 * c + 9 * f
    if kcal > 20 and abs(kcal - expected) > max(40, 0.35 * expected):
        return None
    tags = [t for t in get("countries_tags").split(",") if t]
    return {
        "c": code, "nc": len(tags), "sc": int(num(get("unique_scans_n")) or 0),
        "n": name, "b": brand, "k": round(kcal), "p": round(p, 1), "h": round(c, 1), "f": round(f, 1),
    }


def main():
    req = urllib.request.Request(URL, headers={"User-Agent": UA})
    kept, seen_ar, rows = [], 0, 0
    with urllib.request.urlopen(req, timeout=120) as resp:
        gz = gzip.GzipFile(fileobj=resp)
        header = gz.readline().decode("utf-8", "replace").rstrip("\n").split("\t")
        col = {name: i for i, name in enumerate(header)}
        needed = ("code", "product_name", "brands", "countries_tags", "proteins_100g")
        missing = [n for n in needed if n not in col]
        if missing:
            print("faltan columnas:", missing, flush=True)
            sys.exit(1)
        for raw in gz:
            rows += 1
            if rows % 500000 == 0:
                print(f"filas leidas={rows} argentina={seen_ar} guardados={len(kept)}", flush=True)
            if b"en:argentina" not in raw:
                continue
            row = raw.decode("utf-8", "replace").rstrip("\n").split("\t")
            tags = row[col["countries_tags"]] if col["countries_tags"] < len(row) else ""
            if "en:argentina" not in tags.split(","):
                continue
            seen_ar += 1
            item = compact(row, col)
            if item:
                kept.append(item)

    kept.sort(key=lambda x: -x["sc"])
    with open(OUT, "w", encoding="utf-8") as fh:
        for item in kept:
            fh.write(json.dumps(item, ensure_ascii=False) + "\n")
    print(f"LISTO filas={rows} argentina={seen_ar} guardados={len(kept)} -> {OUT}", flush=True)


if __name__ == "__main__":
    main()
