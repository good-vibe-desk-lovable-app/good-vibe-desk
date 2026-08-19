#!/usr/bin/env python3
"""Fetch one PalDB page per Pal into ``scripts/.cache/paldb``.

URLs are built from display names, while cached files and all downstream joins use
``internalName``. Fetching uses at most two rate-limited workers. The HTML
cache remains local-only; ``scripts/.cache-manifest.json`` records reproducible
provenance without committing fetched pages.

Usage: ``python3 scripts/fetch-paldb.py [offset] [limit]``
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "paldb"
GAPS = ROOT / "scripts" / ".cache" / "paldb-gaps.json"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
PALS_FILE = ROOT / "src" / "data" / "palworld" / "pals.ts"
MAX_WORKERS = 2
REQUEST_DELAY_SECONDS = 1.0
USER_AGENT = "good-vibe-desk-data-pipeline/1.0 (+https://github.com/good-vibe-desk-lovable-app/good-vibe-desk)"
BLOCK = (
    "just a moment",
    "cf_chl_opt",
    "challenges.cloudflare.com",
    "enable javascript and cookies to continue",
)
VERSION_RE = re.compile(
    r'href="version"[^>]*>\s*(v[^<\s]+)\s*</a>\s*([^<\n]+)', re.IGNORECASE
)


def pals() -> list[tuple[str, str]]:
    source = PALS_FILE.read_text()
    pairs = re.findall(r'internalName:\s*"([^"]+)",\s*name:\s*"([^"]+)"', source)
    seen: set[str] = set()
    return [(internal, display) for internal, display in pairs if not (internal in seen or seen.add(internal))]


def candidates(display: str):
    slug = display.replace(" ", "_")
    yield "https://paldb.cc/en/" + slug
    encoded = urllib.parse.quote(slug, safe="_")
    if encoded != slug:
        yield "https://paldb.cc/en/" + encoded


def get(url: str) -> tuple[str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=40) as response:
        body = response.read().decode("utf-8", "replace")
        final_url = response.geturl()
    preview = body[:4000].lower()
    if len(body) < 2048 or any(marker in preview for marker in BLOCK):
        raise RuntimeError("blocked-or-short-response")
    return body, final_url


def page_version(body: str) -> dict[str, str] | None:
    match = VERSION_RE.search(body)
    if not match:
        return None
    return {"version": match.group(1), "date": match.group(2).strip()}


def load_manifest() -> dict:
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text())
    return {"schemaVersion": 1, "paldb": {"pages": {}}}


def fingerprint(path: Path, url: str) -> dict:
    body = path.read_bytes()
    fetched_at = dt.datetime.fromtimestamp(path.stat().st_mtime, dt.timezone.utc).replace(microsecond=0).isoformat()
    stamp = page_version(body.decode("utf-8", "replace"))
    result = {
        "url": url,
        "fetchedAt": fetched_at,
        "sha256": hashlib.sha256(body).hexdigest(),
        "bytes": len(body),
    }
    if stamp:
        result["paldbVersion"] = stamp
    return result


def fetch(internal: str, display: str) -> tuple[str, str, dict | None]:
    path = CACHE / f"{internal}.html"
    if path.exists() and path.stat().st_size > 20_000:
        return internal, "cached", fingerprint(path, next(candidates(display)))

    failures: list[dict[str, str]] = []
    for url in candidates(display):
        for attempt in range(3):
            time.sleep(REQUEST_DELAY_SECONDS)
            try:
                body, final_url = get(url)
                path.write_text(body)
                return internal, "fetched", fingerprint(path, final_url)
            except urllib.error.HTTPError as error:
                failures.append({"url": url, "error": f"HTTP {error.code}"})
                if error.code == 404:
                    break
            except Exception as error:  # noqa: BLE001 - record upstream failures verbatim
                failures.append({"url": url, "error": str(error)})
            time.sleep(1 + attempt * 2)
    return internal, "failed", {
        "internalName": internal,
        "displayName": display,
        "field": "page",
        "reason": "fetch failed; no page was available to parse",
        "attempts": failures,
    }


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    all_pals = pals()
    offset = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else len(all_pals)
    batch = all_pals[offset : offset + limit]

    # Two workers with a delay cap upstream load while avoiding the old six-way
    # burst that could turn a challenge page into apparently missing data.
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = list(executor.map(lambda item: fetch(*item), batch))

    existing_gaps = json.loads(GAPS.read_text()) if GAPS.exists() else []
    processed = {internal for internal, _, _ in results}
    gaps = [gap for gap in existing_gaps if gap.get("internalName") not in processed]
    gaps.extend(result for _, status, result in results if status == "failed" and result)
    GAPS.write_text(json.dumps(gaps, indent=2, sort_keys=True) + "\n")

    manifest = load_manifest()
    manifest["schemaVersion"] = 1
    paldb = manifest.setdefault("paldb", {"pages": {}})
    pages = paldb.setdefault("pages", {})
    for internal, status, result in results:
        if status != "failed" and result:
            pages[internal] = result
    stamps = [page.get("paldbVersion") for page in pages.values() if page.get("paldbVersion")]
    if stamps:
        paldb["displayedVersion"] = stamps[-1]
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

    print(
        f"batch {offset}-{offset + len(batch)}: fetched={sum(status == 'fetched' for _, status, _ in results)} "
        f"cached={sum(status == 'cached' for _, status, _ in results)} "
        f"failed={sum(status == 'failed' for _, status, _ in results)} | "
        f"{len(list(CACHE.glob('*.html')))}/{len(all_pals)} on disk"
    )
    for internal, status, result in results:
        if status == "failed":
            print(f"  FETCH FAILED {internal}: {result['displayName']}")


if __name__ == "__main__":
    main()
