#!/usr/bin/env python3
"""Fetch the full, bounded PalDB Dungeons source set for acquisition evidence.

The crawler accepts only the exact `Dungeons /14` card and its table rows.  It
fails rather than emitting a partial cache if the indexed family count, a route,
or an upstream response changes.  Raw HTML remains local-only; reproducible
metadata belongs in `.cache-manifest.json`.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache" / "acquisition" / "dungeons"
INDEX = ROOT / "scripts" / ".cache" / "acquisition" / "dungeons.html"
MANIFEST = ROOT / "scripts" / ".cache-manifest.json"
BASE_URL = "https://paldb.cc/en/"
INDEX_URL = BASE_URL + "Dungeons"
EXPECTED_FAMILY_COUNT = 14
REQUEST_DELAY_SECONDS = 1.0
USER_AGENT = "good-vibe-desk-data-pipeline/1.0 (+https://github.com/good-vibe-desk-lovable-app/good-vibe-desk)"
VERSION_RE = re.compile(r'href="version"[^>]*>\s*(v[^<\s]+)\s*</a>\s*([^<\n]+)', re.IGNORECASE)
BLOCK_MARKERS = (
    "just a moment",
    "cf_chl_opt",
    "challenges.cloudflare.com",
    "enable javascript and cookies to continue",
)


def text(tag: Tag | None) -> str:
    return re.sub(r"\s+", " ", tag.get_text(" ", strip=True)).strip() if tag else ""


def get(url: str) -> str:
    time.sleep(REQUEST_DELAY_SECONDS)
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=40) as response:
        body = response.read().decode("utf-8", "replace")
    preview = body[:4000].lower()
    if len(body) < 2048 or any(marker in preview for marker in BLOCK_MARKERS):
        raise RuntimeError(f"blocked or short PalDB response: {url}")
    return body


def dungeons_card(soup: BeautifulSoup) -> Tag:
    heading = next(
        (
            node
            for node in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6"])
            if re.fullmatch(r"Dungeons\s*/\s*14", text(node))
        ),
        None,
    )
    if not heading:
        raise RuntimeError("PalDB Dungeons index lacks exact `Dungeons /14` heading")
    card = heading.find_parent("div", class_=lambda value: value and "card" in value)
    if not isinstance(card, Tag):
        raise RuntimeError("PalDB Dungeons /14 heading is not inside a card")
    return card


def index_rows(body: str) -> list[dict[str, object]]:
    card = dungeons_card(BeautifulSoup(body, "html5lib"))
    table = card.find("table")
    if not isinstance(table, Tag):
        raise RuntimeError("PalDB Dungeons /14 card has no table")

    entries: list[dict[str, object]] = []
    for row in table.find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        link = row.find("a", href=True)
        if len(cells) != 2 or not link:
            raise RuntimeError("PalDB Dungeons /14 table contains a non-family row")
        name, level = (text(cell) for cell in cells)
        if not name or not re.fullmatch(r"\d+", level) or not link["href"]:
            raise RuntimeError(f"invalid PalDB dungeon family row: {text(row)}")
        entries.append({"name": name, "level": int(level), "slug": link["href"]})

    if len(entries) != EXPECTED_FAMILY_COUNT:
        raise RuntimeError(f"expected {EXPECTED_FAMILY_COUNT} dungeon families, found {len(entries)}")
    return entries


def fingerprint(body: str, url: str) -> dict[str, object]:
    version = VERSION_RE.search(body)
    value: dict[str, object] = {
        "url": url,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(),
        "sha256": hashlib.sha256(body.encode()).hexdigest(),
        "bytes": len(body.encode()),
    }
    if version:
        value["paldbVersion"] = {"version": version.group(1), "date": version.group(2).strip()}
    return value


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    index_body = get(INDEX_URL)
    entries = index_rows(index_body)
    INDEX.write_text(index_body)

    pages: dict[str, dict[str, object]] = {}
    for slug in dict.fromkeys(str(entry["slug"]) for entry in entries):
        url = BASE_URL + slug
        body = get(url)
        path = CACHE / f"{slug}.html"
        path.write_text(body)
        pages[slug] = fingerprint(body, url)

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"schemaVersion": 1}
    manifest["schemaVersion"] = 1
    manifest.setdefault("paldb", {}).setdefault("acquisitionPages", {})["dungeons"] = {
        "index": fingerprint(index_body, INDEX_URL),
        "families": entries,
        "pages": pages,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"fetched {len(entries)} indexed families across {len(pages)} unique PalDB dungeon pages")


if __name__ == "__main__":
    main()
