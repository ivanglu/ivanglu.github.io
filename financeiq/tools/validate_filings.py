#!/usr/bin/env python3
"""
Check FinanceIQ's stored figures against the financial statements inside the
actual 10-K filings.

    python3 financeiq/tools/validate_filings.py            # default companies
    python3 financeiq/tools/validate_filings.py KO PEP     # chosen companies

How it works
    build_data.py reads numbers from the SEC's "company facts" API. This script
    goes to a different place: the filing itself. Every 10-K on EDGAR includes
    the financial statements as rendered pages (R2.htm, R3.htm, ...). For each
    stored figure the script looks for that exact number on those pages.

    A figure that is found is confirmed to appear in the filing we link to.
    A figure that is NOT found needs a human to open the filing and look.

It prints a Markdown table (used in docs/FINANCIAL_VALIDATION.md) and exits
with status 1 if anything was not found.
"""
import html
import json
import os
import re
import ssl
import sys
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_data as bd

DEFAULT = ["AAPL", "MSFT", "WMT", "COST", "KO", "PEP"]
STATEMENT_PAGES = 9        # the financial statements are always among the first pages
MAX_PAGES = 70             # how far into the notes to look for a figure that is not on a statement

# stored field -> (label, how the number is printed in the statements)
CHECKS = [
    ("revenue", "Revenue", "millions"),
    ("operatingIncome", "Operating income", "millions"),
    ("netIncome", "Net income", "millions"),
    ("eps", "Diluted EPS", "per share"),
    ("assets", "Total assets", "millions"),
    ("equity", "Shareholders' equity", "millions"),
    ("operatingCashFlow", "Operating cash flow", "millions"),
    ("capex", "Capital spending", "millions"),
]


def get(url):
    """Download one page of a filing, keeping a local copy so re-runs do not hit the SEC again."""
    cache = bd.CACHE / "filings" / re.sub(r"[^A-Za-z0-9.]+", "_", url.split("/edgar/data/")[1])
    if cache.exists():
        return cache.read_text()
    time.sleep(bd.REQUEST_PAUSE)
    req = urllib.request.Request(url, headers={"User-Agent": bd.USER_AGENT})
    ctx = ssl.create_default_context()
    if not ctx.get_ca_certs() and os.path.exists("/etc/ssl/cert.pem"):
        ctx = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        text = r.read().decode("utf-8", "replace")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(text)
    return text


class Filing:
    """The rendered pages of one 10-K (R2.htm, R3.htm, ...), downloaded only as needed.

    The first pages are the financial statements. Later pages are the notes, which is
    where a total such as "total debt" is sometimes printed instead.
    """

    def __init__(self, cik, accn):
        self.base = f"https://www.sec.gov/Archives/edgar/data/{cik}/{accn.replace('-', '')}"
        self.pages, self.done = [], False

    def page(self, i):
        """Return (name, title, text) for the i-th page, or None when the filing has no more."""
        while len(self.pages) <= i and not self.done:
            n = len(self.pages) + 2
            try:
                raw = get(f"{self.base}/R{n}.htm")
            except Exception:
                self.done = True
                break
            title = re.search(r"<th[^>]*>(.*?)</th>", raw, re.S)
            title = re.sub(r"<[^>]+>", " ", title.group(1)) if title else f"R{n}"
            title = re.sub(r"\s+", " ", html.unescape(title)).strip()
            title = re.split(r" - | \(", title)[0][:60]
            self.pages.append((f"R{n}.htm", title, html.unescape(re.sub(r"<[^>]+>", " ", raw))))
        return self.pages[i] if i < len(self.pages) else None


def printed(value, style):
    """The ways a stored value may be printed in a filing.

    Most companies print millions ("478,834"). Some print millions with one decimal
    ("18,424.6") and some print thousands ("45,183,036").
    """
    v = abs(value)
    if style == "per share":
        return [f"{v:.2f}"]
    return [f"{v / 1e6:,.0f}", f"{v / 1e6:,.1f}", f"{v / 1e3:,.0f}"]


def find(value, style, filing, max_pages=MAX_PAGES):
    """Look for the value, statements first. Returns (text found, page name, page title)."""
    patterns = [(n, re.compile(r"(?<![\d,.])" + re.escape(n) + r"(?![\d,]|\.\d)")) for n in printed(value, style)]
    for i in range(max_pages):
        page = filing.page(i)
        if page is None:
            break
        for needle, pattern in patterns:
            if pattern.search(page[2]):
                return needle, page[0], page[1]
    return printed(value, style)[0], None, None


def main(argv):
    tickers = [a.upper() for a in argv] or DEFAULT
    data = {c["ticker"]: c for c in json.loads((bd.OUT / "financials.json").read_text())["companies"]}
    counts = {"statement": 0, "note": 0, "missing": 0}

    def result(page_name):
        if page_name is None:
            counts["missing"] += 1
            return "**NOT FOUND: check by hand**"
        on_statement = int(page_name[1:-4]) <= STATEMENT_PAGES + 1
        counts["statement" if on_statement else "note"] += 1
        return "match" if on_statement else "match (in a note, not on a statement)"

    print("| Company | Fiscal year | Figure | Stored value | Printed in filing as | Found on | Result |")
    print("|---|---|---|---:|---:|---|---|")
    for t in tickers:
        c = data[t]
        y = c["years"][-1]
        filing = Filing(c["cik"], y["accn"])
        for key, label, style in CHECKS:
            if y[key] is None:
                print(f"| {c['name']} | FY{y['fy']} | {label} | not reported | | | n/a |")
                continue
            needle, page, title = find(y[key], style, filing)
            stored = f"{y[key]:,.2f}" if style == "per share" else f"{y[key]:,.0f}"
            where = f"{page} ({title})" if page else "not found"
            print(f"| {c['name']} | FY{y['fy']} | {label} | {stored} | {needle} | {where} | {result(page)} |")
        # Debt and cash are sums, so check every line that was added up.
        for key, label, total in (("debtParts", "Debt", y["debt"]), ("cashParts", "Cash", y["cash"])):
            lines = [v for v in (y.get(key) or []) if v]
            if not lines:
                print(f"| {c['name']} | FY{y['fy']} | {label} | {total or 0:,.0f} | | | n/a (nothing reported) |")
                continue
            for n, v in enumerate(lines, 1):
                needle, page, title = find(v, "millions", filing)
                where = f"{page} ({title})" if page else "not found"
                name = f"{label}, line {n} of {len(lines)}" if len(lines) > 1 else label
                print(f"| {c['name']} | FY{y['fy']} | {name} | {v:,.0f} | {needle} | {where} | {result(page)} |")
        print(f"| | | *Filing* | | | [{y['accn']}]({y['url']}) | filed {y['filed']} |")
    print(f"\n{counts['statement']} found on a financial statement, {counts['note']} found in a note, "
          f"{counts['missing']} not found.", file=sys.stderr)
    return 1 if counts["missing"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
