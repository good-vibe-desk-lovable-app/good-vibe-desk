import json
import subprocess
import re
import os

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

def fetch_mapgenie():
    print("Fetching MapGenie Palworld map categories...")
    # Fetch mapgenie palworld map HTML
    cmd = ['curl', '-sL', '-H', f"User-Agent: {HEADERS['User-Agent']}", "https://mapgenie.io/palworld/maps/palpagos-islands", '-o', 'tmp/research/mapgenie.html']
    subprocess.run(cmd)

    categories = []
    if os.path.exists('tmp/research/mapgenie.html'):
        with open('tmp/research/mapgenie.html', 'r', errors='ignore') as f:
            html = f.read()

        # Look for category data in JS objects e.g. "categories": [...]
        cat_matches = re.findall(r'"title":\s*"([^"]+)",\s*"icon":', html)
        if not cat_matches:
            cat_matches = re.findall(r'category_id":\d+,"title":"([^"]+)"', html)
        if not cat_matches:
            # search for JSON structure in script tag
            m = re.search(r'mapData\s*=\s*(\{.*?\});', html, re.DOTALL)
            if m:
                cat_matches = re.findall(r'"title":\s*"([^"]+)"', m.group(1))

        # Also try MapGenie API directly if html didn't yield enough
        api_cmd = ['curl', '-sL', '-H', f"User-Agent: {HEADERS['User-Agent']}", "https://mapgenie.io/api/v1/game/palworld/map/palpagos-islands", '-o', 'tmp/research/mapgenie_api.json']
        subprocess.run(api_cmd)
        if os.path.exists('tmp/research/mapgenie_api.json'):
            try:
                with open('tmp/research/mapgenie_api.json') as f:
                    api_data = json.load(f)
                if 'categories' in api_data:
                    categories = [c['title'] for c in api_data['categories']]
            except Exception as e:
                print("MapGenie API parse error:", e)

    if not categories and cat_matches:
        categories = list(set(cat_matches))

    print(f"MapGenie categories found: {len(categories)}")
    with open("tmp/research/mapgenie_categories.json", "w") as f:
        json.dump({"categories": sorted(categories)}, f, indent=2)

def fetch_ign_interactivemap():
    print("Fetching IGN InteractiveMap (interactivemap.app/palworld)...")
    cmd = ['curl', '-sL', '-H', f"User-Agent: {HEADERS['User-Agent']}", "https://interactivemap.app/palworld", '-o', 'tmp/research/ign_map.html']
    subprocess.run(cmd)

    categories = []
    if os.path.exists('tmp/research/ign_map.html'):
        with open('tmp/research/ign_map.html', 'r', errors='ignore') as f:
            html = f.read()

        # Look for categories/markers in HTML JS
        cats = re.findall(r'"name":\s*"([^"]+)"', html)
        if not cats:
            cats = re.findall(r'category[_\-\s]*name["\']?\s*:\s*["\']([^"\']+)["\']', html)
        categories = list(set(cats))

    print(f"IGN Map categories found: {len(categories)}")
    with open("tmp/research/ign_map_categories.json", "w") as f:
        json.dump({"categories": sorted(categories)}, f, indent=2)

def fetch_palworld_th_gl_maps():
    print("Fetching palworld.th.gl map marker categories...")
    cmd = ['curl', '-sL', '-H', f"User-Agent: {HEADERS['User-Agent']}", "https://palworld.th.gl", '-o', 'tmp/research/th_gl_map.html']
    subprocess.run(cmd)

    categories = []
    if os.path.exists('tmp/research/th_gl_map.html'):
        with open('tmp/research/th_gl_map.html', 'r', errors='ignore') as f:
            html = f.read()

        # search for categories
        cats = re.findall(r'"title":\s*"([^"]+)"', html)
        categories = list(set(cats))

    print(f"palworld.th.gl map categories found: {len(categories)}")
    with open("tmp/research/th_gl_map_categories.json", "w") as f:
        json.dump({"categories": sorted(categories)}, f, indent=2)

if __name__ == '__main__':
    fetch_mapgenie()
    fetch_ign_interactivemap()
    fetch_palworld_th_gl_maps()
