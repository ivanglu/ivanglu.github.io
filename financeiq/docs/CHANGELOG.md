# Changelog

## 3.0.1 (25 November 2026)

### Fixed
- After the 3.0.0 deploy, returning visitors could get new pages with old cached scripts and styles (pages are
  cached for ten minutes, scripts for four hours), which broke the site until the old copies expired. Every
  script and stylesheet link now carries a version number, and data files are always re-checked with the server.
  `tools/bump_version.py` changes the number before a deploy.

## 3.0.0 (25 November 2026, on branch `financeiq-v3`, not yet deployed)

### Added
- **Stock rating:** five categories (fundamentals, quantitative momentum, valuation, earnings momentum,
  financial quality), letter grades, a composite, six weight presets, per-measure detail and rule-based
  explanations. Three categories are live. Quantitative and Valuation are built and tested but switched off
  because no licensed price data is available.
- **Company page** (`company.html#NVDA`) with eight tabs. Choosing two companies is no longer required.
- **Search as you type** in the top bar, on the dashboard and in the company pickers, with keyboard control
  and recently viewed companies.
- **Dashboard, screener** (sort, filter, ready-made screens, CSV export, saved screens) and **watchlist**.
- **Quarterly and trailing-twelve-month data** from 10-Q filings: growth, acceleration, margins.
- **Valuation multiples** from a typed-in price, **reverse DCF**, **fading growth**, **3-year average start**
  and a **WACC helper** in the DCF simulator.
- **Rating snapshots** (`data/ratings-history.json`), started 25 November 2026.
- **Light and dark themes**, slate-blue visual identity, colour used for meaning.
- Five new research templates.
- `js/quant.js`, `js/ratings.js`, `js/screen.js`; `tools/snapshot_ratings.py`, `tools/build_prices.py`,
  `tools/crosscheck_quant.py`; 99 new unit tests and 9 new pipeline tests.
- Provider research, rating, quantitative and back-testing methodology documents.

### Changed
- Navigation: Dashboard, Screener, Compare, Watchlist, Research, Methodology. The six comparison pages sit
  under Compare. `#AAPL-MSFT` and `#NVDA` links to the start page are redirected.
- The start page is now a dashboard. Its old content moved to the top of the Compare page.
- Stock-split detection uses annual and quarterly filings together.

### Deferred (reasons in V3_IMPLEMENTATION_PLAN.md)
- Live Quantitative and Valuation grades, price charts, analyst estimates and surprises, Form 13F ownership,
  back-testing, comparing more than two companies, automatic scheduled refresh.

## 2.0.0 (24 November 2026, on branch `financeiq-v2`, not yet deployed)

### Added
- **Financial Health Score** (0–100): 19 measures in five categories, adjustable weights with automatic
  normalization, four presets, full breakdown, rule-based strengths and weaknesses.
- **DCF valuation simulator:** FCFF bridge, editable assumptions, bear / base / bull scenarios, sensitivity
  table, input validation.
- **Historical trends:** ten measures, 5- or 10-year period, three views (values, change on prior year,
  indexed), growth rates.
- **Industry benchmarks:** four peer groups, peer medians and ranks.
- **Ivan's Financial Research:** three case-study templates with data and charts filled in automatically and
  Ivan's sections loaded from text files.
- **Printable report** with a sample PDF.
- **Methodology** and **About** pages. Guided two-minute tour. Glossary tooltips.
- 22 more companies (38 in total), each with an AI-written summary whose quoted figures are checked automatically.
- Charts can be read from the keyboard: Tab to a chart, then the arrow keys.
- EPS, share counts, interest expense, depreciation, tax, current assets and liabilities, with stock-split
  adjustment detected from the filings.
- Automated tests: 99 for the formulas, 30 for the data pipeline, an independent Python recalculation, a check of every figure
  quoted in the AI summaries, and a
  validator that checks stored figures against the filings.
- Documentation set in `docs/`.

### Changed
- One page became ten pages with shared navigation. `#AAPL-MSFT` links still work.
- All formulas moved into `js/calc.js`, separate from page code.
- Data is one file (`data/financials.json`) instead of one per company.
- Return ratios now use average balances.
- The data script caches downloads and reports data-quality warnings.
- The main site's project card became a featured block with a preview image.
- "Ivan's analysis" on the old single page moved to the Research section (`research/aapl-msft.txt`).

### Fixed
- Total debt was understated where a balance sheet has one "short-term debt" line (PepsiCo by $2.8B; ten other
  companies by smaller amounts) and overstated for Netflix in FY2019–FY2020.
- Total debt now uses balance-sheet lines before a total tagged in the notes (Home Depot was $4.5B low, Broadcom
  $2.0B high), and a line tagged twice is counted once (IBM was $6.4B high).
- A later quarterly filing could override an annual-report figure (PepsiCo and Walmart debt in version 1).
- Target had no net income for FY2017–FY2020.
- The "Cash" label now says "Cash and short-term investments".
- Five AI-summary sentences that quoted the old debt figures.

### Known issues
- See "Not verified" in [FINANCIAL_VALIDATION.md](FINANCIAL_VALIDATION.md) and "Known data limitations" in
  [DATA_SOURCES.md](DATA_SOURCES.md).
- The live site still runs version 1, including the PepsiCo and Walmart debt error, until this is deployed.

## 1.0.0 (24 November 2026)

- First version: two-company comparison of 16 companies with a scorecard, four chart panels, plain-English
  explanations, AI-written strengths and risks and source tables.
