# Changelog

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
- 22 more companies (38 in total).
- EPS, share counts, interest expense, depreciation, tax, current assets and liabilities, with stock-split
  adjustment detected from the filings.
- Automated tests: 99 for the formulas, 28 for the data pipeline, an independent Python recalculation, and a
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
