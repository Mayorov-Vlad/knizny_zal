#!/usr/bin/env python3
"""Сборка киноархива «Книжного зала».
Источники: IMDb non-commercial datasets (названия, годы, жанры, длительность, рейтинги, русские названия)
и Wikidata (страны производства, язык оригинала, русские названия).
Результат: films/films.json — компактный список фильмов для вкладки «Кино»."""
import csv, gzip, io, json, os, sys, time, urllib.request, urllib.parse

MIN_VOTES = int(os.environ.get("MIN_VOTES", "300"))
OUT = os.path.join(os.path.dirname(__file__), "..", "films", "films.json")
UA = {"User-Agent": "knizny-zal-films/1.0 (https://github.com/Mayorov-Vlad/knizny_zal)"}
csv.field_size_limit(10**8)

def tsv(url):
    print("↓", url, flush=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=600) as r:
        with gzip.open(r, "rt", encoding="utf-8", newline="") as f:
            rd = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
            next(rd)
            yield from rd

GENRES = ["Action","Adventure","Animation","Biography","Comedy","Crime","Documentary","Drama","Family","Fantasy",
          "Film-Noir","History","Horror","Music","Musical","Mystery","Romance","Sci-Fi","Sport","Thriller","War","Western"]
GI = {g: i for i, g in enumerate(GENRES)}

# 1. рейтинги
votes = {}
for tid, avg, n in tsv("https://datasets.imdbws.com/title.ratings.tsv.gz"):
    n = int(n)
    if n >= MIN_VOTES:
        votes[tid] = (round(float(avg) * 10), n)
print("с голосами ≥", MIN_VOTES, ":", len(votes), flush=True)

# 2. фильмы
films = {}
for row in tsv("https://datasets.imdbws.com/title.basics.tsv.gz"):
    tid, ttype, primary, orig, adult, start, end, runtime, genres = row[:9]
    if ttype != "movie" or adult == "1" or tid not in votes:
        continue
    gm = 0
    for g in genres.split(","):
        if g in GI:
            gm |= 1 << GI[g]
    films[tid] = {"o": orig, "p": primary, "y": int(start) if start.isdigit() else 0,
                  "m": int(runtime) if runtime.isdigit() else 0, "g": gm, "r": votes[tid][0], "v": votes[tid][1]}
print("фильмов:", len(films), flush=True)

# 3. русские названия из IMDb (регион RU / SUHH или язык ru)
ru = {}
for row in tsv("https://datasets.imdbws.com/title.akas.tsv.gz"):
    tid, ordering, title, region, lang, types, attrs, isorig = row[:8]
    if tid not in films:
        continue
    if region in ("RU", "SUHH") or lang == "ru":
        bad = any(x in (types or "") for x in ("working", "alternative")) or "transliterated" in (attrs or "")
        score = (0 if bad else 2) + (1 if region == "RU" else 0)
        if tid not in ru or score > ru[tid][0]:
            ru[tid] = (score, title)
print("с русским названием (IMDb):", len(ru), flush=True)

# 4. Wikidata: страны, язык оригинала, русское название
def sparql(q, tries=4):
    url = "https://query.wikidata.org/sparql?format=json&query=" + urllib.parse.quote(q)
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={**UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)["results"]["bindings"]
        except Exception as e:
            print("  sparql retry", i, e, flush=True); time.sleep(10 * (i + 1))
    return []

wd = {}
ranges = [(1870, 1950)] + [(y, y + 5) for y in range(1950, 1990, 5)] + [(y, y + 2) for y in range(1990, 2031, 2)]
for a, b in ranges:
    q = f"""SELECT ?imdb (GROUP_CONCAT(DISTINCT ?cx;separator=",") AS ?c) (GROUP_CONCAT(DISTINCT ?lc;separator=",") AS ?l) (SAMPLE(?ruL) AS ?ru) WHERE {{
      ?f wdt:P345 ?imdb; wdt:P31/wdt:P279* wd:Q11424; wdt:P577 ?d.
      FILTER(YEAR(?d) >= {a} && YEAR(?d) < {b})
      OPTIONAL {{ ?f wdt:P495 ?co. OPTIONAL {{ ?co wdt:P297 ?cc. }} BIND(COALESCE(?cc, STRAFTER(STR(?co), "entity/")) AS ?cx) }}
      OPTIONAL {{ ?f wdt:P364 ?la. ?la wdt:P218 ?lc. }}
      OPTIONAL {{ ?f rdfs:label ?ruL. FILTER(LANG(?ruL)="ru") }}
    }} GROUP BY ?imdb"""
    rows = sparql(q)
    for r in rows:
        tid = r["imdb"]["value"]
        if tid in films:
            wd[tid] = (r.get("c", {}).get("value", ""), r.get("l", {}).get("value", ""), r.get("ru", {}).get("value", ""))
    print(f"wikidata {a}-{b}: {len(rows)} (итого совпало {len(wd)})", flush=True)
    time.sleep(2)

# исторические страны без ISO-кода
OLD = {"Q15180": "SU", "Q33946": "CS", "Q36704": "YU", "Q16957": "DD", "Q713750": "DE", "Q34266": "RU", "Q83286": "YU", "Q131964": "AT"}
def fix_c(c):
    out = []
    for x in c.split(","):
        x = OLD.get(x, x)
        if len(x) == 2 and x not in out:
            out.append(x)
    return ",".join(out)

# 5. сборка
out = []
for tid, f in films.items():
    c, l, wru = wd.get(tid, ("", "", ""))
    rt = ru[tid][1] if tid in ru else ""
    if not rt and wru and wru != f["o"]:
        rt = wru
    # «вышел в России» — только если у IMDb есть русское прокатное название
    out.append([int(tid[2:]), f["o"], rt if rt != f["o"] else "", f["y"], f["m"], f["g"], f["r"], f["v"], fix_c(c), l, 1 if tid in ru else 0])
out.sort(key=lambda x: -x[7])
os.makedirs(os.path.dirname(OUT), exist_ok=True)
meta = {"v": 1, "built": time.strftime("%Y-%m-%d"), "genres": GENRES, "fields": ["id", "orig", "ru", "year", "min", "genres", "rating10", "votes", "countries", "langs", "ruRelease"], "n": len(out)}
with open(OUT, "w", encoding="utf-8") as fo:
    json.dump({"meta": meta, "f": out}, fo, ensure_ascii=False, separators=(",", ":"))
print("готово:", len(out), "фильмов,", os.path.getsize(OUT) // 1024, "КБ")
