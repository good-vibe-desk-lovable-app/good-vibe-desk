#!/usr/bin/env python3
"""Fetch the two independently curated sources used for tower-boss evidence.

This is deliberately a small fixed source set.  Each source is stored and
fingerprinted independently so an emitted tower entry can retain both URLs;
raw HTML is local-only.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "acquisition" / "tower"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
SOURCES = {
    "palworldWiki": "https://palworld.wiki.gg/wiki/Tower",
    "game8": "https://game8.co/games/Palworld/archives/440436",
}
USER_AGENT = "good-vibe-desk-data-pipeline/1.0 (+https://github.com/good-vibe-desk-lovable-app/good-vibe-desk)"


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=40) as response:
        body = response.read().decode("utf-8", "replace")
    if len(body) < 4096:
        raise RuntimeError(f"tower source response was unexpectedly short: {url}")
    return body


def fingerprint(body: str, url: str) -> dict[str, object]:
    return {
        "url": url,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "sha256": hashlib.sha256(body.encode()).hexdigest(),
        "bytes": len(body.encode()),
        "sourceTier": 3,
        "sourceKind": "wiki-sourced",
    }


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    metadata: dict[str, dict[str, object]] = {}
    for name, url in SOURCES.items():
        body = fetch(url)
        (CACHE / f"{name}.html").write_text(body)
        metadata[name] = fingerprint(body, url)

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"schemaVersion": 1}
    manifest["schemaVersion"] = 1
    manifest.setdefault("towerSources", {})["sources"] = metadata
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"fetched {len(metadata)} independent tower sources")


if __name__ == "__main__":
    main()
