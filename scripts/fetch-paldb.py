#!/usr/bin/env python3
"""Downloads one paldb.cc page per Pal into scripts/.cache/paldb/.

URLs are built from the DISPLAY name (spaces -> underscores); the cache file is
keyed by internalName, which stays the join key everywhere else.

Resumable and chunkable:  python3 scripts/fetch-paldb.py <offset> <limit>
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".cache", "paldb")
GAPS = os.path.join(ROOT, "scripts", ".cache", "paldb-gaps.json")
os.makedirs(CACHE, exist_ok=True)

src = open(os.path.join(ROOT, "src/data/palworld/pals.ts")).read()
pairs = re.findall(r'internalName:\s*"([^"]+)",\s*name:\s*"([^"]+)"', src)
# de-dup on internalName, keep order
seen = set()
PALS = []
for internal, display in pairs:
    if internal in seen:
        continue
    seen.add(internal)
    PALS.append((internal, display))

BLOCK = ("just a moment", "cf_chl_opt", "challenges.cloudflare.com",
         "enable javascript and cookies to continue")


def candidates(display):
    slug = display.replace(" ", "_")
    yield "https://paldb.cc/en/" + slug
    enc = urllib.parse.quote(slug, safe="_")
    if enc != slug:
        yield "https://paldb.cc/en/" + enc


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read().decode("utf-8", "replace")
    low = body[:4000].lower()
    if len(body) < 2048 or any(b in low for b in BLOCK):
        raise RuntimeError("challenge/short page")
    return body


def fetch(item):
    internal, display = item
    path = os.path.join(CACHE, internal + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return (internal, "cached", None)
    tried = []
    for url in candidates(display):
        for attempt in range(3):
            try:
                body = get(url)
                open(path, "w").write(body)
                return (internal, "ok", None)
            except Exception as e:  # noqa: BLE001
                err = f"{url} -> {e}"
                if "404" in str(e):
                    break
                time.sleep(1 + attempt * 2)
        tried.append(err)
    return (internal, "FAIL", {"internalName": internal, "displayName": display, "tried": tried})


offset = int(sys.argv[1]) if len(sys.argv) > 1 else 0
limit = int(sys.argv[2]) if len(sys.argv) > 2 else len(PALS)
batch = PALS[offset:offset + limit]

with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(fetch, batch))

gaps = []
if os.path.exists(GAPS):
    gaps = json.load(open(GAPS))
gaps = [g for g in gaps if g["internalName"] not in {r[0] for r in results}]
gaps += [r[2] for r in results if r[2]]
json.dump(gaps, open(GAPS, "w"), indent=2)

total_cached = len([f for f in os.listdir(CACHE) if f.endswith(".html")])
print(f"batch {offset}-{offset+len(batch)}: ok={sum(1 for r in results if r[1]=='ok')} "
      f"cached={sum(1 for r in results if r[1]=='cached')} "
      f"failed={sum(1 for r in results if r[1]=='FAIL')} | "
      f"{total_cached}/{len(PALS)} on disk")
for r in results:
    if r[1] == "FAIL":
        print("  FAIL", r[0], r[2]["displayName"])
