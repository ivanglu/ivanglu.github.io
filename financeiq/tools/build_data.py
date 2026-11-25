#!/usr/bin/env python3
"""
FinanceIQ data builder.

Downloads annual (Form 10-K) financial data from the SEC's free EDGAR XBRL API
and writes ../data/financials.json, the single data file the website reads.

    python3 financeiq/tools/build_data.py              # use cached downloads when fresh
    python3 financeiq/tools/build_data.py --refresh    # download everything again
    python3 financeiq/tools/build_data.py AAPL MSFT    # rebuild only some companies (debugging)

Source: https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json

Rules this script follows
  * Only reported figures are stored. Ratios are calculated by the website (js/calc.js).
  * Income-statement, cash-flow and balance-sheet figures are stored AS FIRST REPORTED,
    so they match the 10-K the site links to.
  * Per-share figures (EPS, share counts) are the exception: they are adjusted for later
    stock splits, otherwise a five-year EPS chart would be meaningless.
  * Nothing is estimated. A figure a company does not report is stored as null.
  * Downloads are cached and rate-limited (SEC fair-access policy: max 10 requests/second,
    and a User-Agent that identifies the requester).

Standard library only - no packages to install.
"""
import json
import os
import ssl
import sys
import time
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

# The SEC asks automated tools to identify themselves with a contact address.
# Set your own:  export FINANCEIQ_CONTACT="you@example.com"
USER_AGENT = "FinanceIQ student project " + os.environ.get("FINANCEIQ_CONTACT", "admin@example.com")

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "data"
CACHE = HERE / ".cache"
CACHE_HOURS = 24
YEARS_TO_KEEP = 10
REQUEST_PAUSE = 0.25  # seconds between downloads -> 4 requests/second

# ticker: (SEC CIK number, display name, peer group, short description)
# Peer groups are used for industry benchmarks. "Other" = no benchmark group.
COMPANIES = {
    # Technology
    "AAPL": (320193, "Apple", "Technology", "Consumer devices and services"),
    "MSFT": (789019, "Microsoft", "Technology", "Software and cloud"),
    "GOOGL": (1652044, "Alphabet (Google)", "Technology", "Search, advertising and cloud"),
    "META": (1326801, "Meta (Facebook)", "Technology", "Social media and advertising"),
    "ORCL": (1341439, "Oracle", "Technology", "Databases and cloud"),
    "ADBE": (796343, "Adobe", "Technology", "Creative and document software"),
    "CRM": (1108524, "Salesforce", "Technology", "Business software"),
    "IBM": (51143, "IBM", "Technology", "IT services and software"),
    "CSCO": (858877, "Cisco", "Technology", "Networking equipment"),
    # Semiconductors
    "NVDA": (1045810, "Nvidia", "Semiconductors", "Graphics and AI chips"),
    "AMD": (2488, "AMD", "Semiconductors", "Processors and graphics chips"),
    "INTC": (50863, "Intel", "Semiconductors", "Processors and chip manufacturing"),
    "AVGO": (1730168, "Broadcom", "Semiconductors", "Networking chips and software"),
    "QCOM": (804328, "Qualcomm", "Semiconductors", "Mobile chips and licensing"),
    "TXN": (97476, "Texas Instruments", "Semiconductors", "Analog chips"),
    "MU": (723125, "Micron", "Semiconductors", "Memory chips"),
    "AMAT": (6951, "Applied Materials", "Semiconductors", "Chip-making equipment"),
    # Retail
    "WMT": (104169, "Walmart", "Retail", "Discount stores and grocery"),
    "COST": (909832, "Costco", "Retail", "Membership warehouses"),
    "AMZN": (1018724, "Amazon", "Retail", "Online retail and cloud"),
    "TGT": (27419, "Target", "Retail", "Discount stores"),
    "HD": (354950, "Home Depot", "Retail", "Home improvement stores"),
    "LOW": (60667, "Lowe's", "Retail", "Home improvement stores"),
    "TJX": (109198, "TJX", "Retail", "Off-price clothing stores"),
    "DG": (29534, "Dollar General", "Retail", "Discount stores"),
    # Consumer staples
    "KO": (21344, "Coca-Cola", "Consumer staples", "Beverages"),
    "PEP": (77476, "PepsiCo", "Consumer staples", "Beverages and snacks"),
    "PG": (80424, "Procter & Gamble", "Consumer staples", "Household products"),
    "CL": (21665, "Colgate-Palmolive", "Consumer staples", "Household products"),
    "MDLZ": (1103982, "Mondelez", "Consumer staples", "Snacks"),
    "KMB": (55785, "Kimberly-Clark", "Consumer staples", "Paper and hygiene products"),
    "GIS": (40704, "General Mills", "Consumer staples", "Packaged food"),
    # No peer group
    "TSLA": (1318605, "Tesla", "Other", "Electric vehicles"),
    "NFLX": (1065280, "Netflix", "Other", "Streaming entertainment"),
    "DIS": (1744489, "Disney", "Other", "Entertainment and theme parks"),
    "NKE": (320187, "Nike", "Other", "Sportswear"),
    "MCD": (63908, "McDonald's", "Other", "Restaurants"),
    "SBUX": (829224, "Starbucks", "Other", "Coffee shops"),
}

# Companies label the same idea with different XBRL tags. For each line item we try
# the tags in order and use the first one that has a value for that fiscal year.
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
    "pretaxIncome": [
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments",
    ],
    "incomeTax": ["IncomeTaxExpenseBenefit"],
    # "available to common" equals net income unless the company has preferred shares
    "netIncome": ["NetIncomeLoss", "NetIncomeLossAvailableToCommonStockholdersBasic", "ProfitLoss"],
    "interestExpense": [
        "InterestExpense",
        "InterestExpenseNonoperating",
        "InterestExpenseDebt",
        "InterestAndDebtExpense",
        "InterestExpenseBorrowings",
        "InterestExpenseLongTermDebt",
    ],
    # cash interest actually paid: used only when no interest expense line is reported
    "interestPaid": ["InterestPaidNet", "InterestPaid"],
    "pretaxDomestic": ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesDomestic"],
    "pretaxForeign": ["IncomeLossFromContinuingOperationsBeforeIncomeTaxesForeign"],
    "depreciationOnly": ["Depreciation"],
    "amortization": ["AmortizationOfIntangibleAssets"],
    "depreciation": [
        "DepreciationDepletionAndAmortization",
        "DepreciationAndAmortization",
        "DepreciationAmortizationAndAccretionNet",
        "DepreciationAmortizationAndOther",
    ],
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
    "currentAssets": ["AssetsCurrent"],
    "liabilities": ["Liabilities"],
    "currentLiabilities": ["LiabilitiesCurrent"],
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
    "ltDebtCurrent": ["LongTermDebtCurrent", "LongTermDebtAndCapitalLeaseObligationsCurrent"],
    "debtCurrent": ["DebtCurrent"],
    "shortTermBorrowings": ["ShortTermBorrowings", "CommercialPaper"],
}
EPS_TAGS = ["EarningsPerShareDiluted"]
SHARE_TAGS = ["WeightedAverageNumberOfDilutedSharesOutstanding"]
ANNUAL_FORMS = ("10-K", "10-K/A")

# ----------------------------------------------------------------------------
# Download (cached, rate-limited)
# ----------------------------------------------------------------------------

_last_request = [0.0]


def fetch(cik, refresh=False):
    """Return the SEC companyfacts JSON for one company, using the local cache if fresh."""
    CACHE.mkdir(exist_ok=True)
    path = CACHE / f"CIK{cik:010d}.json"
    if path.exists() and not refresh and time.time() - path.stat().st_mtime < CACHE_HOURS * 3600:
        return json.loads(path.read_text())
    wait = REQUEST_PAUSE - (time.time() - _last_request[0])
    if wait > 0:
        time.sleep(wait)
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    # python.org installs of Python on macOS don't ship root certificates,
    # so fall back to the system bundle when it exists.
    ctx = ssl.create_default_context()
    if not ctx.get_ca_certs() and os.path.exists("/etc/ssl/cert.pem"):
        ctx = ssl.create_default_context(cafile="/etc/ssl/cert.pem")
    with urllib.request.urlopen(req, timeout=60, context=ctx) as r:
        raw = r.read()
    _last_request[0] = time.time()
    path.write_bytes(raw)
    return json.loads(raw)


# ----------------------------------------------------------------------------
# Picking the right fact out of the filings
# ----------------------------------------------------------------------------

def days(a, b):
    return (date.fromisoformat(b) - date.fromisoformat(a)).days


def is_full_year(fact):
    return "start" in fact and 345 <= days(fact["start"], fact["end"]) <= 380


def annual_facts(facts, tag, flow, unit="USD"):
    """Return {period_end: fact} for one tag, as ORIGINALLY reported in a 10-K.

    A 10-K repeats prior years for comparison, so the same period shows up in
    several filings (and again in amended 10-K/A filings). We keep the earliest
    filing for each period - that is the report for that fiscal year, so the
    number matches the document we link to.
    """
    node = facts.get(tag)
    if not node or unit not in node["units"]:
        return {}
    best = {}
    for f in node["units"][unit]:
        annual = f.get("form") in ANNUAL_FORMS
        if flow and not (annual and is_full_year(f)):
            continue
        # Balance-sheet values may also appear in a later 10-Q that repeats the
        # year-end balance sheet, but a 10-K always wins when there is one.
        rank = (0 if annual else 1, f["filed"])
        cur = best.get(f["end"])
        if cur is None or rank < cur["_rank"]:
            best[f["end"]] = dict(f, _rank=rank)
    return best


def pick(tag_series, end, annual_only=False):
    """Choose the fact for one line item and one period end.

    tag_series is a list of {period_end: fact}, one per candidate tag, in
    priority order. A value from the 10-K under ANY candidate tag beats a value
    that only appears in a later 10-Q.
    """
    fallback = None
    for by_end in tag_series:
        f = by_end.get(end)
        if f is None:
            continue
        if f.get("form") in ANNUAL_FORMS:
            return f
        fallback = fallback or f
    return None if annual_only else fallback


def all_reports(facts, tag, unit):
    """Return {period_end: [(filed, value), ...]} - every 10-K that reported the period."""
    node = facts.get(tag)
    out = {}
    if not node or unit not in node["units"]:
        return out
    for f in node["units"][unit]:
        if f.get("form") in ANNUAL_FORMS and is_full_year(f):
            out.setdefault(f["end"], {})[f["filed"]] = f["val"]
    return {end: sorted(v.items()) for end, v in out.items()}


def split_adjust(shares_reports, eps_reports):
    """Adjust share counts and EPS for stock splits, using only the filings.

    When a company splits its stock, the next 10-K restates the earlier years.
    So if two 10-Ks report the SAME fiscal year and the share count differs by a
    whole-number factor (2x, 3x, 10x ...), a split happened between them.

    Returns (shares_by_end, eps_by_end, splits) where splits is a list of
    (filing_date_that_first_shows_the_split, ratio).
    """
    # 1. find split ratios between consecutive filing dates
    ratios = {}
    for end, reports in shares_reports.items():
        for (f1, v1), (f2, v2) in zip(reports, reports[1:]):
            if not v1 or not v2:
                continue
            r = v2 / v1
            nearest = round(r * 2) / 2  # allow 1.5-for-1 as well as whole numbers
            if nearest >= 1.5 and abs(r - nearest) / nearest < 0.04:
                ratios.setdefault(f2, []).append(nearest)
    # Some companies (Alphabet) do not tag one combined share count, so also look
    # at EPS: after a 20-for-1 split the restated EPS is 1/20 of the original.
    for end, reports in eps_reports.items():
        for (f1, v1), (f2, v2) in zip(reports, reports[1:]):
            if f2 in ratios or not v1 or not v2 or v1 * v2 < 0:
                continue
            r = v1 / v2
            nearest = round(r * 2) / 2
            if nearest >= 1.5 and abs(r - nearest) / nearest < 0.04:
                ratios.setdefault(f2, []).append(nearest)
    splits = sorted((filed, max(set(v), key=v.count)) for filed, v in ratios.items())

    def factor_after(filed):
        f = 1.0
        for when, ratio in splits:
            if when > filed:
                f *= ratio
        return f

    # 2. take the latest-filed value for each period, then apply any later splits
    shares, eps = {}, {}
    for end, reports in shares_reports.items():
        filed, val = reports[-1]
        shares[end] = val * factor_after(filed)
    for end, reports in eps_reports.items():
        filed, val = reports[-1]
        eps[end] = round(val / factor_after(filed), 4)
    return shares, eps, splits


# ----------------------------------------------------------------------------
# Build one company
# ----------------------------------------------------------------------------

def total_debt(get, end):
    """Borrowings (bonds, loans, commercial paper). Operating leases are excluded.

    Returns (total, parts) where parts lists the reported lines that were added up,
    so the total can be checked against the balance sheet. (None, []) if nothing is reported.

    Balance sheets split debt in different ways, so the rule is, in order:
      1. a single reported total, if the company tags one;
      2. long-term debt (non-current) + current debt. Current debt is the "DebtCurrent"
         line when there is one (it already contains the current part of long-term debt
         and any short-term borrowings); otherwise current long-term debt + short-term borrowings;
      3. a long-term debt figure that includes the current part, + short-term borrowings
         (also used in step 2 when the balance sheet has no current-debt line at all);
      4. whatever current pieces exist.
    """
    def parts(*keys):
        found = [(k, get(k, end)) for k in keys]
        found = [(k, v) for k, v in found if v is not None]
        return (sum(v for _, v in found), found) if found else (None, [])

    if get("debtTotalTag", end) is not None:
        return parts("debtTotalTag")
    if get("ltDebtNoncurrent", end) is not None:
        if get("debtCurrent", end) is not None:
            return parts("ltDebtNoncurrent", "debtCurrent")
        # No current-debt line at all, but a long-term figure that includes the current
        # part exists (Alphabet, Amazon): use that, or the current part would be lost.
        no_current_line = get("ltDebtCurrent", end) is None and get("shortTermBorrowings", end) is None
        if no_current_line and (get("ltDebtAll", end) or 0) >= get("ltDebtNoncurrent", end):
            return parts("ltDebtAll", "shortTermBorrowings")
        return parts("ltDebtNoncurrent", "ltDebtCurrent", "shortTermBorrowings")
    if get("ltDebtAll", end) is not None:
        return parts("ltDebtAll", "shortTermBorrowings")
    if get("debtCurrent", end) is not None:
        return parts("debtCurrent")
    return parts("ltDebtCurrent", "shortTermBorrowings")


def quality_checks(years):
    """Simple consistency tests. Returns a list of human-readable warnings."""
    warnings = []
    for y in years:
        fy = f"FY{y['fy']}"
        a, l, e = y["assets"], y["liabilities"], y["equity"]
        if None not in (a, l, e) and a and abs(a - l - e) / a > 0.03:
            warnings.append(f"{fy}: assets differ from liabilities + equity by {abs(a - l - e) / a:.1%} "
                            "(usually non-controlling interests)")
        if y["grossProfit"] is not None and y["grossProfit"] > y["revenue"]:
            warnings.append(f"{fy}: gross profit is larger than revenue")
        if y["eps"] is not None and y["dilutedShares"] and y["netIncome"]:
            implied = y["netIncome"] / y["dilutedShares"]
            if abs(implied - y["eps"]) > max(0.05, 0.06 * abs(y["eps"])):
                warnings.append(f"{fy}: EPS {y['eps']} differs from net income / diluted shares ({implied:.2f}); "
                                "usually a later filing restated this year's per-share figures")
    for prev, cur in zip(years, years[1:]):
        if cur["fy"] - prev["fy"] != 1:
            warnings.append(f"gap between FY{prev['fy']} and FY{cur['fy']}")
        if prev["dilutedShares"] and cur["dilutedShares"]:
            change = cur["dilutedShares"] / prev["dilutedShares"]
            if change > 1.4 or change < 0.7:
                warnings.append(f"FY{cur['fy']}: diluted share count changed {change:.2f}x in a year "
                                "(possible unadjusted split, or a large acquisition)")
    return warnings


def build(ticker, cik, name, group, blurb, refresh=False):
    raw = fetch(cik, refresh)
    facts = raw["facts"]["us-gaap"]
    series = {}
    for key, tags in FLOW.items():
        series[key] = [annual_facts(facts, t, True) for t in tags]
    for key, tags in STOCK.items():
        series[key] = [annual_facts(facts, t, False) for t in tags]

    def fact(key, end):
        return pick(series[key], end)

    def get(key, end):
        f = fact(key, end)
        return f["val"] if f else None

    def get_annual(key, end):
        f = pick(series[key], end, annual_only=True)
        return f["val"] if f else None

    shares_reports, eps_reports = {}, {}
    for t in SHARE_TAGS:
        shares_reports = shares_reports or all_reports(facts, t, "shares")
    for t in EPS_TAGS:
        eps_reports = eps_reports or all_reports(facts, t, "USD/shares")
    shares, eps, splits = split_adjust(shares_reports, eps_reports)

    # Fiscal years = period ends that have a full-year revenue figure AND a balance sheet.
    ends = set()
    for by_end in series["revenue"]:
        ends |= set(by_end)
    ends = sorted(e for e in ends if get("assets", e) is not None)

    years = []
    for end in ends:
        filing = fact("revenue", end)  # the 10-K that first reported this year
        notes = []
        rev = get("revenue", end)
        gp = get("grossProfit", end)
        if gp is None and get("costOfRevenue", end) is not None:
            gp = rev - get("costOfRevenue", end)
            notes.append("grossProfit = revenue - cost of revenue (both reported)")

        liabilities, equity = get("liabilities", end), get("equity", end)
        if liabilities is None and equity is not None:
            total = get("liabilitiesAndEquity", end) or get("assets", end)
            liabilities = total - equity
            notes.append("liabilities = total liabilities and equity - equity (both reported)")

        cash, cash_parts = get("cashAndShortTerm", end), [("cashAndShortTerm", get("cashAndShortTerm", end))]
        if cash is None:
            cash_parts = [(k, get(k, end)) for k in ("cashOnly", "shortTermInvestments") if get(k, end) is not None]
            cash = sum(v for _, v in cash_parts) if get("cashOnly", end) is not None else None

        # Debt: build it from the 10-K's own tags first. Only if the 10-K tags no debt
        # at all do we look at later filings, and only then do we conclude there is none.
        debt, debt_parts = total_debt(get_annual, end)
        if debt is None:
            debt, debt_parts = total_debt(get, end)
        if debt is None:
            debt = 0  # no borrowings reported (for example Meta before 2022)

        pretax = get("pretaxIncome", end)
        if pretax is None and get("pretaxDomestic", end) is not None and get("pretaxForeign", end) is not None:
            pretax = get("pretaxDomestic", end) + get("pretaxForeign", end)
            notes.append("pretaxIncome = domestic + foreign pre-tax income (both reported)")

        interest = get("interestExpense", end)
        if interest is None and get("interestPaid", end) is not None:
            interest = get("interestPaid", end)
            notes.append("interestExpense: cash interest paid is used because no interest expense line is reported")

        dep = get("depreciation", end)
        if dep is None and get("depreciationOnly", end) is not None:
            dep = get("depreciationOnly", end) + (get("amortization", end) or 0)
            notes.append("depreciation = depreciation + amortization of intangibles (reported separately)")

        sh = shares.get(end)
        if sh is not None and sh < 1e5:
            sh *= 1e6
            notes.append("dilutedShares reported in millions; converted to units")
        ni, e = get("netIncome", end), eps.get(end)
        if sh is None and ni and e:
            sh = ni / e
            notes.append("dilutedShares = net income / diluted EPS (no combined share count is reported)")

        for key in ("assets", "currentAssets", "currentLiabilities", "equity", "shortTermInvestments"):
            f = fact(key, end)
            if f and f.get("form") not in ANNUAL_FORMS:
                notes.append(f"{key} taken from a later {f['form']} that repeats the year-end balance sheet")

        accn = filing["accn"]
        years.append({
            "fy": int(end[:4]),
            "end": end,
            "filed": filing["filed"],
            "accn": accn,
            "url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{accn.replace('-', '')}/{accn}-index.htm",
            # income statement
            "revenue": rev,
            "grossProfit": gp,
            "operatingIncome": get("operatingIncome", end),
            "pretaxIncome": pretax,
            "incomeTax": get("incomeTax", end),
            "netIncome": get("netIncome", end),
            "interestExpense": interest,
            "depreciation": dep,
            # per share (split-adjusted)
            "eps": eps.get(end),
            "dilutedShares": sh,
            # balance sheet
            "assets": get("assets", end),
            "currentAssets": get("currentAssets", end),
            "liabilities": liabilities,
            "currentLiabilities": get("currentLiabilities", end),
            "equity": equity,
            "debt": debt,
            "cash": cash,
            # cash flow
            "operatingCashFlow": get("operatingCashFlow", end),
            "capex": get("capex", end),
            # the reported lines that "debt" and "cash" were added up from
            "debtParts": [v for _, v in debt_parts],
            "cashParts": [v for _, v in cash_parts if v is not None],
            "notes": notes,
        })

    # one entry per fiscal-year label, most recent N
    dedup = {}
    for y in years:
        dedup[y["fy"]] = y
    years = [dedup[k] for k in sorted(dedup)][-YEARS_TO_KEEP:]
    return {
        "ticker": ticker,
        "name": name,
        "legalName": raw["entityName"],
        "group": group,
        "blurb": blurb,
        "cik": cik,
        "filingsUrl": f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik:010d}&type=10-K&dateb=&owner=include&count=40",
        "splits": [{"restatedIn": filed, "ratio": ratio} for filed, ratio in splits
                   if years and filed > years[0]["filed"]],
        "warnings": quality_checks(years),
        "years": years,
    }


LINE_ITEMS = ["revenue", "grossProfit", "operatingIncome", "pretaxIncome", "incomeTax", "netIncome",
              "interestExpense", "depreciation", "eps", "dilutedShares", "assets", "currentAssets",
              "liabilities", "currentLiabilities", "equity", "debt", "cash", "operatingCashFlow", "capex"]


def main(argv):
    refresh = "--refresh" in argv
    only = [a.upper() for a in argv if not a.startswith("-")]
    OUT.mkdir(exist_ok=True)
    out_path = OUT / "financials.json"
    bundle = {}
    if only and out_path.exists():  # partial rebuild keeps the other companies
        bundle = {c["ticker"]: c for c in json.loads(out_path.read_text())["companies"]}

    failed = []
    for ticker, (cik, name, group, blurb) in COMPANIES.items():
        if only and ticker not in only:
            continue
        try:
            c = build(ticker, cik, name, group, blurb, refresh)
        except Exception as e:  # keep going, report at the end
            failed.append(ticker)
            print(f"!! {ticker}: {type(e).__name__}: {e}", file=sys.stderr)
            continue
        if len(c["years"]) < 4:
            failed.append(ticker)
            print(f"!! {ticker}: only {len(c['years'])} usable fiscal years", file=sys.stderr)
            continue
        bundle[ticker] = c
        last = c["years"][-1]
        missing = [k for k in LINE_ITEMS if last[k] is None]
        split_txt = " ".join(f"{s['ratio']:g}:1" for s in c["splits"])
        print(f"{ticker:6} FY{c['years'][0]['fy']}-{last['fy']}  rev ${last['revenue'] / 1e9:8,.1f}B  "
              f"eps {last['eps']}  splits[{split_txt}]  missing{missing}  warnings={len(c['warnings'])}")

    companies = [bundle[t] for t in COMPANIES if t in bundle]
    out_path.write_text(json.dumps({
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "source": "SEC EDGAR XBRL company facts API (data.sec.gov), annual Form 10-K filings",
        "currency": "USD",
        "period": "annual (fiscal year)",
        "companies": companies,
    }, separators=(",", ":")))
    print(f"\nWrote {len(companies)} companies to {out_path} ({out_path.stat().st_size / 1024:.0f} KB)")
    if failed:
        print("FAILED: " + ", ".join(failed), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
