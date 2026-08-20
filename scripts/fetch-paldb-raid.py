#!/usr/bin/env python3
"""Fetch the one PalDB Summoning Altar source page for generated raid evidence.

The raw response is intentionally local-only.  Its URL, timestamp, checksum,
byte count, and displayed PalDB version are committed in `.cache-manifest.json`
so the generated module remains auditable without vendoring fetched HTML.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "acquisition"
OUT = CACHE / "raid.html"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
URL = "https://paldb.cc/en/Raid"
USER_AGENT = "good-vibe-desk-data-pipeline/1.0 (+https://github.com/good-vibe-desk-lovable-app/good-vibe-desk)"
VERSION_RE = re.compile(r'href="version"[^>]*>\s*(v[^<\s]+)\s*</a>\s*([^<\n]+)', re.IGNORECASE)
BLOCK_MARKERS = (
    "just a moment",
    "cf_chl_opt",
    "challenges.cloudflare.com",
    "enable javascript and cookies to continue",
)


def fetch() -> str:
    request = urllib.request.Request(URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=40) as response:
        body = response.read().decode("utf-8", "replace")
    preview = body[:4000].lower()
    if len(body) < 2048 or any(marker in preview for marker in BLOCK_MARKERS):
        raise RuntimeError("PalDB raid page response was blocked or unexpectedly short")
    return body


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    body = fetch()
    OUT.write_text(body)

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"schemaVersion": 1}
    stamp = VERSION_RE.search(body)
    source = {
        "url": URL,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "sha256": hashlib.sha256(body.encode()).hexdigest(),
        "bytes": len(body.encode()),
    }
    if stamp:
        source["paldbVersion"] = {"version": stamp.group(1), "date": stamp.group(2).strip()}
    manifest["schemaVersion"] = 1
    manifest.setdefault("paldb", {}).setdefault("acquisitionPages", {})["raid"] = source
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"fetched {URL} ({source['bytes']} bytes, sha256={source['sha256']})")


if __name__ == "__main__":
    main()
