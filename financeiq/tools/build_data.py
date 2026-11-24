#!/usr/bin/env python3
"""
FinanceIQ data builder.

Downloads annual (10-K) financial data from the SEC's free EDGAR XBRL API
and writes one small JSON file per company into ../data/.

Run from anywhere:   python3 financeiq/tools/build_data.py

Source: https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json
Every number in the dashboard comes from a company's own 10-K filing, and
each fiscal year keeps the accession number of that filing so the site can
link straight back to the report.

No third-party packages needed - standard library only.
"""
import json
import os
import ssl
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path

# The SEC asks automated tools to identify themselves. Put a contact here.
USER_AGENT = "FinanceIQ student project admin@example.com"

OUT = Path(__file__).resolve().parent.parent / "data"
YEARS_TO_KEEP = 10

# ticker -> (CIK, display name, sector)
COMPANIES = {
    "AAPL": (320193, "Apple", "Technology"),
    "MSFT": (789019, "Microsoft", "Technology"),
    "GOOGL": (1652044, "Alphabet (Google)", "Technology"),
    "AMZN": (1018724, "Amazon", "Retail & Cloud"),
    "META": (1326801, "Meta (Facebook)", "Technology"),
    "NVDA": (1045810, "Nvidia", "Semiconductors"),
    "TSLA": (1318605, "Tesla", "Automotive"),
    "NFLX": (1065280, "Netflix", "Entertainment"),
    "DIS": (1744489, "Disney", "Entertainment"),
    "NKE": (320187, "Nike", "Apparel"),
    "KO": (21344, "Coca-Cola", "Beverages"),
    "PEP": (77476, "PepsiCo", "Beverages & Snacks"),
    "WMT": (104169, "Walmart", "Retail"),
    "COST": (909832, "Costco", "Retail"),
    "MCD": (63908, "McDonald's", "Restaurants"),
    "SBUX": (829224, "Starbucks", "Restaurants"),
}

# Companies label the same idea with different XBRL tags. For each metric we
# try the tags in order and use the first one that has a value for that year.
FLOW = {  # measured over a full fiscal year
    "revenue": [
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
        "RevenueFromContractWithCustomerIncludingAssessedTax",
        "SalesRevenueGoodsNet",
    ],
    "grossProfit": ["GrossProfit"],
    "costOfRevenue": ["CostOfRevenue", "CostOfGoodsAndServicesSold", "CostOfGoodsSold"],
    "operatingIncome": ["OperatingIncomeLoss"],
    "netIncome": ["NetIncomeLoss", "ProfitLoss"],
    "operatingCashFlow": [
        "NetCashProvidedByUsedInOperatingActivities",
        "NetCashProvidedByUsedInOperatingActivitiesContinuingOperations",
    ],
    "capex": [
        "PaymentsToAcquirePropertyPlantAndEquipment",
        "PaymentsToAcquireProductiveAssets",
        "PaymentsToAcquirePropertyPlantAndEquipmentAndIntangibleAssets",
        "PaymentsToAcquireOtherPropertyPlantAndEquipment",
    ],
}
STOCK = {  # measured on the last day of the fiscal year
    "assets": ["Assets"],
    "liabilities": ["Liabilities"],
    "equity": [
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ],
    "liabilitiesAndEquity": ["LiabilitiesAndStockholdersEquity"],
    "cashOnly": [
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ],
    "cashAndShortTerm": ["CashCashEquivalentsAndShortTermInvestments"],
    "shortTermInvestments": [
        "ShortTermInvestments",
        "MarketableSecuritiesCurrent",
        "AvailableForSaleSecuritiesDebtSecuritiesCurrent",
        "AvailableForSaleSecuritiesCurrent",
        "DebtSecuritiesCurrent",
    ],
    # debt pieces
    "debtTotalTag": ["DebtLongtermAndShorttermCombinedAmount", "DebtAndCapitalLeaseObligations"],
    "ltDebtAll": ["LongTermDebt", "LongTermDebtAndCapitalLeaseObligationsIncludingCurrentMaturities"],
    "ltDebtNoncurrent": [
        "LongTermDebtNoncurrent",
        "LongTermDebtAndCapitalLeaseObligations",
        "LongTermNotesPayable",
        "SeniorNotes",
    ],
    "ltDebtCurrent": [
        "LongTermDebtCurrent",
        "LongTermDebtAndCapitalLeaseObligationsCurrent",
    ],
    "debtCurrent": ["DebtCurrent"],
    "shortTermBorrowings": ["ShortTermBorrowings", "CommercialPaper"],
}


def fetch(cik):
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    # python.org installs of Python on macOS don't ship root certificates,
    # so fall back to the system bundle when it exists.
    ctx = ssl.create_default_context()
    if not ctx.get_ca_certs() and os.path.exists("/etc/ssl/cert.pem"):
        ctx = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        return json.load(r)


def days(a, b):
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


def annual_facts(facts, tag, flow):
    """Return {period_end: fact} for one tag, as ORIGINALLY reported in a 10-K.

    A 10-K repeats prior years for comparison, so the same period shows up in
    several filings. We keep the earliest filing for each period - that is the
    report for that fiscal year, so the number matches the document we link to.
    """
    node = facts.get(tag)
    if not node or "USD" not in node["units"]:
        return {}
    best = {}
    for f in node["units"]["USD"]:
        annual = f.get("form") in ("10-K", "10-K/A")
        if flow:
            if not annual or "start" not in f or not (345 <= days(f["start"], f["end"]) <= 380):
                continue
        # Balance-sheet values may also come from a later 10-Q that repeats the
        # year-end balance sheet, but a 10-K always wins when there is one.
        rank = (0 if annual else 1, f["filed"])
        cur = best.get(f["end"])
        if cur is None or rank < cur["_rank"]:
            best[f["end"]] = dict(f, _rank=rank)
    return best


def build(ticker, cik, name, sector):
    raw = fetch(cik)
    facts = raw["facts"]["us-gaap"]
    series = {}
    for key, tags in FLOW.items():
        series[key] = [annual_facts(facts, t, True) for t in tags]
    for key, tags in STOCK.items():
        series[key] = [annual_facts(facts, t, False) for t in tags]

    def get(key, end):
        for by_end in series[key]:
            if end in by_end:
                return by_end[end]["val"]
        return None

    # Fiscal year ends = the period ends for which a full-year revenue exists
    # and the balance sheet for that date was in the filing.
    ends = set()
    for by_end in series["revenue"]:
        ends |= set(by_end)
    ends = sorted(e for e in ends if get("assets", e) is not None)

    years = []
    for end in ends:
        # which filing is this year's 10-K? -> earliest filing reporting it
        filing = None
        for by_end in series["revenue"]:
            if end in by_end:
                filing = by_end[end]
                break
        rev = get("revenue", end)
        gp = get("grossProfit", end)
        if gp is None and get("costOfRevenue", end) is not None:
            gp = rev - get("costOfRevenue", end)

        liabilities = get("liabilities", end)
        equity = get("equity", end)
        if liabilities is None and equity is not None:
            total = get("liabilitiesAndEquity", end) or get("assets", end)
            liabilities = total - equity

        # --- total debt (borrowings; excludes operating leases) ---
        debt = get("debtTotalTag", end)
        if debt is None:
            lt = get("ltDebtAll", end)
            if lt is None:
                nc, cur = get("ltDebtNoncurrent", end), get("ltDebtCurrent", end)
                if nc is None and cur is None and get("debtCurrent", end) is None:
                    lt = None
                else:
                    lt = (nc or 0) + (cur or 0)
                    if cur is None:
                        lt += get("debtCurrent", end) or 0
            if lt is not None:
                debt = lt + (get("shortTermBorrowings", end) or 0)
            elif get("shortTermBorrowings", end) is not None:
                debt = get("shortTermBorrowings", end)
            else:
                debt = 0  # no borrowings reported in this filing (e.g. Meta before 2022)

        cash = get("cashAndShortTerm", end)
        if cash is None and get("cashOnly", end) is not None:
            cash = get("cashOnly", end) + (get("shortTermInvestments", end) or 0)

        ocf, capex = get("operatingCashFlow", end), get("capex", end)
        accn = filing["accn"]
        years.append({
            "fy": int(end[:4]),
            "end": end,
            "filed": filing["filed"],
            "accn": accn,
            "url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{accn.replace('-', '')}/{accn}-index.htm",
            "revenue": rev,
            "grossProfit": gp,
            "operatingIncome": get("operatingIncome", end),
            "netIncome": get("netIncome", end),
            "assets": get("assets", end),
            "liabilities": liabilities,
            "equity": equity,
            "debt": debt,
            "cash": cash,
            "operatingCashFlow": ocf,
            "capex": capex,
            "freeCashFlow": (ocf - capex) if ocf is not None and capex is not None else None,
        })

    # one entry per calendar year label, most recent N
    dedup = {}
    for y in years:
        dedup[y["fy"]] = y
    years = [dedup[k] for k in sorted(dedup)][-YEARS_TO_KEEP:]
    return {
        "ticker": ticker,
        "name": name,
        "legalName": raw["entityName"],
        "sector": sector,
        "cik": cik,
        "filingsUrl": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik:010d}&type=10-K&dateb=&owner=include&count=40",
        "years": years,
    }


def main():
    OUT.mkdir(exist_ok=True)
    index = []
    for ticker, (cik, name, sector) in COMPANIES.items():
        try:
            c = build(ticker, cik, name, sector)
        except Exception as e:  # keep going, report at the end
            print(f"!! {ticker}: {e}", file=sys.stderr)
            continue
        (OUT / f"{ticker}.json").write_text(json.dumps(c, separators=(",", ":")))
        last = c["years"][-1]
        missing = [k for k, v in last.items() if v is None]
        gaps = sum(1 for y in c["years"] for v in y.values() if v is None)
        print(f"{ticker:6} {len(c['years'])} yrs  FY{c['years'][0]['fy']}-{last['fy']}  "
              f"rev ${last['revenue']/1e9:,.1f}B  debt {last['debt'] and round(last['debt']/1e9,1)}  "
              f"cash {last['cash'] and round(last['cash']/1e9,1)}  gaps={gaps} {missing or ''}")
        index.append({"ticker": ticker, "name": name, "sector": sector,
                      "latestFy": last["fy"], "latestEnd": last["end"]})
        time.sleep(0.25)  # be polite to the SEC servers
    (OUT / "companies.json").write_text(json.dumps(
        {"generated": date.today().isoformat(), "companies": index}, indent=1))
    print(f"\nWrote {len(index)} companies to {OUT}")


if __name__ == "__main__":
    main()
