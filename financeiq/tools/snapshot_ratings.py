#!/usr/bin/env python3
"""
Save today's ratings to data/ratings-history.json.

    python3 financeiq/tools/snapshot_ratings.py

Run this after build_data.py. Each run adds one dated snapshot (or replaces today's).
The website compares the two most recent snapshots to show upgrades and downgrades.

Rules
  * A snapshot records the ratings as they were calculated on that day, with the default
    (Balanced) weights. Old snapshots are never recalculated or edited.
  * History starts with the first run. Nothing is back-filled: applying today's data to
    past dates would invent a history that never existed.
  * A snapshot made with a different methodology version is kept, but the site only
    compares snapshots of the same version.
"""
import json
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
SCRIPTS = ["js/calc.js", "js/quant.js", "js/ratings.js", "tests/dump_ratings.js"]
KEEP = 60  # snapshots


def todays_ratings():
    if Path(JSC).exists():
        cmd = [JSC] + SCRIPTS
    elif shutil.which("node"):
        code = ("global.print=console.log;global.readFile=f=>require('fs').readFileSync(f,'utf8');"
                "global.Calc=require('./js/calc.js');global.Quant=require('./js/quant.js');"
                "global.Ratings=require('./js/ratings.js');require('./tests/dump_ratings.js')")
        cmd = ["node", "-e", code]
    else:
        sys.exit("No JavaScript engine found (need macOS jsc or Node.js).")
    return json.loads(subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def main():
    path = ROOT / "data" / "ratings-history.json"
    history = json.loads(path.read_text()) if path.exists() else {"snapshots": []}
    today = date.today().isoformat()
    snap = {"date": today, **todays_ratings()}
    history["snapshots"] = [s for s in history["snapshots"] if s["date"] != today] + [snap]
    history["snapshots"] = sorted(history["snapshots"], key=lambda s: s["date"])[-KEEP:]
    history["note"] = "One dated snapshot per data update. Never back-filled or recalculated."
    path.write_text(json.dumps(history, separators=(",", ":")))
    print(f"Saved snapshot for {today}: {len(snap['ratings'])} companies, methodology {snap['version']}, "
          f"market data {'yes' if snap['market'] else 'no'}. {len(history['snapshots'])} snapshot(s) stored.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
