import urllib.request
import json
import ssl
import re
import os
import subprocess
import xml.etree.ElementTree as ET

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

def curl_fetch(url):
    cmd = ['curl', '-sL', '-H', f"User-Agent: {HEADERS['User-Agent']}", url]
    try:
        res = subprocess.run(cmd, capture_output=True, timeout=20)
        return res.returncode, res.stdout.decode('utf-8', errors='ignore')
    except Exception as e:
        return -1, str(e)

def run_wiki_gg_enumeration():
    print("Enumerating palworld.wiki.gg pages & categories...")
    pages = []
    apcontinue = None
    while True:
        url = "https://palworld.wiki.gg/api.php?action=query&list=allpages&aplimit=500&format=json"
        if apcontinue:
            url += f"&apcontinue={urllib.parse.quote(apcontinue)}"
        code, body = curl_fetch(url)
        if code != 0 or not body:
            print("Failed fetching wiki.gg pages:", code)
            break
        try:
            data = json.loads(body)
            query = data.get('query', {})
            p_list = query.get('allpages', [])
            pages.extend([p['title'] for p in p_list])
            if 'continue' in data and 'apcontinue' in data['continue']:
                apcontinue = data['continue']['apcontinue']
            else:
                break
        except Exception as e:
            print("JSON parse error on wiki.gg:", e)
            break

    categories = []
    accontinue = None
    while True:
        url = "https://palworld.wiki.gg/api.php?action=query&list=allcategories&aclimit=500&format=json"
        if accontinue:
            url += f"&accontinue={urllib.parse.quote(accontinue)}"
        code, body = curl_fetch(url)
        if code != 0 or not body:
            print("Failed fetching wiki.gg categories:", code)
            break
        try:
            data = json.loads(body)
            query = data.get('query', {})
            c_list = query.get('allcategories', [])
            categories.extend([c['*'] for c in c_list])
            if 'continue' in data and 'accontinue' in data['continue']:
                accontinue = data['continue']['accontinue']
            else:
                break
        except Exception as e:
            print("JSON parse error on wiki.gg categories:", e)
            break

    print(f"palworld.wiki.gg totals: {len(pages)} pages, {len(categories)} categories")
    with open("tmp/research/wiki_gg.json", "w") as f:
        json.dump({"pages": pages, "categories": categories}, f, indent=2)

def run_fandom_enumeration():
    print("Enumerating palworld.fandom.com pages & categories...")
    pages = []
    apcontinue = None
    while True:
        url = "https://palworld.fandom.com/api.php?action=query&list=allpages&aplimit=500&format=json"
        if apcontinue:
            url += f"&apcontinue={urllib.parse.quote(apcontinue)}"
        code, body = curl_fetch(url)
        if code != 0 or not body:
            print("Failed fetching fandom pages:", code)
            break
        try:
            data = json.loads(body)
            query = data.get('query', {})
            p_list = query.get('allpages', [])
            pages.extend([p['title'] for p in p_list])
            if 'continue' in data and 'apcontinue' in data['continue']:
                apcontinue = data['continue']['apcontinue']
            else:
                break
        except Exception as e:
            print("JSON parse error on fandom pages:", e)
            break

    categories = []
    accontinue = None
    while True:
        url = "https://palworld.fandom.com/api.php?action=query&list=allcategories&aclimit=500&format=json"
        if accontinue:
            url += f"&accontinue={urllib.parse.quote(accontinue)}"
        code, body = curl_fetch(url)
        if code != 0 or not body:
            print("Failed fetching fandom categories:", code)
            break
        try:
            data = json.loads(body)
            query = data.get('query', {})
            c_list = query.get('allcategories', [])
            categories.extend([c['*'] for c in c_list])
            if 'continue' in data and 'accontinue' in data['continue']:
                accontinue = data['continue']['accontinue']
            else:
                break
        except Exception as e:
            print("JSON parse error on fandom categories:", e)
            break

    print(f"palworld.fandom.com totals: {len(pages)} pages, {len(categories)} categories")
    with open("tmp/research/fandom.json", "w") as f:
        json.dump({"pages": pages, "categories": categories}, f, indent=2)

if __name__ == '__main__':
    run_wiki_gg_enumeration()
    run_fandom_enumeration()
