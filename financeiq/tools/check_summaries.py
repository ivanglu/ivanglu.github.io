#!/usr/bin/env python3
"""
Check the figures quoted in the AI-written summaries against the data.

    python3 financeiq/tools/check_summaries.py

Every "$12.3B" and "45.6%" in data/summaries.json must equal, after rounding to the
precision it is written with, a figure FinanceIQ actually holds for that company
(any fiscal year). Run this after build_data.py: a summary that quotes a number the
data no longer contains is out of date and must be rewritten or removed.

This checks numbers only. It cannot tell whether a sentence's judgement is fair.
Needs the JavaScript engine that ships with macOS (jsc) or Node.js, like crosscheck.py.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSC = "/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc"

# A tiny script run in the site's own calculation engine, so the candidate figures
# are exactly what the website would show.
DUMP = r"""
const data = JSON.parse(readFile("data/financials.json")); const out = {};
const MONEY = ["revenue","grossProfit","ebit","netIncome","debt","cash","equity","assets","liabilities","operatingCashFlow","capex","freeCashFlow","netCash","netDebt","ebitda","nopat","investedCapital"];
const RATE = ["grossMargin","opMargin","netMargin","fcfMargin","ocfMargin","growth","roic","roe","roa","taxRate"];
for (const c of data.companies) { Calc.derive(c); const money = [], rate = [c.cagr, c.cagr3, c.ebitCagr3, c.epsCagr3];
  for (const y of c.years) { for (const k of MONEY) money.push(y[k]); for (const k of RATE) rate.push(y[k]);
    rate.push(Calc.div(y.capex, y.operatingCashFlow)); }
  // year-to-year differences in a money figure are also fair to quote ("sales are $9.0B higher")
  for (const a of c.years) for (const b of c.years) if (a.fy < b.fy) money.push(b.revenue - a.revenue);
  out[c.ticker] = { money: money.filter(Calc.isNum), rate: rate.filter(Calc.isNum) }; }
print(JSON.stringify(out));
"""


def candidates():
    tmp = ROOT / "tools" / ".cache" / "dump_summaries.js"
    tmp.parent.mkdir(exist_ok=True)
    tmp.write_text(DUMP)
    if Path(JSC).exists():
        cmd = [JSC, "js/calc.js", str(tmp)]
    else:
        code = ("global.Calc=require('./js/calc.js');global.print=console.log;"
                "global.readFile=f=>require('fs').readFileSync(f,'utf8');" + DUMP)
        cmd = ["node", "-e", code]
    return json.loads(subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=True).stdout)


def matches(text, values, scale):
    """True if the number as written equals one of the values at the same number of decimals."""
    decimals = len(text.split(".")[1]) if "." in text else 0
    return any(round(abs(v) * scale, decimals) == float(text) for v in values)


def main():
    cand = candidates()
    summaries = json.loads((ROOT / "data" / "summaries.json").read_text())["companies"]
    checked, problems = 0, []
    for ticker, s in summaries.items():
        if ticker not in cand:
            problems.append(f"{ticker}: summary exists but the company is not in the data")
            continue
        for sentence in s["strengths"] + s["risks"]:
            for m in re.finditer(r"\$(\d+(?:\.\d+)?)B", sentence):
                checked += 1
                if not matches(m.group(1), cand[ticker]["money"], 1e-9):
                    problems.append(f"{ticker}: ${m.group(1)}B not in the data: {sentence}")
            for m in re.finditer(r"(\d+(?:\.\d+)?)%", sentence):
                checked += 1
                if not matches(m.group(1), cand[ticker]["rate"], 100):
                    problems.append(f"{ticker}: {m.group(1)}% not in the data: {sentence}")
    for p in problems:
        print(p)
    print(f"{checked} quoted figures checked in {len(summaries)} summaries, {len(problems)} problem(s).")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
