#!/usr/bin/env python3
"""
Turn price files you are licensed to use into data/prices.json.

    python3 financeiq/tools/build_prices.py --display-prices no  --source "Provider name, plan"
    python3 financeiq/tools/build_prices.py --clear          # go back to "no market data"

FinanceIQ does not download prices itself. No free source was found whose terms allow a
public website to show prices or figures calculated from them (docs/DATA_PROVIDER_COMPARISON.md).
So this script only converts files that YOU obtained under a licence that allows it.

Input: one CSV per ticker in  financeiq/tools/prices/  (this folder is not published and
not committed), named TICKER.csv, with a header row and these columns:

    date,open,high,low,close,volume        dates as YYYY-MM-DD, oldest or newest first

Prices must already be adjusted for stock splits. Include the benchmark (default SPY).
Only dates present for the benchmark are used, so every series lines up day for day.

--display-prices yes   the licence lets a public site show the prices themselves (charts)
--display-prices no    only calculated figures (returns, grades) may be shown
--attribution "..."    wording the provider requires, shown in the page footer

Never put an API key in this script, in the CSV folder or in the repository.
"""
import argparse
import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE / "prices"
OUT = HERE.parent / "data" / "prices.json"
EMPTY = {"note": "No market data is connected. tools/build_prices.py replaces this file when a licensed price "
                 "source is added. See docs/DATA_PROVIDER_COMPARISON.md.", "series": None}
MAX_DAYS = 800       # a little over three years, enough for every indicator
MIN_DAYS = 30


def read_csv(path):
    rows = {}
    with open(path, newline="") as f:
        for r in csv.DictReader(f):
            r = {k.strip().lower(): v for k, v in r.items()}
            try:
                rows[r["date"][:10]] = (float(r.get("high") or r["close"]), float(r.get("low") or r["close"]),
                                        float(r["close"]), float(r.get("volume") or 0))
            except (KeyError, ValueError):
                continue  # skip blank or malformed lines
    return rows


def check(ticker, dates, close):
    """Refuse data that looks unadjusted or broken, with a reason."""
    problems = []
    for i in range(1, len(close)):
        if close[i] <= 0:
            problems.append(f"{dates[i]}: price is zero or negative")
        elif close[i - 1] > 0 and not 0.45 < close[i] / close[i - 1] < 2.2:
            problems.append(f"{dates[i]}: price changed {close[i] / close[i - 1]:.2f}x in one day (unadjusted split?)")
    return [f"{ticker} {p}" for p in problems[:3]]


def main(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--clear", action="store_true")
    ap.add_argument("--benchmark", default="SPY")
    ap.add_argument("--source", default="")
    ap.add_argument("--display-prices", choices=["yes", "no"], default="no")
    ap.add_argument("--attribution", default="")
    a = ap.parse_args(argv)
    if a.clear:
        OUT.write_text(json.dumps(EMPTY, indent=1))
        print("Market data removed. The site shows the two market grades as not available.")
        return 0
    if not a.source:
        sys.exit("Say where the prices came from:  --source \"Provider name, plan\"")
    bench_file = SRC / f"{a.benchmark}.csv"
    if not bench_file.exists():
        sys.exit(f"Benchmark file not found: {bench_file}")
    bench = read_csv(bench_file)
    dates = sorted(bench)[-MAX_DAYS:]
    series, problems, skipped = {}, [], []
    for path in sorted(SRC.glob("*.csv")):
        ticker, rows = path.stem.upper(), read_csv(path)
        have = [d for d in dates if d in rows]
        if len(have) < MIN_DAYS or have != dates[-len(have):]:
            skipped.append(f"{ticker} ({len(have)} matching days, or gaps against the benchmark)")
            continue
        h, l, c, v = zip(*(rows[d] for d in have))
        problems += check(ticker, have, c)
        series[ticker] = {"high": list(h), "low": list(l), "close": list(c), "volume": list(v)}
    if problems:
        sys.exit("Refusing to write: the data looks wrong.\n  " + "\n  ".join(problems))
    # every series is right-aligned to the benchmark's dates; shorter histories simply start later
    OUT.write_text(json.dumps({
        "source": a.source, "benchmark": a.benchmark, "dates": dates,
        "license": {"displayPrices": a.display_prices == "yes", "displayDerived": True, "attribution": a.attribution},
        "series": series,
    }, separators=(",", ":")))
    print(f"Wrote {len(series)} series, {len(dates)} days to {dates[-1]}, to {OUT} ({OUT.stat().st_size / 1024:.0f} KB).")
    for s in skipped:
        print("  skipped", s)
    print("Next: python3 financeiq/tools/snapshot_ratings.py && sh financeiq/tests/run.sh")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
