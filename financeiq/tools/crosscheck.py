#!/usr/bin/env python3
"""
Independent re-calculation of FinanceIQ's ratios.

    python3 financeiq/tools/crosscheck.py              # AAPL MSFT WMT COST KO PEP
    python3 financeiq/tools/crosscheck.py NVDA TSLA

The website calculates every ratio in JavaScript (js/calc.js). This script
calculates the same ratios again in Python, straight from the stored filing
figures and written out longhand, then compares the two. If they disagree by
more than a rounding error, one of the two implementations is wrong.

Prints a Markdown table (used in docs/FINANCIAL_VALIDATION.md). Exits 1 on any mismatch.
Needs the JavaScript engine that ships with macOS (jsc) or Node.js.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"
DEFAULT = ["AAPL", "MSFT", "WMT", "COST", "KO", "PEP"]


def from_javascript(tickers):
    if Path(JSC).exists():
        cmd = [JSC, "js/calc.js", "tests/dump.js", "--"] + tickers
    elif shutil.which("node"):
        code = ("global.Calc=require('./js/calc.js');global.print=console.log;"
                "global.readFile=f=>require('fs').readFileSync(f,'utf8');"
                f"global.arguments={json.dumps(tickers)};require('./tests/dump.js')")
        cmd = ["node", "-e", code]
    else:
        sys.exit("No JavaScript engine found (need macOS jsc or Node.js).")
    return json.loads(subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def by_hand(c):
    """The same ratios, written out longhand from the filing figures."""
    y, p = c["years"][-1], c["years"][-2]          # latest year and the year before
    y3 = next(x for x in c["years"] if x["fy"] == y["fy"] - 3)
    out = {}
    out["grossMargin"] = y["grossProfit"] / y["revenue"] if y["grossProfit"] is not None else None
    ebit = y["operatingIncome"] if y["operatingIncome"] is not None else y["pretaxIncome"] + y["interestExpense"]
    out["opMargin"] = ebit / y["revenue"]
    out["netMargin"] = y["netIncome"] / y["revenue"]
    out["growth"] = y["revenue"] / p["revenue"] - 1
    out["cagr3"] = (y["revenue"] / y3["revenue"]) ** (1 / 3) - 1
    fcf = y["operatingCashFlow"] - y["capex"]
    out["freeCashFlow"] = fcf
    out["fcfMargin"] = fcf / y["revenue"]
    out["debtToEquity"] = y["debt"] / y["equity"] if y["equity"] > 0 else None
    out["currentRatio"] = y["currentAssets"] / y["currentLiabilities"]
    out["netCash"] = y["cash"] - y["debt"]
    avg_equity = (y["equity"] + p["equity"]) / 2
    avg_assets = (y["assets"] + p["assets"]) / 2
    out["roe"] = y["netIncome"] / avg_equity if avg_equity > 0 else None
    out["roa"] = y["netIncome"] / avg_assets
    out["assetTurnover"] = y["revenue"] / avg_assets
    tax = min(0.35, max(0.0, y["incomeTax"] / y["pretaxIncome"]))
    out["taxRate"] = tax
    avg_capital = ((y["debt"] + y["equity"]) + (p["debt"] + p["equity"])) / 2
    out["roic"] = ebit * (1 - tax) / avg_capital
    fcff = fcf + y["interestExpense"] * (1 - tax) if y["interestExpense"] is not None else None
    out["fcff"] = fcff

    # DCF, base case, default assumptions: 5 years, 9% discount, 2.5% terminal growth
    g = min(0.12, max(0.02, out["cagr3"]))
    g = round(g * 1000) / 1000
    start = fcff if fcff is not None else fcf
    r, tg, cash_flow, pv = 0.09, 0.025, start, 0.0
    for t in range(1, 6):
        cash_flow *= 1 + g
        pv += cash_flow / (1 + r) ** t
    ev = pv + cash_flow * (1 + tg) / (r - tg) / (1 + r) ** 5
    out["dcfGrowth"] = g
    out["dcfEnterpriseValue"] = ev
    out["dcfPerShare"] = (ev - y["debt"] + y["cash"]) / y["dilutedShares"]
    return out


LABELS = {
    "grossMargin": ("Gross margin", "pct"), "opMargin": ("Operating margin", "pct"), "netMargin": ("Net margin", "pct"),
    "growth": ("Revenue growth", "pct"), "cagr3": ("3-year revenue CAGR", "pct"), "freeCashFlow": ("Free cash flow", "usd"),
    "fcfMargin": ("FCF margin", "pct"), "debtToEquity": ("Debt-to-equity", "x"), "currentRatio": ("Current ratio", "x"),
    "netCash": ("Cash minus debt", "usd"), "roe": ("Return on equity", "pct"), "roa": ("Return on assets", "pct"),
    "assetTurnover": ("Asset turnover", "x"), "taxRate": ("Tax rate used", "pct"), "roic": ("ROIC", "pct"),
    "fcff": ("FCFF (approx.)", "usd"), "dcfGrowth": ("DCF base growth", "pct"),
    "dcfEnterpriseValue": ("DCF enterprise value", "usd"), "dcfPerShare": ("DCF value per share", "ps"),
}


def show(v, kind):
    if v is None:
        return "n/a"
    return {"pct": f"{v * 100:.2f}%", "usd": f"${v / 1e9:,.2f}B", "x": f"{v:.3f}x", "ps": f"${v:,.2f}"}[kind]


def main(argv):
    tickers = [a.upper() for a in argv] or DEFAULT
    data = {c["ticker"]: c for c in json.loads((ROOT / "data" / "financials.json").read_text())["companies"]}
    js = from_javascript(tickers)
    bad = 0
    print("| Company | Measure | Website (JavaScript) | Recalculated (Python) | Result |")
    print("|---|---|---:|---:|---|")
    for t in tickers:
        hand = by_hand(data[t])
        for key, (label, kind) in LABELS.items():
            a, b = js[t][key], hand[key]
            same = (a is None and b is None) or (a is not None and b is not None and abs(a - b) <= 1e-9 * max(1.0, abs(b)))
            bad += not same
            print(f"| {data[t]['name']} FY{data[t]['years'][-1]['fy']} | {label} | {show(a, kind)} | {show(b, kind)} | {'match' if same else '**MISMATCH**'} |")
    print(f"\n{len(tickers) * len(LABELS) - bad} of {len(tickers) * len(LABELS)} values match.", file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
