#!/usr/bin/env python3
"""Fetch the published PalCalc game-data export into the local generation cache.

The cache itself is deliberately untracked. The companion cache manifest is
tracked so a regeneration has an auditable source URL, retrieval time, revision,
and SHA-256 without committing redistributed game-derived JSON.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
OUT = CACHE / "palcalc-db.json"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
DB_URL = "https://raw.githubusercontent.com/tylercamp/palcalc/main/PalCalc.Model/db.json"
API_URL = "https://api.github.com/repos/tylercamp/palcalc/commits/main"
USER_AGENT = "good-vibe-desk-data-pipeline/1.0 (+https://github.com/good-vibe-desk-lovable-app/good-vibe-desk)"


def get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def load_manifest() -> dict:
    if not MANIFEST.exists():
        return {"schemaVersion": 1, "paldb": {"pages": {}}}
    return json.loads(MANIFEST.read_text())


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    body = get(DB_URL)
    data = json.loads(body)
    if not isinstance(data.get("Pals"), list) or not isinstance(data.get("Version"), str):
        raise RuntimeError("PalCalc response is not a recognized db.json export")

    commit = json.loads(get(API_URL))
    fetched_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    OUT.write_bytes(body)

    manifest = load_manifest()
    manifest["schemaVersion"] = 1
    manifest["palcalc"] = {
        "url": DB_URL,
        "fetchedAt": fetched_at,
        "sha256": hashlib.sha256(body).hexdigest(),
        "dbVersion": data["Version"],
        "palCount": len(data["Pals"]),
        "repositoryRevision": commit.get("sha"),
        "repositoryCommitAt": commit.get("commit", {}).get("author", {}).get("date"),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"fetched PalCalc db {data['Version']}: {len(data['Pals'])} Pals")
    print(f"sha256 {manifest['palcalc']['sha256']}")


if __name__ == "__main__":
    main()
