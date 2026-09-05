import json
import subprocess
import os
import re
import xml.etree.ElementTree as ET

SITES = [
    "paldb.cc",
    "palworld.gg",
    "palworld.tools",
    "palworld.th.gl",
    "game8.co",
    "gamewith.ai",
    "bamboogaming.net"
]

def fetch_url(url, out_path):
    cmd = ['curl', '-sL', '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)', url, '-o', out_path]
    res = subprocess.run(cmd)
    if res.returncode == 0 and os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return True
    return False

def check_site(site):
    print(f"\n--- Checking site: {site} ---")
    site_dir = f"tmp/research/sitemaps/{site.replace('.', '_')}"
    os.makedirs(site_dir, exist_ok=True)

    results = {"site": site, "robots_txt": None, "sitemap_urls": [], "urls": []}

    # 1. robots.txt
    robots_url = f"https://{site}/robots.txt"
    robots_file = f"{site_dir}/robots.txt"
    if fetch_url(robots_url, robots_file):
        with open(robots_file, 'r', errors='ignore') as f:
            content = f.read()
            results["robots_txt"] = content
            # find sitemap lines
            sitemaps = re.findall(r'(?i)sitemap:\s*(https?://\S+)', content)
            results["sitemap_urls"].extend(sitemaps)
            print(f"  robots.txt fetched ({len(content)} bytes). Found {len(sitemaps)} sitemaps in robots.txt.")
    else:
        print("  robots.txt: failed or 404")

    # 2. Try default sitemaps if none found in robots
    if not results["sitemap_urls"]:
        results["sitemap_urls"] = [f"https://{site}/sitemap.xml", f"https://{site}/sitemap_index.xml"]

    # 3. Fetch sitemaps
    extracted_urls = set()
    for sm_url in results["sitemap_urls"]:
        sm_file = f"{site_dir}/sitemap_idx_{os.path.basename(sm_url)}"
        if fetch_url(sm_url, sm_file):
            with open(sm_file, 'r', errors='ignore') as f:
                sm_content = f.read()
            # check if sitemapindex or urlset
            locs = re.findall(r'<loc>(https?://[^<]+)</loc>', sm_content)
            print(f"  Sitemap {sm_url}: found {len(locs)} links")
            for loc in locs:
                if loc.endswith('.xml') or 'sitemap' in loc:
                    # sub-sitemap
                    sub_file = f"{site_dir}/sub_{os.path.basename(loc)}"
                    if fetch_url(loc, sub_file):
                        with open(sub_file, 'r', errors='ignore') as sf:
                            sub_content = sf.read()
                        sub_locs = re.findall(r'<loc>(https?://[^<]+)</loc>', sub_content)
                        extracted_urls.update(sub_locs)
                        print(f"    Sub-sitemap {loc}: found {len(sub_locs)} links")
                else:
                    extracted_urls.add(loc)

    results["urls"] = sorted(list(extracted_urls))
    print(f"Total extracted URLs for {site}: {len(results['urls'])}")
    with open(f"{site_dir}/results.json", "w") as f:
        json.dump(results, f, indent=2)

def discover_palworld_gg_nuxt():
    print("\n--- Discovering palworld.gg _nuxt JSON bundles ---")
    site_dir = "tmp/research/sitemaps/palworld_gg"
    os.makedirs(site_dir, exist_ok=True)
    html_file = f"{site_dir}/palworld_gg_index.html"
    fetch_url("https://palworld.gg", html_file)
    with open(html_file, 'r', errors='ignore') as f:
        html = f.read()

    # search for _nuxt asset files or json files or buildId
    build_ids = re.findall(r'/_nuxt/([a-zA-Z0-9_\-\.]+)', html)
    json_links = re.findall(r'/_nuxt/data/([a-zA-Z0-9_\-\./]+\.json)', html)
    print(f"  Found {len(build_ids)} _nuxt script/asset refs and {len(json_links)} direct JSON bundle links in HTML")

    # Try fetching build manifest or app manifest if present
    manifest_urls = [
        "https://palworld.gg/_nuxt/builds/latest.json",
        "https://palworld.gg/_nuxt/builds/meta/kernel.json"
    ]
    for m_url in manifest_urls:
        m_file = f"{site_dir}/manifest_{os.path.basename(m_url)}"
        if fetch_url(m_url, m_file):
            print(f"  Fetched nuxt manifest: {m_url}")

if __name__ == '__main__':
    for site in SITES:
        check_site(site)
    discover_palworld_gg_nuxt()
