# Stock rating methodology

Methodology version 1.0. The code is `js/ratings.js`; if this file and the code disagree, the code is what
the site does. The live tables on `methodology.html#rating` are generated from the code.

## Purpose

The rating answers a different question from the Financial Health Score.

| | Financial Health Score | Stock rating |
|---|---|---|
| Question | Is this a strong business? | How does this stock look on five separate tests? |
| Data | Latest annual report | Annual and quarterly reports; prices when available |
| Scale | Fixed, the same for everyone | Half fixed scale, half rank among tracked companies |
| Result | 0–100 | 0–100 and a letter, per category and overall |

A company can be healthy and still rate poorly as a stock because of its price or its momentum. That is why
the two are kept apart.

## Categories and default weights

| Category | Weight | Data | Live? |
|---|---:|---|---|
| Fundamental performance | 25% | SEC filings | Yes |
| Quantitative momentum | 25% | Daily prices and volume | No: no licensed price data |
| Valuation | 20% | Share price and SEC filings | No: no licensed price data |
| Earnings momentum | 15% | Quarterly SEC filings | Yes |
| Financial quality | 15% | SEC filings | Yes |

The weights are starting assumptions. Nothing here shows they are the best weights.

## Scoring one measure

1. **Scale score** = clamp((value − lo) ÷ (hi − lo), 0, 1) × 100. `lo` and `hi` are published for every
   measure. For "lower is better" measures `lo` is the larger number.
2. **Rank score** = percentile among the tracked companies = (number below + half the number tied) ÷ count × 100.
   Skipped when fewer than 10 companies have the measure.
3. **Measure score** = average of the two (or the scale score alone if there is no rank).

Why both: a fixed scale alone lets every company score 100 on an easy bar; a rank alone gives a poor score to
a good company in a strong group, and with 38 companies a rank is coarse. Averaging tempers each.

Outliers: the scale is capped, and ranks ignore how extreme a value is. No values are trimmed or altered.

## From measures to a rating

- Category score = weighted average of its available measures.
- **A category is graded only if measures carrying at least 70% of its weight are available.**
- **A complete rating needs all five categories and at least 80% weighted coverage.** Otherwise it is labelled
  "partial", the missing categories are named, and the score is the weighted average of the available ones.
- Contribution of a category = its score × its weight ÷ the weight available. Contributions add up to the overall score.
- Grades from the unrounded score: A ≥ 80, B ≥ 60, C ≥ 40, D ≥ 20, F below 20.

## Measures

### Fundamental performance (12 measures, equal weight)

| Measure | 0 at | 100 at |
|---|---:|---:|
| Revenue growth, latest quarter (year over year) | −5% | 25% |
| Revenue growth, trailing 12 months | −5% | 25% |
| Revenue CAGR, 3 years | −2% | 20% |
| Revenue CAGR, 5 years | −2% | 20% |
| Years with rising revenue, last 5 | 40% | 100% |
| EPS growth, trailing 12 months | −10% | 30% |
| Operating income growth, trailing 12 months | −10% | 30% |
| Gross margin | 15% | 60% |
| Operating margin (trailing 12 months) | 0% | 30% |
| Operating margin change, year over year | −3 pts | +3 pts |
| Free cash flow margin | 0% | 25% |
| Operating cash flow growth, latest year | −10% | 25% |

### Earnings momentum (7 measures, equal weight)

| Measure | 0 at | 100 at |
|---|---:|---:|
| EPS growth, latest quarter | −10% | 30% |
| EPS growth acceleration (this quarter's growth − last quarter's) | −15 pts | +15 pts |
| Revenue growth acceleration | −5 pts | +5 pts |
| Operating income growth acceleration | −15 pts | +15 pts |
| Trailing-12-month EPS growth acceleration | −10 pts | +10 pts |
| Quarters with a wider margin than a year earlier, last 4 | 0 of 4 | 4 of 4 |
| Quarters with higher EPS than a year earlier, last 8 | 25% | 100% |

Growth is always against the same quarter a year earlier, which removes seasonality. The last measure compares
EPS levels, so it works for loss-making companies where a growth percentage would not.

Not included: earnings surprises and analyst revisions. They need licensed, dated consensus estimates. Their
absence does not lower any score.

### Financial quality (11 measures, equal weight)

| Measure | 0 at | 100 at |
|---|---:|---:|
| Return on invested capital | 5% | 25% |
| Return on assets | 0% | 15% |
| Net debt ÷ EBITDA | 4.0× | 0× |
| Interest coverage | 1.5× | 12× |
| Current ratio | 0.5× | 2.0× |
| Debt-to-equity | 2.0× | 0× |
| Years with positive free cash flow, last 5 | 40% | 100% |
| Operating cash flow ÷ net income | 0.6× | 1.3× |
| Accruals ÷ assets, (net income − operating cash flow) ÷ average assets | +10% | −5% |
| Share count change per year, 3 years | +3% | −3% |
| Operating margin variability, standard deviation over 5 years | 8 pts | 1 pt |

Return on equity is left out of this category: it is distorted by buybacks for many of these companies, and
ROIC measures the same idea without that problem. Piotroski and Altman scores were considered and not added:
the Altman model was built for manufacturers and its original form needs market value.

### Quantitative momentum and Valuation

See [QUANTITATIVE_METHODOLOGY.md](QUANTITATIVE_METHODOLOGY.md). Valuation, when live, uses five yields and
multiples: earnings yield 25%, free cash flow yield 25%, EBITDA ÷ enterprise value 20%, price-to-sales 15%,
price-to-book 15%. DCF results are shown beside the grade but are not part of it, because they depend on
assumptions the user chooses.

## Awkward cases

| Case | Rule |
|---|---|
| Growth from a zero or negative base | Not calculated. The measure is left out |
| Latest EPS or operating income is negative | The growth measure scores 0 |
| Negative equity | Debt-to-equity and price-to-book left out |
| No debt | Interest coverage and net debt ÷ EBITDA score 100 |
| Fewer than 10 companies have a measure | Scale score only |
| Fewer than 4 peers in a group | No peer median shown |
| Stale data | Each company page shows the date of its latest filing. No automatic penalty is applied |

## Presets

| Preset | Fundamentals | Quantitative | Valuation | Earnings | Quality |
|---|---:|---:|---:|---:|---:|
| Balanced | 25 | 25 | 20 | 15 | 15 |
| Growth Investor | 35 | 20 | 5 | 30 | 10 |
| Value Investor | 15 | 5 | 45 | 10 | 25 |
| Quality Investor | 25 | 5 | 15 | 10 | 45 |
| Momentum Investor | 10 | 50 | 5 | 30 | 5 |
| Conservative Investor | 15 | 10 | 25 | 5 | 45 |

Presets and custom weights change the overall score only. With market data missing, presets that lean on
Quantitative or Valuation have little effect, and the site says the rating is partial.

## Explanations

Generated by rule, not by AI: the three highest measures scoring 70 or more, the three lowest scoring 35 or
less, and a sentence naming the best and worst category.

## History

`tools/snapshot_ratings.py` saves one dated snapshot per data update in `data/ratings-history.json`, using the
Balanced weights. The site compares the two most recent snapshots of the same methodology version. History
began on 25 November 2026 and is never back-filled.

## Limits

- 38 hand-picked large US companies. Ranks are within that group only.
- The rank half of every score changes when companies are added or removed.
- No evidence yet that higher grades are followed by better returns. See [BACKTESTING_METHODOLOGY.md](BACKTESTING_METHODOLOGY.md).
- One-off gains and charges move the earnings measures. The trailing-12-month measure is there to soften this.
- A grade is not a recommendation.
