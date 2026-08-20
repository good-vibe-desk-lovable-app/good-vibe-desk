#!/usr/bin/env python3
"""Audit cached PalDB pages for required bounded source sections.

This intentionally does not run from ``npm run build``: Cloudflare Workers
Builds do not receive ``scripts/.cache/paldb`` or a Python runtime. Run
``npm run data:check`` locally after refreshing the cache. Deploy builds use
``check-paldb-coverage.mjs`` to verify the checked-in generated-data contract.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

from bs4 import BeautifulSoup

# The build checker imports the parser only for validation; never leave a
# repository-local __pycache__ artifact behind as a side effect.
sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parent.parent
PARSER = ROOT / "scripts" / "parse-paldb.py"

spec = importlib.util.spec_from_file_location("parse_paldb", PARSER)
if spec is None or spec.loader is None:
    raise SystemExit(f"could not load {PARSER}")
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)

checked = 0
for internal, _display in parser.pals():
    path = parser.CACHE / f"{internal}.html"
    if not path.exists():
        raise SystemExit(f"cached PalDB page missing: {internal}")
    soup = BeautifulSoup(path.read_text(errors="replace"), "html5lib")
    parser.validate_required_sections(soup, internal)
    checked += 1

print(f"[check-paldb-sections] verified required bounded sections for {checked} cached PalDB pages")
