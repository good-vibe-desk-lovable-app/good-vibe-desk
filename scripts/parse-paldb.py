#!/usr/bin/env python3
"""Parses cached paldb.cc pages into scripts/.cache/paldb-parsed.json.

Join key is internalName. Nothing here guesses: a field that cannot be found is
omitted and recorded in the gaps list.
"""
import html as htmllib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".cache", "paldb")
OUT = os.path.join(ROOT, "scripts", ".cache", "paldb-parsed.json")

src = open(os.path.join(ROOT, "src/data/palworld/pals.ts")).read()
pairs = re.findall(r'internalName:\s*"([^"]+)",\s*name:\s*"([^"]+)"', src)
seen, PALS = set(), []
for internal, display in pairs:
    if internal not in seen:
        seen.add(internal)
        PALS.append((internal, display))


def text(s):
    s = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", " ", s)
    s = htmllib.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


ROW = re.compile(
    r'<div class="d-flex justify-content-between[^"]*">(.*?)</div>\s*</div>', re.S)


def kv_pairs(h):
    out = {}
    for m in re.finditer(
        r'<div class="d-flex justify-content-between p-2 align-items-center border-bottom">(.*?)(?=<div class="d-flex justify-content-between|</div>\s*</div>\s*</div>)',
        h, re.S,
    ):
        chunk = m.group(1)
        divs = re.findall(r"<div[^>]*>(.*?)</div>", chunk, re.S)
        parts = [text(d) for d in divs if text(d)]
        if len(parts) >= 2:
            out.setdefault(parts[0], parts[-1])
    return out


def others_table(h):
    out = {}
    i = h.find("Others")
    if i < 0:
        return out
    seg = h[i:i + 20000]
    for m in re.finditer(r"<t[dh][^>]*>(.*?)(?=<t[dh]|</tr>)", seg, re.S):
        pass
    rows = re.findall(r"<tr[^>]*>(.*?)(?=<tr|</table>)", seg, re.S)
    for r in rows:
        cells = [text(c) for c in re.findall(r"<td[^>]*>(.*?)(?=<td|</tr>|$)", r, re.S)]
        cells = [c for c in cells if c]
        if len(cells) >= 2:
            out.setdefault(cells[0], cells[1])
    return out


def num(v):
    if v is None:
        return None
    m = re.search(r"-?\d+(?:\.\d+)?", v.replace(",", ""))
    return float(m.group(0)) if m else None


def parse_work(h):
    out = []
    for m in re.finditer(
        r'<div><a href="([A-Za-z_]+)"><img[^>]*T_icon_palwork_\d+\.webp[^>]*/>\s*([^<]+)</a></div>'
        r'<div><span style="font-size:x-small">Lv</span><span[^>]*>(\d+)</span>',
        h,
    ):
        out.append({"work": m.group(2).strip(), "level": int(m.group(3))})
    return out


def section(h, title):
    i = h.find(f">{title}</h5>")
    if i < 0:
        i = h.find(title)
        if i < 0:
            return ""
    return h[i:i + 30000]


def parse_drops(h):
    seg = section(h, "Possible Drops")
    if not seg:
        return []
    tbl = seg[: seg.find("</table>")]
    out = []
    for r in re.findall(r"<tr[^>]*>(.*?)(?=<tr|$)", tbl, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)(?=<td|</tr>|$)", r, re.S)
        if len(cells) < 4:
            continue
        item = text(cells[0])
        qty = text(cells[1])
        lvl = num(text(cells[2]))
        prob = text(cells[3])
        if not item or item.lower() == "item":
            continue
        e = {"item": item, "qty": qty, "probability": prob}
        if lvl:
            e["minLevel"] = int(lvl)
        out.append(e)
    return out


def parse_spawns(h):
    seg = section(h, "Spawner")
    if not seg:
        return []
    tbl = seg[: seg.find("</table>")]
    out = []
    for r in re.findall(r"<tr[^>]*>(.*?)(?=<tr|$)", tbl, re.S):
        lvl = re.search(r'<span class="level">(\d+)</span>', r)
        area = re.search(r'fa-map-location-dot"></i>([^<]+)</a>', r)
        zone = re.search(r'\?zone=([A-Za-z0-9_]+)', r)
        if area:
            name = htmllib.unescape(area.group(1)).strip()
            coords = None
            cm = re.search(r"(-?\d+),(-?\d+)\s*$", name)
            if cm:
                coords = [int(cm.group(1)), int(cm.group(2))]
                name = name[: cm.start()].strip()
            e = {"area": name}
            if coords:
                e["coords"] = coords
            if lvl:
                e["level"] = int(lvl.group(1))
            out.append(e)
        elif zone:
            out.append({"area": zone.group(1), "kind": "egg"})
    return out


def parse_active_skills(h):
    seg = section(h, "Active Skills")
    if not seg:
        return []
    end = seg.find("Passive Skills")
    seg = seg[: end if end > 0 else 20000]
    out = []
    for m in re.finditer(
        r"Lv\.\s*(\d+)\s*</span>\s*<[^>]*>([^<]+)</", seg
    ):
        out.append({"level": int(m.group(1)), "name": m.group(2).strip()})
    if not out:
        flat = text(seg)
        for m in re.finditer(r"Lv\.\s*(\d+)\s+([A-Za-z'\- ]+?)\s+(Fire|Water|Grass|Electric|Ice|Ground|Dark|Dragon|Neutral)\s*:\s*(\d+)\s*Power:\s*(\d+)", flat):
            out.append({
                "level": int(m.group(1)),
                "name": m.group(2).strip(),
                "element": m.group(3),
                "cooldown": int(m.group(4)),
                "power": int(m.group(5)),
            })
    return out


def parse_partner(h):
    m = re.search(r"Partner Skill\s*</[^>]+>\s*(?:<[^>]+>\s*)*([^<]{3,80})", h)
    return m.group(1).strip() if m else None


records = {}
gaps = []
for internal, display in PALS:
    path = os.path.join(CACHE, internal + ".html")
    if not os.path.exists(path):
        gaps.append({"internalName": internal, "field": "page", "reason": "not cached"})
        continue
    h = open(path).read()
    title = re.search(r"<title>([^<]+)", h)
    kv = kv_pairs(h)
    others = others_table(h)
    elements = [e for e in [others.get("ElementType1"), others.get("ElementType2")]
                if e and e != "None"]
    rec = {
        "internalName": internal,
        "displayName": display,
        "sourceUrl": "https://paldb.cc/en/" + display.replace(" ", "_"),
        "pageTitle": title.group(1).strip() if title else None,
        "elements": elements,
        "stats": {
            "size": kv.get("Size"),
            "rarity": num(kv.get("Rarity")),
            "health": num(kv.get("Health")),
            "food": num(kv.get("Food")),
            "meleeAttack": num(kv.get("MeleeAttack")),
            "attack": num(kv.get("Attack")),
            "defense": num(kv.get("Defense")),
            "workSpeed": num(kv.get("Work Speed")),
            "support": num(kv.get("Support")),
            "captureRate": num(kv.get("CaptureRateCorrect")),
            "maleProbability": num(kv.get("MaleProbability")),
            "combiRank": num(kv.get("CombiRank")),
        },
        "movement": {
            "walkSpeed": num(kv.get("WalkSpeed")),
            "runSpeed": num(kv.get("RunSpeed")),
            "rideSprintSpeed": num(kv.get("RideSprintSpeed")),
            "transportSpeed": num(kv.get("TransportSpeed")),
            "stamina": num(kv.get("Stamina")),
        },
        "work": parse_work(h),
        "drops": parse_drops(h),
        "spawns": parse_spawns(h),
        "activeSkills": parse_active_skills(h),
        "partnerSkill": parse_partner(h),
        "nocturnal": bool(re.search(r"Nocturnal", h)),
        "genus": others.get("GenusCategory"),
    }
    for field, val in (("elements", rec["elements"]), ("work", rec["work"])):
        if not val:
            gaps.append({"internalName": internal, "field": field, "reason": "absent on page"})
    records[internal] = rec

json.dump({"records": records, "gaps": gaps}, open(OUT, "w"))
print(f"parsed {len(records)} pals, {len(gaps)} gap entries")
have = lambda f: sum(1 for r in records.values() if r[f])
for f in ("elements", "work", "drops", "spawns", "activeSkills"):
    print(f"  {f}: {have(f)}/{len(records)}")
