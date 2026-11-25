# Quantitative methodology

The code is `js/quant.js`. **These calculations are built and tested but not shown on the live site**, because
FinanceIQ has no price data it is licensed to display ([DATA_PROVIDER_COMPARISON.md](DATA_PROVIDER_COMPARISON.md)).
They switch on when `tools/build_prices.py` is given licensed price files.

## Inputs

Daily open, high, low, close and volume for each stock and one benchmark (default SPY), oldest first, already
adjusted for splits. Trading-day counts: 21 = one month, 63 = three months, 126 = six months, 252 = one year.

Returns are **price returns**. Dividends are not included for the stock or the benchmark, which slightly
understates both and mostly cancels in the comparison.

`build_prices.py` refuses a file in which a price moves by more than 2.2× or less than 0.45× in one day, the
usual sign of an unadjusted split.

## Indicators

| Indicator | Formula | Minimum history |
|---|---|---|
| Period return | close today ÷ close n days ago − 1 | n + 1 days |
| Relative strength | stock return − benchmark return, same period | n + 1 days |
| 12-minus-1 momentum | close 21 days ago ÷ close 252 days ago − 1 | 253 days |
| Moving average | mean of the last n closes | n days |
| Price vs 200-day average | close ÷ 200-day average − 1 | 200 days |
| 50-day vs 200-day | 50-day average ÷ 200-day average − 1 | 200 days |
| Distance from 52-week high | close ÷ highest close of 252 days − 1 | 252 days |
| Days above 50-day average | share of the last 63 days closing above that day's 50-day average | 113 days |
| On-Balance Volume | running total: + volume on up days, − volume on down days | – |
| OBV trend | change in OBV over 63 days ÷ total volume in those days (−1 to +1) | 64 days |
| Chaikin Money Flow | Σ(((close − low) − (high − close)) ÷ (high − low) × volume) ÷ Σ volume, 21 days | 21 days |
| Up/down volume | volume on up days ÷ volume on down days, 63 days | 64 days |
| Volatility | standard deviation of daily returns × √252 | 253 days |
| Downside volatility | as above, counting only negative days | 253 days |
| Maximum drawdown | largest fall from a peak within 252 days | 253 days |
| Return per unit of risk | 12-month return ÷ volatility | 253 days |
| Beta | covariance(stock, benchmark) ÷ variance(benchmark), daily returns | 253 days |

An indicator without enough history is left empty and is not scored.

## The Quantitative grade

| Group | Weight | Measures (weight) | 0 at | 100 at |
|---|---:|---|---:|---:|
| Relative strength | 35% | 3-month return − benchmark (10) | −15 pts | +15 pts |
| | | 6-month return − benchmark (12) | −20 pts | +20 pts |
| | | 12-minus-1 momentum − benchmark (13) | −30 pts | +30 pts |
| Trend | 25% | Price vs 200-day average (9) | −15% | +15% |
| | | 50-day vs 200-day average (6) | −10% | +10% |
| | | Distance from 52-week high (5) | −35% | 0% |
| | | Days above 50-day average (5) | 20% | 90% |
| Volume | 25% | OBV trend (9) | −0.15 | +0.15 |
| | | Chaikin Money Flow (8) | −0.15 | +0.15 |
| | | Up/down volume (8) | 0.7× | 1.5× |
| Risk-adjusted | 15% | 12-month return ÷ volatility (8) | −0.5 | 2.0 |
| | | Largest fall in 12 months (7) | −45% | −8% |

Each measure is scored like every other rating measure: half fixed scale, half rank among tracked companies.

**Double counting.** Momentum indicators overlap heavily. To limit this the grade uses three horizons for
relative strength with no overlap in what they add (the 12-minus-1 measure skips the month the 3-month one
emphasises), one long-trend measure and one crossover, and leaves out the 1-month and 12-month relative
returns, the 50-day price ratio and the moving-average slope, which are calculated and displayed but not scored.

## What volume indicators can and cannot say

On-Balance Volume, Chaikin Money Flow and up/down volume describe how much traded on rising and falling days.
They are **proxies for participation**. They cannot identify who traded. FinanceIQ never describes them as
institutional buying.

Institutional holdings do exist in public data (SEC Form 13F), but quarterly and up to 45 days late. That
module is deferred; if built it will be shown separately and labelled as delayed holdings, not money flows.

## Valuation multiples

Code: `Calc.valuation()` in `js/calc.js`. Inputs: a share price, the latest quarter's diluted share count and
balance sheet, and trailing-twelve-month results.

| Measure | Formula | Not meaningful when |
|---|---|---|
| Market value | price × diluted shares | – |
| Enterprise value | market value + debt − cash and short-term investments | – |
| P/E | price ÷ TTM EPS | EPS ≤ 0 |
| Earnings yield | TTM EPS ÷ price | – (negative for a loss) |
| Price-to-sales | market value ÷ TTM revenue | – |
| Price-to-book | market value ÷ shareholders' equity | equity ≤ 0 |
| EV ÷ EBITDA | EV ÷ (TTM operating income + latest annual depreciation) | EBITDA ≤ 0 |
| Free cash flow yield | TTM free cash flow ÷ market value | – |
| PEG | P/E ÷ (3-year EPS growth × 100) | EPS or growth ≤ 0 |

The share count is the weighted average for the latest quarter, not the count on the price date. EBITDA mixes
a trailing figure with an annual one because quarterly depreciation is not collected. Forward P/E is not
calculated: it needs analyst estimates.

A falling share price alone never makes a company score as cheap: every valuation measure divides results by
price or enterprise value, so falling results lower the score just as a falling price raises it.

## Advanced DCF

- **Fading growth:** growth moves in equal steps from the starting rate in year 1 to the terminal rate in the final year.
- **Normalised start:** one click replaces the latest cash flow with the three-year average.
- **Reverse DCF:** the growth rate at which the model's value equals a given price, found by bisection between
  −50% and +100%, holding the scenario's discount rate, terminal growth and years fixed.
- **WACC helper:** cost of equity = risk-free rate + beta × equity risk premium; WACC = equity share × cost of
  equity + debt share × cost of debt × (1 − tax rate). The four rates are typed by the user. FinanceIQ has no
  interest-rate or beta data.

## Testing

- Unit tests for every indicator on series where the answer is known by reasoning (a steady +0.1% a day
  series has zero volatility, an OBV trend of +1, and so on).
- `tools/crosscheck_quant.py` recalculates 27 indicators in Python on a 400-day made-up series: 27 of 27 match.
- No test uses real prices.
