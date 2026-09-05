import json
import subprocess
import urllib.parse
import os

def fetch_wiki_gg():
    print("Fetching wiki.gg allpages...")
    pages = []
    apcontinue = None
    while True:
        url = "https://palworld.wiki.gg/api.php?action=query&list=allpages&aplimit=500&format=json"
        if apcontinue:
            url += f"&apcontinue={urllib.parse.quote(apcontinue)}"

        cmd = ['curl', '-sL', url, '-o', 'tmp/research/wiki_gg_temp.json']
        subprocess.run(cmd, check=True)
        with open('tmp/research/wiki_gg_temp.json', 'r') as f:
            data = json.load(f)

        query = data.get('query', {})
        p_list = query.get('allpages', [])
        pages.extend([p['title'] for p in p_list])
        print(f"  Fetched {len(pages)} pages so far...")
        if 'continue' in data and 'apcontinue' in data['continue']:
            apcontinue = data['continue']['apcontinue']
        else:
            break

    print("Fetching wiki.gg allcategories...")
    categories = []
    accontinue = None
    while True:
        url = "https://palworld.wiki.gg/api.php?action=query&list=allcategories&aclimit=500&format=json"
        if accontinue:
            url += f"&accontinue={urllib.parse.quote(accontinue)}"

        cmd = ['curl', '-sL', url, '-o', 'tmp/research/wiki_gg_temp.json']
        subprocess.run(cmd, check=True)
        with open('tmp/research/wiki_gg_temp.json', 'r') as f:
            data = json.load(f)

        query = data.get('query', {})
        c_list = query.get('allcategories', [])
        categories.extend([c['*'] for c in c_list])
        print(f"  Fetched {len(categories)} categories so far...")
        if 'continue' in data and 'accontinue' in data['continue']:
            accontinue = data['continue']['accontinue']
        else:
            break

    with open("tmp/research/wiki_gg.json", "w") as f:
        json.dump({"pages": pages, "categories": categories}, f, indent=2)
    print(f"Saved wiki.gg: {len(pages)} pages, {len(categories)} categories")

def fetch_fandom():
    print("Fetching fandom allpages...")
    pages = []
    apcontinue = None
    while True:
        url = "https://palworld.fandom.com/api.php?action=query&list=allpages&aplimit=500&format=json"
        if apcontinue:
            url += f"&apcontinue={urllib.parse.quote(apcontinue)}"

        cmd = ['curl', '-sL', url, '-o', 'tmp/research/fandom_temp.json']
        subprocess.run(cmd, check=True)
        with open('tmp/research/fandom_temp.json', 'r') as f:
            data = json.load(f)

        query = data.get('query', {})
        p_list = query.get('allpages', [])
        pages.extend([p['title'] for p in p_list])
        print(f"  Fetched {len(pages)} fandom pages so far...")
        if 'continue' in data and 'apcontinue' in data['continue']:
            apcontinue = data['continue']['apcontinue']
        else:
            break

    print("Fetching fandom allcategories...")
    categories = []
    accontinue = None
    while True:
        url = "https://palworld.fandom.com/api.php?action=query&list=allcategories&aclimit=500&format=json"
        if accontinue:
            url += f"&accontinue={urllib.parse.quote(accontinue)}"

        cmd = ['curl', '-sL', url, '-o', 'tmp/research/fandom_temp.json']
        subprocess.run(cmd, check=True)
        with open('tmp/research/fandom_temp.json', 'r') as f:
            data = json.load(f)

        query = data.get('query', {})
        c_list = query.get('allcategories', [])
        categories.extend([c['*'] for c in c_list])
        print(f"  Fetched {len(categories)} fandom categories so far...")
        if 'continue' in data and 'accontinue' in data['continue']:
            accontinue = data['continue']['accontinue']
        else:
            break

    with open("tmp/research/fandom.json", "w") as f:
        json.dump({"pages": pages, "categories": categories}, f, indent=2)
    print(f"Saved fandom: {len(pages)} pages, {len(categories)} categories")

if __name__ == '__main__':
    fetch_wiki_gg()
    fetch_fandom()
