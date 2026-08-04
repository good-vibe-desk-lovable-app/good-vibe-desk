#!/usr/bin/env python3
"""Downloads one paldb.cc page per Pal into scripts/.cache/paldb/.

Resumable: a page already on disk is never re-fetched, so a parser bug costs
nothing. Never parses here - fetch and cache only.
"""
import os, re, sys, time
from concurrent.futures import ThreadPoolExecutor
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".cache", "paldb")
os.makedirs(CACHE, exist_ok=True)

src = open(os.path.join(ROOT, "src/data/palworld/pals.ts")).read()
names = re.findall(r'internalName:\s*"([^"]+)"', src)
print(f"{len(names)} internal names")

BLOCK = ("just a moment", "cf_chl_opt", "challenges.cloudflare.com",
         "enable javascript and cookies to continue")

def fetch(name):
    path = os.path.join(CACHE, name + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 20000:
        return (name, "cached")
    url = f"https://paldb.cc/en/{name}"
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=40) as r:
                body = r.read().decode("utf-8", "replace")
            low = body[:4000].lower()
            if len(body) < 2048 or any(b in low for b in BLOCK):
                raise RuntimeError("challenge/short page")
            open(path, "w").write(body)
            return (name, "ok")
        except Exception as e:
            err = e
            time.sleep(1 + attempt * 2)
    return (name, f"FAIL {err}")

with ThreadPoolExecutor(max_workers=6) as ex:
    results = list(ex.map(fetch, names))

fails = [r for r in results if r[1].startswith("FAIL")]
print("ok:", sum(1 for r in results if r[1] == "ok"),
      "cached:", sum(1 for r in results if r[1] == "cached"),
      "failed:", len(fails))
for f in fails:
    print("  ", f[0], f[1])
