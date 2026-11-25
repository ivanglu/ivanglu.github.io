#!/usr/bin/env python3
"""
Independent re-calculation of FinanceIQ's market indicators.

    python3 financeiq/tools/crosscheck_quant.py

The website calculates price and volume indicators in JavaScript (js/quant.js).
tests/dump_quant.js makes a 400-day made-up price series, and this script works
out every indicator again in Python, written separately and longhand. If the two
disagree beyond rounding, one of them is wrong.

The series is synthetic. No real prices are used or needed.
Prints a Markdown table and exits 1 on any mismatch.
"""
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"


def from_javascript():
    if Path(JSC).exists():
        cmd = [JSC, "js/quant.js", "tests/dump_quant.js"]
    elif shutil.which("node"):
        cmd = ["node", "-e", "global.print=console.log;global.Quant=require('./js/quant.js');require('./tests/dump_quant.js')"]
    else:
        sys.exit("No JavaScript engine found (need macOS jsc or Node.js).")
    return json.loads(subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def by_hand(stock, bench):
    c, h, l, v, b = stock["close"], stock["high"], stock["low"], stock["volume"], bench["close"]
    out = {}
    ret = lambda p, n: p[-1] / p[-1 - n] - 1
    for name, n in (("1m", 21), ("3m", 63), ("6m", 126), ("12m", 252)):
        out["return" + name] = ret(c, n)
        out["relative" + name] = ret(c, n) - ret(b, n)
    out["momentum12m1"] = c[-22] / c[-253] - 1
    out["relativeMomentum12m1"] = out["momentum12m1"] - (b[-22] / b[-253] - 1)
    ma50, ma200 = sum(c[-50:]) / 50, sum(c[-200:]) / 200
    out["ma50"], out["ma200"] = ma50, ma200
    out["priceVs50"], out["priceVs200"], out["ma50Vs200"] = c[-1] / ma50 - 1, c[-1] / ma200 - 1, ma50 / ma200 - 1
    out["ma50Slope"] = ma50 / (sum(c[-71:-21]) / 50) - 1
    out["fromHigh52"] = c[-1] / max(c[-252:]) - 1
    above = 0
    for back in range(63):
        end = len(c) - back
        above += c[end - 1] > sum(c[end - 50:end]) / 50
    out["shareAbove50"] = above / 63
    # on-balance volume over the last 63 days
    obv = 0
    for i in range(len(c) - 63, len(c)):
        obv += v[i] if c[i] > c[i - 1] else -v[i] if c[i] < c[i - 1] else 0
    out["obvTrend"] = obv / sum(v[-63:])
    flow = sum((((c[i] - l[i]) - (h[i] - c[i])) / (h[i] - l[i]) if h[i] > l[i] else 0) * v[i] for i in range(len(c) - 21, len(c)))
    out["chaikin"] = flow / sum(v[-21:])
    up = sum(v[i] for i in range(len(c) - 63, len(c)) if c[i] > c[i - 1])
    down = sum(v[i] for i in range(len(c) - 63, len(c)) if c[i] < c[i - 1])
    out["upDownVolume"] = up / down
    out["relativeVolume"] = (sum(v[-21:]) / 21) / (sum(v[-84:-21]) / 63)
    daily = [c[i] / c[i - 1] - 1 for i in range(len(c) - 252, len(c))]
    mean = sum(daily) / len(daily)
    out["volatility"] = math.sqrt(sum((x - mean) ** 2 for x in daily) / (len(daily) - 1)) * math.sqrt(252)
    out["downsideVolatility"] = math.sqrt(sum(min(x, 0) ** 2 for x in daily) / len(daily)) * math.sqrt(252)
    peak, worst = 0, 0
    for p in c[-253:]:
        peak = max(peak, p)
        worst = min(worst, p / peak - 1)
    out["maxDrawdown"] = worst
    out["returnPerRisk"] = out["return12m"] / out["volatility"]
    bd = [b[i] / b[i - 1] - 1 for i in range(len(b) - 252, len(b))]
    mb = sum(bd) / len(bd)
    out["beta"] = sum((x - mean) * (y - mb) for x, y in zip(daily, bd)) / sum((y - mb) ** 2 for y in bd)
    return out


def main():
    data = from_javascript()
    hand, js, bad = by_hand(data["stock"], data["bench"]), data["metrics"], 0
    print("| Indicator | Website (JavaScript) | Recalculated (Python) | Result |")
    print("|---|---:|---:|---|")
    for key, expected in hand.items():
        got = js.get(key)
        same = got is not None and abs(got - expected) <= 1e-9 * max(1.0, abs(expected))
        bad += not same
        print(f"| {key} | {got:.8f} | {expected:.8f} | {'match' if same else '**MISMATCH**'} |")
    print(f"\n{len(hand) - bad} of {len(hand)} indicators match.", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
