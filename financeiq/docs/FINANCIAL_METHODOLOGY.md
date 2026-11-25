# Financial methodology

The reference for every number FinanceIQ shows. The same content, with live tables read from the code,
is on the site at `methodology.html`. If this file and the code ever disagree, the code
(`js/calc.js`) is what the site actually does.

## 1. Data rules

- Source: Form 10-K annual reports, via the SEC EDGAR XBRL service. Annual data only.
- Dollar amounts are **as first reported** in the 10-K for that year, so they match the linked filing.
- EPS and share counts are **adjusted for later stock splits**, detected from the filings.
- A figure a company does not report is `null` and shows as "n/a". Nothing is estimated.
- All companies report in US dollars. No currency conversion.
- No banks, insurers or REITs.

Details of how each figure is extracted: [DATA_SOURCES.md](DATA_SOURCES.md).

## 2. Formulas

"Average" means the average of the balance at the start and end of the fiscal year.

| Measure | Formula | Notes |
|---|---|---|
| Revenue growth | (revenue − prior revenue) ÷ prior revenue | Not calculated if the prior value is zero or negative |
| CAGR | (end ÷ start)^(1 ÷ years) − 1 | Only when both values are positive |
| Gross margin | gross profit ÷ revenue | n/a if gross profit is not reported |
| EBIT | operating income | If no such line is reported: pre-tax income + interest expense, flagged with † |
| Operating margin | EBIT ÷ revenue | |
| Net margin | net income ÷ revenue | |
| EBITDA | EBIT + depreciation and amortization | |
| Free cash flow (FCF) | operating cash flow − capital spending | After interest. A levered figure |
| Tax rate | income tax ÷ pre-tax income, limited to 0%–35% | 21% if it cannot be calculated (flagged) |
| NOPAT | EBIT × (1 − tax rate) | |
| FCFF (approx.) | FCF + interest expense × (1 − tax rate) | n/a if interest expense is not reported |
| Total debt | short-term borrowings + current and long-term debt | Leases excluded |
| Cash | cash and equivalents + short-term investments | Long-term investments excluded |
| Net cash | cash − total debt | Net debt is the negative of this |
| Debt-to-equity | total debt ÷ shareholders' equity | n/a when equity ≤ 0 |
| Current ratio | current assets ÷ current liabilities | |
| Interest coverage | EBIT ÷ interest expense | |
| Net debt ÷ EBITDA | (total debt − cash) ÷ EBITDA | |
| Return on equity (ROE) | net income ÷ average equity | n/a when average equity ≤ 0 |
| Return on assets (ROA) | net income ÷ average total assets | |
| Asset turnover | revenue ÷ average total assets | |
| ROIC | NOPAT ÷ average (total debt + equity) | Book values. Cash is not subtracted |
| FCF conversion | FCF ÷ net income | n/a when net income ≤ 0 |

### Why ROIC is defined this way

There are several textbook definitions of invested capital. FinanceIQ uses book debt plus book equity because
it can be calculated identically for every company from reported figures. The cost is that companies holding
very large cash balances, or with equity shrunk by buybacks, show a higher ROIC than a more refined definition
would give (Apple is the clearest case).

## 3. Financial Health Score

### Steps

1. Each measure is converted to 0–100 points on a straight line between two published levels and capped at both ends.
   `points = clamp((value − lo) ÷ (hi − lo), 0, 1) × 100`. For "lower is better" measures `lo` is the larger number.
2. Category score = plain average of its measures' points.
3. Overall score = weighted average of category scores, using weights that always sum to 100%.

### Measures and levels

| Category (default weight) | Measure | 0 points | 100 points |
|---|---|---:|---:|
| Growth (25%) | Revenue growth, latest year | −5% | 20% |
| | Revenue CAGR, 3 years | −2% | 20% |
| | Operating income CAGR, 3 years | −5% | 20% |
| | EPS CAGR, 3 years | −5% | 20% |
| Profitability (25%) | Gross margin | 15% | 60% |
| | Operating margin | 0% | 30% |
| | Net margin | 0% | 25% |
| | Return on equity | 0% | 25% |
| Financial stability (20%) | Debt-to-equity | 2.0x | 0x |
| | Current ratio | 0.5x | 2.0x |
| | Interest coverage | 1.5x | 12x |
| | Net debt ÷ EBITDA | 4.0x | 0x |
| Cash flow (20%) | Operating cash flow ÷ revenue | 0% | 30% |
| | FCF ÷ revenue | 0% | 25% |
| | FCF ÷ net income | 0.3x | 1.0x |
| | Share of last 5 years with positive FCF | 40% | 100% |
| Capital efficiency (10%) | ROIC | 5% | 25% |
| | Return on assets | 0% | 15% |
| | Asset turnover | 0.3x | 1.5x |

The levels are rules of thumb used in finance teaching (a current ratio under 1, interest coverage near 1.5 and
net debt above 4× EBITDA are common warning lines). They are judgement calls, published so they can be
questioned. They are not fitted to data and not adjusted by industry.

### Presets

| Preset | Growth | Profitability | Stability | Cash flow | Efficiency |
|---|---:|---:|---:|---:|---:|
| Default | 25 | 25 | 20 | 20 | 10 |
| Growth | 40 | 20 | 10 | 20 | 10 |
| Profitability | 15 | 40 | 15 | 20 | 10 |
| Conservative | 10 | 20 | 40 | 25 | 5 |

Custom weights: any five non-negative numbers, each divided by their total. If all are zero, equal weights are used.

### Special cases

| Situation | Rule | Reason |
|---|---|---|
| Measure cannot be calculated | Left out of its category average | Missing data is not bad performance |
| Category has fewer than 2 measures | Category not scored; other weights rescaled | One measure is not enough to judge a category |
| Fewer than 3 categories scored | No overall score; the page says why | Not enough information for a meaningful number |
| Equity ≤ 0 | Debt-to-equity and ROE left out, with a note | The ratios have no meaning. Leverage is still caught by coverage and net debt ÷ EBITDA |
| Equity under 10% of assets | ROE left out, with a note | Buybacks can make ROE huge without the business improving |
| Negative margin | 0 points | A loss is the bottom of the scale |
| Latest operating income or EPS ≤ 0 | Growth measure scores 0 | The company is currently losing money on that line |
| Starting operating income or EPS ≤ 0, latest positive | Growth measure left out | A growth rate from a negative base is meaningless |
| No debt, or no interest expense | Interest coverage = 100 points | Nothing to cover |
| Cash exceeds debt | Net debt ÷ EBITDA = 100 points | No net debt |
| Net debt but EBITDA ≤ 0 | Net debt ÷ EBITDA = 0 points | Debt with no operating profit to repay it |
| Extreme values | Capped at 0 and 100 | One outlier cannot dominate |

### Bands

80–100 Very strong · 65–79 Strong · 50–64 Mixed · 35–49 Weak · 0–34 Very weak. Labels only; they add no information beyond the number.

### What the score is not

It summarises one annual report. It does not use the share price, does not look forward, and does not
adjust for industry. A supermarket will score below a software company on margins by design. It is not a
prediction of stock performance and not an investment recommendation.

## 4. DCF model

Two-stage enterprise-value DCF.

```
cash flow in year t   = starting cash flow × (1 + growth)^t          t = 1 … N
present value(t)      = cash flow(t) ÷ (1 + discount rate)^t
terminal value        = cash flow(N) × (1 + terminal growth) ÷ (discount rate − terminal growth)
enterprise value      = Σ present value(t) + terminal value ÷ (1 + discount rate)^N
equity value          = enterprise value − debt + cash
value per share       = equity value ÷ diluted shares
```

### FCFF, not FCFE

Enterprise value belongs to lenders and shareholders together, so the cash flow discounted must be the cash
available to both: free cash flow to the firm, before interest. "Operating cash flow − capex" is after
interest, so the model adds back after-tax interest. If a company does not report interest expense (Apple,
since FY2024) the model uses FCF and states on the page that this understates FCFF.

Mixing the two (discounting FCFE and then subtracting debt) would count the cost of debt twice.

### Default assumptions

| | Bear | Base | Bull |
|---|---:|---:|---:|
| Growth | base − 4 pts (min 0%) | 3-year revenue CAGR, limited to 2%–12% (4% if unavailable) | base + 4 pts |
| Discount rate | 10.5% | 9.0% | 8.0% |
| Terminal growth | 2.0% | 2.5% | 3.0% |

Projection 5 years. Cash, debt and diluted shares from the latest annual report.

These are documented starting points so the model shows something sensible when the page opens. They are not
forecasts, and the discount rates are not estimated per company (no beta, no capital-structure weighting).

### Validation rules

Rejected with a message: discount rate ≤ terminal growth; discount rate ≤ 0; projection not a whole number
from 5 to 10; shares ≤ 0; negative cash or debt; growth ≤ −100%; any non-numeric input.

Warned on the page: starting cash flow ≤ 0 (the result is not meaningful); negative equity value.

### Sensitivity table

Value per share for discount rate ±2 points (1-point steps) × terminal growth ±1 point (0.5-point steps),
holding everything else at the selected scenario. Impossible cells show "–".

### Limits

One constant growth rate. No adjustment for stock-based pay, leases, minority interests or one-off items. The
share count is the year's weighted average, not today's count. No market price: upside is shown only against a
price the user types in.

## 5. Benchmarks

Peer groups are fixed, hand-picked lists (Technology 9, Semiconductors 8, Retail 8, Consumer staples 7).
Median = median of the list. Rank 1 = best. A rank needs at least four peers with data. No percentile is
shown on the page because seven to nine companies cannot support one. Valuation multiples are omitted because
there is no price feed.

## 6. AI

No number, score, valuation or rule-based explanation is produced by AI. The "Strengths and risks" text on the
Comparison page is AI-written, labelled and dated. The figures it quotes are checked against the data by
`tools/check_summaries.py`; its judgements are not reviewed by a person. Text marked "Written by Ivan" is his.
