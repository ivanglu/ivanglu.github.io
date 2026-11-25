# Back-testing methodology

**Status: no back-test has been run, and none is published.** This file explains why, and what would be
needed to run one that means something.

## Why not now

A back-test asks: if these ratings had existed in the past, what would have followed? To answer honestly you
need the past as it was known at the time. FinanceIQ does not have that.

| Requirement | Why it matters | FinanceIQ today |
|---|---|---|
| Price history | Returns cannot be measured without it | None (no licensed source) |
| Point-in-time financials | A rating for March must use only filings published by March | Filing dates are stored, so this is possible in principle |
| No later restatements | Restated figures were not known at the time | Dollar figures are as first reported. Per-share figures use restated values |
| Companies that later failed or were acquired | Leaving them out makes every strategy look better (survivorship bias) | The 38 companies were chosen in 2026 because they are large and successful. This cannot be fixed afterwards |
| Enough independent observations | 38 companies and a few years is a tiny sample | Not available |
| Weights fixed before the test | Tuning weights to past returns guarantees a good-looking, meaningless result | Weights were set without looking at any returns |

The survivorship problem alone is disqualifying. Any back-test on this list of companies would mostly show
that companies picked for being successful had been successful.

## What is being done instead

From 25 November 2026, each data update saves a dated snapshot of every rating
(`tools/snapshot_ratings.py`, `data/ratings-history.json`). Snapshots are never recalculated. In a year or
two these become a small, clean, forward-looking record: ratings that really existed on a date, followed by
what really happened next.

## How a fair test would be designed

1. **Universe:** fixed in advance, including companies that later leave it.
2. **Rating date:** use only filings with a filing date on or before the rating date.
3. **Holding periods:** 1, 3, 6 and 12 months after the rating date, starting the next trading day.
4. **Comparison:** returns by grade (A to F), A minus F, and each category alone, all against the same benchmark.
5. **Costs:** assume a trading cost and report turnover.
6. **Out of sample:** choose any settings on one period, test on a later one (walk-forward).
7. **Report everything:** sample size, annualised return, volatility, maximum drawdown, share of stocks
   beating the benchmark, and the results that did not work.
8. **Label clearly:** back-tested results are not live results.

## What a result could and could not show

With 38 companies, even a clean test could only suggest a pattern. It could not establish that the ratings
predict returns. FinanceIQ makes no claim about investment performance.
