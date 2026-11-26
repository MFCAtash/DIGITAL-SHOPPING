"""Self-host font files (one-time build helper). Downloads only the woff2 faces we use."""
import re
import urllib.request
from pathlib import Path

OUT = Path("apps/web/public/fonts")
OUT.mkdir(parents=True, exist_ok=True)
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

FAMILIES = {
    "Vazirmatn": ("https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap", "U+0600", "vazirmatn"),
    "IBM Plex Sans": ("https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&display=swap", "U+0000-00FF", "plex-sans"),
    "IBM Plex Mono": ("https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap", "U+0000-00FF", "plex-mono"),
}

for family, (css_url, wanted_range, slug) in FAMILIES.items():
    req = urllib.request.Request(css_url, headers={"User-Agent": UA})
    css = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    blocks = re.findall(r"@font-face\s*\{([^}]+)\}", css)
    seen = set()
    for block in blocks:
        if wanted_range not in block:
            continue
        weight = re.search(r"font-weight:\s*(\d+)", block)
        url = re.search(r"url\((https://[^)]+)\)", block)
        if not (weight and url):
            continue
        w = weight.group(1)
        if w in seen:
            continue
        seen.add(w)
        target = OUT / f"{slug}-{w}.woff2"
        urllib.request.urlretrieve(url.group(1), target)
        print(f"{family} {w}: {target.stat().st_size} bytes")
