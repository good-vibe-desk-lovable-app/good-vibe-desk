import subprocess
import json
import re

def fetch_achievements():
    cmd = ['curl', '-sL', 'https://steamcommunity.com/stats/1623730/achievements']
    res = subprocess.run(cmd, capture_output=True, text=True)
    html = res.stdout

    # parse achieveRows
    rows = re.findall(r'<div class="achieveRow">(.*?)</div>\s*<!-- achieveRow -->', html, re.DOTALL)
    if not rows:
        rows = re.findall(r'<div class="achieveTxtHolder">(.*?)</div>\s*</div>', html, re.DOTALL)

    achievements = []
    # Match title and description
    matches = re.findall(r'<h3>(.*?)</h3>\s*<h5>(.*?)</h5>', html, re.DOTALL)
    for title, desc in matches:
        clean_t = re.sub(r'<[^>]+>', '', title).strip()
        clean_d = re.sub(r'<[^>]+>', '', desc).strip()
        if clean_t:
            achievements.append({"title": clean_t, "description": clean_d})

    print(f"Total achievements parsed: {len(achievements)}")
    with open("tmp/research/achievements_75.json", "w") as f:
        json.dump(achievements, f, indent=2)

if __name__ == '__main__':
    fetch_achievements()
