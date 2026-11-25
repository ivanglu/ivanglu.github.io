#!/usr/bin/env python3
"""
Change the version number on every script and stylesheet link.

    python3 financeiq/tools/bump_version.py 3.0.2

Why this exists: browsers keep scripts and styles for up to four hours but re-fetch pages
after ten minutes. Without a version number in the link, a visitor can get a new page with
old scripts, and the site breaks until the old copies expire. Changing the number makes
every browser fetch the new files at once. Run it before every deploy that changes a
.js or .css file.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # financeiq/
PAGES = list(ROOT.glob("*.html")) + [ROOT / "tests" / "index.html", ROOT.parent / "index.html", ROOT.parent / "404.html"]


def main(argv):
    if len(argv) != 1 or not re.fullmatch(r"\d+(\.\d+)*", argv[0]):
        sys.exit("Give the new version, for example:  python3 financeiq/tools/bump_version.py 3.0.2")
    changed = 0
    for page in PAGES:
        old = page.read_text()
        new = re.sub(r"(\.(?:js|css|png))\?v=[\d.]+", rf"\1?v={argv[0]}", old)
        if new != old:
            page.write_text(new)
            changed += 1
    print(f"Version set to {argv[0]} in {changed} page(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
