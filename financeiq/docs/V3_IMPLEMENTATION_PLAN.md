# Version 3 implementation plan

Written at the start of the version 3 work (25 November 2026) and updated with the outcome.

## 1. Audit of version 2

| Area | Finding | Decision |
|---|---|---|
| Architecture | Static site, one data file, all formulas in `js/calc.js`, 99 tests | Keep. Nothing in version 3 needs a server |
| Data | Annual 10-K figures only, 38 companies | Add quarterly 10-Q figures and trailing-twelve-month totals from the same SEC source |
| Navigation | Nine tabs, and every analysis page required choosing two companies | Replace with six sections. Add a single-company page and a search box |
| Company selection | Two long drop-down lists | Search-as-you-type boxes that still list every company when focused |
| Scoring | One Financial Health Score on fixed scales | Keep it as the business-health view. Add a separate five-category stock rating |
| Valuation | Single-stage DCF, price typed by hand | Add fading growth, reverse DCF, a WACC helper and valuation multiples |
| Market data | None | Researched before building. See section 3 |
| Visual design | Orange accent inherited from the main site, dark only | Slate-blue accent, green / amber / red for meaning, light and dark themes, tighter corners |
| Validation | 438 of 439 annual figures matched to filings | Extend to quarterly figures and to the new indicators |
| Redundancy | Overview and Comparison pages overlapped | Merged into one Compare page with a sub-menu |

Reused without change: the data pipeline's tag matching and split detection, the chart, the health score, the
DCF core, the report, the research file format, the tests and the validation tools.

## 2. What the five questions need

| Question | Data needed | Available? |
|---|---|---|
| Is this a financially strong business? | Annual and quarterly filings | Yes (SEC) |
| Is performance improving? | Quarterly filings | Yes (SEC) |
| Is the stock showing momentum? | Daily prices and volume, plus a benchmark | **No licensed source** |
| Is it attractively valued? | A share price for every company on the same day | **No licensed source** |
| How does it rank? | All of the above for every company | Partly |

## 3. The market-data decision

Nine providers' own terms were read (details and links in [DATA_PROVIDER_COMPARISON.md](DATA_PROVIDER_COMPARISON.md)).
The result: no free or low-cost self-serve plan clearly permits a public website to show prices or values
calculated from them. Plans that list public display start at roughly 125 to 250 US dollars a month.

Decision, in line with "do not introduce paid services without approval" and "respect licensing":

1. Build and test the Quantitative and Valuation engines now, against made-up price series.
2. Ship them switched off. The site states plainly why two grades are empty.
3. Provide `tools/build_prices.py`, which converts price files obtained under a suitable licence. Adding
   that file switches both grades on with no other change.
4. Let a visitor type one share price to see multiples and a reverse DCF for one company, in their own browser.
5. The choice of provider, and whether to pay, is left to the owner.

## 4. Operating cost

| Item | Cost |
|---|---|
| Hosting (GitHub Pages, Cloudflare) | 0 |
| SEC EDGAR data | 0 |
| Market data, as shipped | 0 (none used) |
| Market data, if added | 0 only with written permission from a provider; otherwise about 125 to 250 US dollars a month |

## 5. Phases and outcome

| Phase | Planned | Outcome |
|---|---|---|
| 1. Foundation and design | Audit, licensing research, navigation, company page | Done |
| 2. Analytics | Quarterly and TTM data, acceleration, five-category rating, explanations | Done for the three SEC-based categories. Quantitative and Valuation built and tested, not switched on |
| 3. Product | Screener, search, watchlist, snapshots, integrate comparison and DCF | Done |
| 4. Advanced | Analyst estimates, 13F ownership, advanced DCF, back-testing | Advanced DCF done. The other three deferred, with reasons published on the site |
| 5. Quality | Tests, validation, browser testing, documentation | Done. Results in FINANCIAL_VALIDATION.md |

## 6. Deferred, and why

| Feature | Why not now | What would unblock it |
|---|---|---|
| Quantitative and Valuation grades (live) | No licensed price data | A price licence that permits public display of derived values |
| Price charts, moving averages, volume charts | Same, and needs display rights for raw prices | A licence that permits raw price display |
| Earnings surprises, analyst revisions | Need dated consensus estimates | A licensed estimates feed |
| Institutional ownership (13F) | Heavy processing, months-old data, modest value | Time, and a reason to believe it adds information |
| Back-testing | Needs point-in-time data and delisted companies | A year or more of saved snapshots, plus prices |
| Comparing more than two companies | The charts and tables are built for two | The screener covers many-company comparison for now |
| Scheduled automatic refresh | The GitHub login used here cannot add workflow files | The owner adds `docs/github-workflow.example.yml` to `.github/workflows/` |
| Alerts, accounts | Out of scope by design | Not planned |
