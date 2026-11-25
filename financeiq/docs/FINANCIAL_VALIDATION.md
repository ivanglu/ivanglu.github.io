# Financial validation record

What was checked, how, what was found, and what is still unverified.
Last run: 24 November 2026, against the data file built the same day.

Every check here can be repeated with one command (see the end of this file).

## Summary

| Check | What it proves | Result |
|---|---|---|
| 1. Formula unit tests | Each formula gives the hand-worked answer on made-up round numbers | 99 of 99 pass |
| 2. Pipeline unit tests | The data script picks the right filing, handles splits, builds debt correctly | 28 of 28 pass |
| 3. Stored figures vs the filings | The numbers in `financials.json` are printed in the 10-K we link to | 432 of 433 found (all 38 companies) |
| 4. Independent recalculation | A second implementation in Python gets the same ratios as the website | 114 of 114 match (6 companies) |

**What this does not prove.** Check 3 confirms that each stored number appears in the filing. It does not prove
that a total built from several lines (total debt) includes every line it should. That was checked by reading
the balance sheet for seven companies only (section 3b). Nothing here checks that the scoring thresholds or
DCF assumptions are "right": those are judgement calls, documented in FINANCIAL_METHODOLOGY.md.

## 1. Formula unit tests

`tests/tests.js`, 99 tests. Each builds a small made-up company with round numbers and compares the result
with an answer worked out by hand. Examples:

| Formula | Input | Expected | Calculated |
|---|---|---:|---:|
| CAGR | 100 to 121 over 2 years | 10.0% | 10.0% |
| Free cash flow | operating cash flow 250, capex 70 | 180 | 180 |
| FCFF | FCF 180, interest 10, tax rate 20% | 188 | 188 |
| ROIC | EBIT 200, tax 20%, average debt + equity 1,100 | 14.545% | 14.545% |
| Interest coverage | EBIT 200, interest 10 | 20.0x | 20.0x |
| DCF terminal value | year-5 cash flow 161.051, growth 2%, discount 10% | 2,053.40 | 2,053.40 |
| DCF enterprise value | start 100, growth 10%, discount 10%, 5 years | 1,775.00 | 1,775.00 |
| DCF equity value | enterprise value 1,775, debt 200, cash 50 | 1,625.00 | 1,625.00 |
| DCF value per share | equity 1,625, 10 shares | 162.50 | 162.50 |

The DCF case uses growth equal to the discount rate on purpose: every year's present value is then exactly the
starting cash flow, so the whole model can be checked with mental arithmetic.

Groups covered: basic helpers, financial ratios, missing data and losses and negative equity, score
normalization, weights, scoring with missing data, DCF projections and terminal value, enterprise to equity
value, DCF input validation, sensitivity analysis, DCF defaults, peer statistics, units and formatting.

## 2. Pipeline unit tests

`tools/test_build_data.py`, 28 tests on made-up filings (they run offline) plus four checks on the real data file:

- the original 10-K is used, not a later restatement, and quarterly periods and 10-Q filings are ignored for full-year figures;
- a 53-week fiscal year still counts as a year;
- a value from the 10-K beats a value that only appears in a later 10-Q;
- total debt is built correctly for each balance-sheet layout (Apple, PepsiCo, Alphabet);
- 4-for-1, chained and EPS-only stock splits are detected and applied, and buybacks are not mistaken for splits;
- the consistency checks fire on a balance sheet that does not add up, a missing year, and an unadjusted split;
- every company has revenue, net income, assets and operating cash flow for every year, in whole dollars, with consecutive fiscal years.

## 3. Stored figures against the filings

`tools/validate_filings.py` does not use the SEC data API. It downloads the rendered financial statements from
inside each 10-K (pages `R2.htm`, `R3.htm`, ...) and searches them for each stored number, formatted the way
filings print it (millions, millions with one decimal, or thousands).

### 3a. Six companies, latest fiscal year

| Company | Fiscal year | Figure | Stored value | Printed in filing as | Found on | Result |
|---|---|---|---:|---:|---|---|
| Apple | FY2026 | Revenue | 478,834,000,000 | 478,834 | R3.htm (CONSOLIDATED STATEMENTS OF OPERATIONS) | match |
| Apple | FY2026 | Operating income | 158,063,000,000 | 158,063 | R3.htm (CONSOLIDATED STATEMENTS OF OPERATIONS) | match |
| Apple | FY2026 | Net income | 132,175,000,000 | 132,175 | R3.htm (CONSOLIDATED STATEMENTS OF OPERATIONS) | match |
| Apple | FY2026 | Diluted EPS | 8.98 | 8.98 | R3.htm (CONSOLIDATED STATEMENTS OF OPERATIONS) | match |
| Apple | FY2026 | Total assets | 404,548,000,000 | 404,548 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Apple | FY2026 | Shareholders' equity | 112,093,000,000 | 112,093 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Apple | FY2026 | Operating cash flow | 145,097,000,000 | 145,097 | R8.htm (CONSOLIDATED STATEMENTS OF CASH FLOWS) | match |
| Apple | FY2026 | Capital spending | 9,041,000,000 | 9,041 | R8.htm (CONSOLIDATED STATEMENTS OF CASH FLOWS) | match |
| Apple | FY2026 | Debt, line 1 of 3 | 68,208,000,000 | 68,208 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Apple | FY2026 | Debt, line 2 of 3 | 9,906,000,000 | 9,906 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Apple | FY2026 | Debt, line 3 of 3 | 1,997,000,000 | 1,997 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Apple | FY2026 | Cash, line 1 of 2 | 36,305,000,000 | 36,305 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Apple | FY2026 | Cash, line 2 of 2 | 20,417,000,000 | 20,417 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| | | *Filing* | | | [0000320193-26-000026](https://www.sec.gov/Archives/edgar/data/320193/000032019326000026/0000320193-26-000026-index.htm) | filed 2026-11-03 |
| Microsoft | FY2026 | Revenue | 331,839,000,000 | 331,839 | R2.htm (INCOME STATEMENTS) | match |
| Microsoft | FY2026 | Operating income | 155,237,000,000 | 155,237 | R2.htm (INCOME STATEMENTS) | match |
| Microsoft | FY2026 | Net income | 133,749,000,000 | 133,749 | R2.htm (INCOME STATEMENTS) | match |
| Microsoft | FY2026 | Diluted EPS | 17.95 | 17.95 | R2.htm (INCOME STATEMENTS) | match |
| Microsoft | FY2026 | Total assets | 758,376,000,000 | 758,376 | R4.htm (BALANCE SHEETS) | match |
| Microsoft | FY2026 | Shareholders' equity | 442,387,000,000 | 442,387 | R4.htm (BALANCE SHEETS) | match |
| Microsoft | FY2026 | Operating cash flow | 182,935,000,000 | 182,935 | R6.htm (CASH FLOWS STATEMENTS) | match |
| Microsoft | FY2026 | Capital spending | 115,948,000,000 | 115,948 | R6.htm (CASH FLOWS STATEMENTS) | match |
| Microsoft | FY2026 | Debt, line 1 of 2 | 31,067,000,000 | 31,067 | R4.htm (BALANCE SHEETS) | match |
| Microsoft | FY2026 | Debt, line 2 of 2 | 9,227,000,000 | 9,227 | R4.htm (BALANCE SHEETS) | match |
| Microsoft | FY2026 | Cash | 76,843,000,000 | 76,843 | R4.htm (BALANCE SHEETS) | match |
| | | *Filing* | | | [0001193125-26-323660](https://www.sec.gov/Archives/edgar/data/789019/000119312526323660/0001193125-26-323660-index.htm) | filed 2026-07-29 |
| Walmart | FY2026 | Revenue | 706,413,000,000 | 706,413 | R3.htm (Consolidated Statements of Income) | match |
| Walmart | FY2026 | Operating income | 29,825,000,000 | 29,825 | R3.htm (Consolidated Statements of Income) | match |
| Walmart | FY2026 | Net income | 21,893,000,000 | 21,893 | R3.htm (Consolidated Statements of Income) | match |
| Walmart | FY2026 | Diluted EPS | 2.73 | 2.73 | R3.htm (Consolidated Statements of Income) | match |
| Walmart | FY2026 | Total assets | 284,668,000,000 | 284,668 | R5.htm (Consolidated Balance Sheets) | match |
| Walmart | FY2026 | Shareholders' equity | 99,617,000,000 | 99,617 | R5.htm (Consolidated Balance Sheets) | match |
| Walmart | FY2026 | Operating cash flow | 41,565,000,000 | 41,565 | R8.htm (Consolidated Statements of Cash Flows) | match |
| Walmart | FY2026 | Capital spending | 26,642,000,000 | 26,642 | R8.htm (Consolidated Statements of Cash Flows) | match |
| Walmart | FY2026 | Debt, line 1 of 3 | 34,624,000,000 | 34,624 | R5.htm (Consolidated Balance Sheets) | match |
| Walmart | FY2026 | Debt, line 2 of 3 | 3,542,000,000 | 3,542 | R5.htm (Consolidated Balance Sheets) | match |
| Walmart | FY2026 | Debt, line 3 of 3 | 6,596,000,000 | 6,596 | R5.htm (Consolidated Balance Sheets) | match |
| Walmart | FY2026 | Cash | 10,727,000,000 | 10,727 | R5.htm (Consolidated Balance Sheets) | match |
| | | *Filing* | | | [0000104169-26-000055](https://www.sec.gov/Archives/edgar/data/104169/000010416926000055/0000104169-26-000055-index.htm) | filed 2026-03-13 |
| Costco | FY2026 | Revenue | 303,154,000,000 | 303,154 | R3.htm (Consolidated Statements Of Income) | match |
| Costco | FY2026 | Operating income | 11,685,000,000 | 11,685 | R3.htm (Consolidated Statements Of Income) | match |
| Costco | FY2026 | Net income | 9,226,000,000 | 9,226 | R3.htm (Consolidated Statements Of Income) | match |
| Costco | FY2026 | Diluted EPS | 20.76 | 20.76 | R3.htm (Consolidated Statements Of Income) | match |
| Costco | FY2026 | Total assets | 89,045,000,000 | 89,045 | R5.htm (Consolidated Balance Sheets) | match |
| Costco | FY2026 | Shareholders' equity | 35,803,000,000 | 35,803 | R5.htm (Consolidated Balance Sheets) | match |
| Costco | FY2026 | Operating cash flow | 15,817,000,000 | 15,817 | R8.htm (Consolidated Statements Of Cash Flows) | match |
| Costco | FY2026 | Capital spending | 6,435,000,000 | 6,435 | R8.htm (Consolidated Statements Of Cash Flows) | match |
| Costco | FY2026 | Debt, line 1 of 2 | 3,914,000,000 | 3,914 | R5.htm (Consolidated Balance Sheets) | match |
| Costco | FY2026 | Debt, line 2 of 2 | 2,248,000,000 | 2,248 | R5.htm (Consolidated Balance Sheets) | match |
| Costco | FY2026 | Cash, line 1 of 2 | 20,207,000,000 | 20,207 | R5.htm (Consolidated Balance Sheets) | match |
| Costco | FY2026 | Cash, line 2 of 2 | 1,094,000,000 | 1,094 | R5.htm (Consolidated Balance Sheets) | match |
| | | *Filing* | | | [0000909832-26-000093](https://www.sec.gov/Archives/edgar/data/909832/000090983226000093/0000909832-26-000093-index.htm) | filed 2026-10-07 |
| Coca-Cola | FY2025 | Revenue | 47,941,000,000 | 47,941 | R3.htm (CONSOLIDATED STATEMENTS OF INCOME) | match |
| Coca-Cola | FY2025 | Operating income | 13,762,000,000 | 13,762 | R3.htm (CONSOLIDATED STATEMENTS OF INCOME) | match |
| Coca-Cola | FY2025 | Net income | 13,107,000,000 | 13,107 | R3.htm (CONSOLIDATED STATEMENTS OF INCOME) | match |
| Coca-Cola | FY2025 | Diluted EPS | 3.04 | 3.04 | R3.htm (CONSOLIDATED STATEMENTS OF INCOME) | match |
| Coca-Cola | FY2025 | Total assets | 104,816,000,000 | 104,816 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Coca-Cola | FY2025 | Shareholders' equity | 32,169,000,000 | 32,169 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Coca-Cola | FY2025 | Operating cash flow | 7,408,000,000 | 7,408 | R7.htm (CONSOLIDATED STATEMENTS OF CASH FLOWS) | match |
| Coca-Cola | FY2025 | Capital spending | 2,112,000,000 | 2,112 | R7.htm (CONSOLIDATED STATEMENTS OF CASH FLOWS) | match |
| Coca-Cola | FY2025 | Debt, line 1 of 3 | 42,119,000,000 | 42,119 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Coca-Cola | FY2025 | Debt, line 2 of 3 | 1,822,000,000 | 1,822 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| Coca-Cola | FY2025 | Debt, line 3 of 3 | 1,495,000,000 | 1,495 | R20.htm (DEBT AND BORROWING ARRANGEMENTS) | match (in a note, not on a statement) |
| Coca-Cola | FY2025 | Cash | 13,872,000,000 | 13,872 | R5.htm (CONSOLIDATED BALANCE SHEETS) | match |
| | | *Filing* | | | [0001628280-26-010047](https://www.sec.gov/Archives/edgar/data/21344/000162828026010047/0001628280-26-010047-index.htm) | filed 2026-02-20 |
| PepsiCo | FY2025 | Revenue | 93,925,000,000 | 93,925 | R3.htm (Consolidated Statement of Income) | match |
| PepsiCo | FY2025 | Operating income | 11,498,000,000 | 11,498 | R3.htm (Consolidated Statement of Income) | match |
| PepsiCo | FY2025 | Net income | 8,240,000,000 | 8,240 | R3.htm (Consolidated Statement of Income) | match |
| PepsiCo | FY2025 | Diluted EPS | 6.00 | 6.00 | R3.htm (Consolidated Statement of Income) | match |
| PepsiCo | FY2025 | Total assets | 107,399,000,000 | 107,399 | R6.htm (Consolidated Balance Sheet) | match |
| PepsiCo | FY2025 | Shareholders' equity | 20,406,000,000 | 20,406 | R6.htm (Consolidated Balance Sheet) | match |
| PepsiCo | FY2025 | Operating cash flow | 12,087,000,000 | 12,087 | R5.htm (Consolidated Statement of Cash Flows) | match |
| PepsiCo | FY2025 | Capital spending | 4,415,000,000 | 4,415 | R5.htm (Consolidated Statement of Cash Flows) | match |
| PepsiCo | FY2025 | Debt, line 1 of 2 | 42,321,000,000 | 42,321 | R6.htm (Consolidated Balance Sheet) | match |
| PepsiCo | FY2025 | Debt, line 2 of 2 | 6,861,000,000 | 6,861 | R6.htm (Consolidated Balance Sheet) | match |
| PepsiCo | FY2025 | Cash, line 1 of 2 | 9,159,000,000 | 9,159 | R6.htm (Consolidated Balance Sheet) | match |
| PepsiCo | FY2025 | Cash, line 2 of 2 | 371,000,000 | 371 | R6.htm (Consolidated Balance Sheet) | match |
| | | *Filing* | | | [0000077476-26-000007](https://www.sec.gov/Archives/edgar/data/77476/000007747626000007/0000077476-26-000007-index.htm) | filed 2026-02-03 |

### 3b. All 38 companies

Run on all 38 companies, 433 figures: **415 found on a primary financial statement, 17 found in a note to the
statements, 1 not found.** The 18 that are not on a primary statement:

| Company | Fiscal year | Figure | Stored value | Printed in filing as | Found on | Result |
|---|---|---|---:|---:|---|---|
| Alphabet (Google) | FY2025 | Debt, line 2 of 2 | 1,996,000,000 | 1,996 | R16.htm (Debt) | match (in a note, not on a statement) |
| Oracle | FY2026 | Debt | 129,541,000,000 | 129,541 | R17.htm (NOTES PAYABLE AND OTHER BORROWINGS) | match (in a note, not on a statement) |
| Adobe | FY2025 | Cash | 6,595,000,000 | 6,595 | R11.htm (CASH, CASH EQUIVALENTS AND SHORT-TERM INVESTMENTS) | match (in a note, not on a statement) |
| Cisco | FY2026 | Cash | 14,297,000,000 | 14,297 | R20.htm (Investments) | match (in a note, not on a statement) |
| Nvidia | FY2026 | Cash, line 2 of 2 | 39,065,000,000 | 39,065 | not found | **NOT FOUND: check by hand** |
| AMD | FY2025 | Debt | 3,222,000,000 | 3,222 | R17.htm (Debt and Revolving Credit Facility) | match (in a note, not on a statement) |
| Broadcom | FY2025 | Debt | 67,120,000,000 | 67,120 | R18.htm (Borrowings) | match (in a note, not on a statement) |
| Qualcomm | FY2026 | Debt | 14,613,000,000 | 14,613 | R13.htm (Debt) | match (in a note, not on a statement) |
| Micron | FY2026 | Debt | 5,179,000,000 | 5,179 | R15.htm (Debt) | match (in a note, not on a statement) |
| Amazon | FY2025 | Debt, line 2 of 3 | 2,748,000,000 | 2,748 | R15.htm (Debt) | match (in a note, not on a statement) |
| Amazon | FY2025 | Debt, line 3 of 3 | 455,000,000 | 455 | R15.htm (Debt) | match (in a note, not on a statement) |
| Home Depot | FY2026 | Debt | 51,308,000,000 | 51,308 | R13.htm (DEBT AND DERIVATIVE INSTRUMENTS) | match (in a note, not on a statement) |
| Coca-Cola | FY2025 | Debt, line 3 of 3 | 1,495,000,000 | 1,495 | R20.htm (DEBT AND BORROWING ARRANGEMENTS) | match (in a note, not on a statement) |
| Colgate-Palmolive | FY2025 | Debt, line 2 of 2 | 1,115,000,000 | 1,115 | R15.htm (Long-Term Debt and Credit Facilities) | match (in a note, not on a statement) |
| Colgate-Palmolive | FY2025 | Cash, line 2 of 2 | 107,000,000 | 107 | R16.htm (Fair Value Measurements and Financial Instruments) | match (in a note, not on a statement) |
| Tesla | FY2025 | Debt | 6,584,000,000 | 6,584 | R18.htm (Debt) | match (in a note, not on a statement) |
| McDonald's | FY2025 | Debt, line 2 of 3 | 725,000,000 | 725 | R20.htm (Debt Financing) | match (in a note, not on a statement) |
| McDonald's | FY2025 | Debt, line 3 of 3 | 798,000,000 | 798 | R20.htm (Debt Financing) | match (in a note, not on a statement) |

- **In a note.** Some companies show one "long-term debt" line on the balance sheet and give the split or the
  total in the debt note. The number is in the filing, on a later page. Small numbers such as 107 or 455 could
  match by coincidence, so these 17 are weaker evidence than the 415.
- **Nvidia, cash line 2 (not found).** Nvidia's FY2026 10-K does not tag its short-term securities with a
  standard tag. The $39.1B comes from the following quarterly report, which repeats the year-end balance
  sheet. The site lists this on the Methodology page under Nvidia. It is a correct figure for the right date
  from a different filing than the one linked.

### 3c. Balance sheets read by hand

For the totals that are sums, the balance sheet of the latest 10-K was read line by line:

| Company | Balance-sheet debt lines | Sum | Stored | Result |
|---|---|---:|---:|---|
| Apple FY2026 | Commercial paper 1,997 + term debt current 9,906 + term debt non-current 68,208 | 80,111 | 80,111 | match |
| Walmart FY2026 | Short-term borrowings 6,596 + long-term debt due within one year 3,542 + long-term debt 34,624 | 44,762 | 44,762 | match |
| PepsiCo FY2025 | Short-term debt obligations 6,861 + long-term debt obligations 42,321 | 49,182 | 49,182 | match after fix (see below) |
| Coca-Cola FY2025 | Loans and notes payable 1,551 + current maturities 1,822 + long-term debt 42,119 | 45,492 | 45,436 | **$56M (0.1%) low** |
| Alphabet FY2025 | Long-term debt 46,547 (balance sheet) + 1,996 (debt note) | 48,543 | 48,543 | match |
| Amazon FY2025 | Long-term debt 65,648 (balance sheet) + 2,748 + 455 (debt note) | 68,851 | 68,851 | match |
| McDonald's FY2025 | Long-term debt 39,973 (balance sheet) + 725 + 798 (debt note) | 41,496 | 41,496 | match |

Cash and short-term investments, same method: Apple 36,305 + 20,417 = 56,722 (match); PepsiCo 9,159 + 371 = 9,530
(match); Walmart 10,727 (match).

## 4. Independent recalculation

`tools/crosscheck.py` recalculates 19 measures per company in Python, longhand, from the stored filing figures,
and compares them with what `js/calc.js` produces. Two implementations written separately agreeing to nine
significant figures is strong evidence that neither has an arithmetic slip.

| Company | Measure | Website (JavaScript) | Recalculated (Python) | Result |
|---|---|---:|---:|---|
| Apple FY2026 | Gross margin | 48.79% | 48.79% | match |
| Apple FY2026 | Operating margin | 33.01% | 33.01% | match |
| Apple FY2026 | Net margin | 27.60% | 27.60% | match |
| Apple FY2026 | Revenue growth | 15.06% | 15.06% | match |
| Apple FY2026 | 3-year revenue CAGR | 7.70% | 7.70% | match |
| Apple FY2026 | Free cash flow | $136.06B | $136.06B | match |
| Apple FY2026 | FCF margin | 28.41% | 28.41% | match |
| Apple FY2026 | Debt-to-equity | 0.715x | 0.715x | match |
| Apple FY2026 | Current ratio | 1.023x | 1.023x | match |
| Apple FY2026 | Cash minus debt | $-23.39B | $-23.39B | match |
| Apple FY2026 | Return on equity | 142.26% | 142.26% | match |
| Apple FY2026 | Return on assets | 34.61% | 34.61% | match |
| Apple FY2026 | Asset turnover | 1.254x | 1.254x | match |
| Apple FY2026 | Tax rate used | 16.99% | 16.99% | match |
| Apple FY2026 | ROIC | 71.97% | 71.97% | match |
| Apple FY2026 | FCFF (approx.) | n/a | n/a | match |
| Apple FY2026 | DCF base growth | 7.70% | 7.70% | match |
| Apple FY2026 | DCF enterprise value | $2,676.89B | $2,676.89B | match |
| Apple FY2026 | DCF value per share | $180.26 | $180.26 | match |
| Microsoft FY2026 | Gross margin | 67.94% | 67.94% | match |
| Microsoft FY2026 | Operating margin | 46.78% | 46.78% | match |
| Microsoft FY2026 | Net margin | 40.31% | 40.31% | match |
| Microsoft FY2026 | Revenue growth | 17.79% | 17.79% | match |
| Microsoft FY2026 | 3-year revenue CAGR | 16.12% | 16.12% | match |
| Microsoft FY2026 | Free cash flow | $66.99B | $66.99B | match |
| Microsoft FY2026 | FCF margin | 20.19% | 20.19% | match |
| Microsoft FY2026 | Debt-to-equity | 0.091x | 0.091x | match |
| Microsoft FY2026 | Current ratio | 1.230x | 1.230x | match |
| Microsoft FY2026 | Cash minus debt | $36.55B | $36.55B | match |
| Microsoft FY2026 | Return on equity | 34.04% | 34.04% | match |
| Microsoft FY2026 | Return on assets | 19.42% | 19.42% | match |
| Microsoft FY2026 | Asset turnover | 0.482x | 0.482x | match |
| Microsoft FY2026 | Tax rate used | 19.40% | 19.40% | match |
| Microsoft FY2026 | ROIC | 28.79% | 28.79% | match |
| Microsoft FY2026 | FCFF (approx.) | $69.45B | $69.45B | match |
| Microsoft FY2026 | DCF base growth | 12.00% | 12.00% | match |
| Microsoft FY2026 | DCF enterprise value | $1,631.32B | $1,631.32B | match |
| Microsoft FY2026 | DCF value per share | $223.78 | $223.78 | match |
| Walmart FY2026 | Gross margin | 24.21% | 24.21% | match |
| Walmart FY2026 | Operating margin | 4.22% | 4.22% | match |
| Walmart FY2026 | Net margin | 3.10% | 3.10% | match |
| Walmart FY2026 | Revenue growth | 4.73% | 4.73% | match |
| Walmart FY2026 | 3-year revenue CAGR | 5.25% | 5.25% | match |
| Walmart FY2026 | Free cash flow | $14.92B | $14.92B | match |
| Walmart FY2026 | FCF margin | 2.11% | 2.11% | match |
| Walmart FY2026 | Debt-to-equity | 0.449x | 0.449x | match |
| Walmart FY2026 | Current ratio | 0.790x | 0.790x | match |
| Walmart FY2026 | Cash minus debt | $-34.03B | $-34.03B | match |
| Walmart FY2026 | Return on equity | 22.97% | 22.97% | match |
| Walmart FY2026 | Return on assets | 8.03% | 8.03% | match |
| Walmart FY2026 | Asset turnover | 2.590x | 2.590x | match |
| Walmart FY2026 | Tax rate used | 24.43% | 24.43% | match |
| Walmart FY2026 | ROIC | 16.42% | 16.42% | match |
| Walmart FY2026 | FCFF (approx.) | $16.67B | $16.67B | match |
| Walmart FY2026 | DCF base growth | 5.30% | 5.30% | match |
| Walmart FY2026 | DCF enterprise value | $296.51B | $296.51B | match |
| Walmart FY2026 | DCF value per share | $32.72 | $32.72 | match |
| Costco FY2026 | Gross margin | 12.82% | 12.82% | match |
| Costco FY2026 | Operating margin | 3.85% | 3.85% | match |
| Costco FY2026 | Net margin | 3.04% | 3.04% | match |
| Costco FY2026 | Revenue growth | 10.14% | 10.14% | match |
| Costco FY2026 | 3-year revenue CAGR | 7.76% | 7.76% | match |
| Costco FY2026 | Free cash flow | $9.38B | $9.38B | match |
| Costco FY2026 | FCF margin | 3.09% | 3.09% | match |
| Costco FY2026 | Debt-to-equity | 0.172x | 0.172x | match |
| Costco FY2026 | Current ratio | 1.060x | 1.060x | match |
| Costco FY2026 | Cash minus debt | $15.14B | $15.14B | match |
| Costco FY2026 | Return on equity | 28.40% | 28.40% | match |
| Costco FY2026 | Return on assets | 11.11% | 11.11% | match |
| Costco FY2026 | Asset turnover | 3.649x | 3.649x | match |
| Costco FY2026 | Tax rate used | 24.69% | 24.69% | match |
| Costco FY2026 | ROIC | 22.88% | 22.88% | match |
| Costco FY2026 | FCFF (approx.) | $9.49B | $9.49B | match |
| Costco FY2026 | DCF base growth | 7.80% | 7.80% | match |
| Costco FY2026 | DCF enterprise value | $187.52B | $187.52B | match |
| Costco FY2026 | DCF value per share | $456.00 | $456.00 | match |
| Coca-Cola FY2025 | Gross margin | 61.63% | 61.63% | match |
| Coca-Cola FY2025 | Operating margin | 28.71% | 28.71% | match |
| Coca-Cola FY2025 | Net margin | 27.34% | 27.34% | match |
| Coca-Cola FY2025 | Revenue growth | 1.87% | 1.87% | match |
| Coca-Cola FY2025 | 3-year revenue CAGR | 3.69% | 3.69% | match |
| Coca-Cola FY2025 | Free cash flow | $5.30B | $5.30B | match |
| Coca-Cola FY2025 | FCF margin | 11.05% | 11.05% | match |
| Coca-Cola FY2025 | Debt-to-equity | 1.412x | 1.412x | match |
| Coca-Cola FY2025 | Current ratio | 1.459x | 1.459x | match |
| Coca-Cola FY2025 | Cash minus debt | $-31.56B | $-31.56B | match |
| Coca-Cola FY2025 | Return on equity | 45.97% | 45.97% | match |
| Coca-Cola FY2025 | Return on assets | 12.76% | 12.76% | match |
| Coca-Cola FY2025 | Asset turnover | 0.467x | 0.467x | match |
| Coca-Cola FY2025 | Tax rate used | 17.88% | 17.88% | match |
| Coca-Cola FY2025 | ROIC | 15.41% | 15.41% | match |
| Coca-Cola FY2025 | FCFF (approx.) | $6.65B | $6.65B | match |
| Coca-Cola FY2025 | DCF base growth | 3.70% | 3.70% | match |
| Coca-Cola FY2025 | DCF enterprise value | $110.51B | $110.51B | match |
| Coca-Cola FY2025 | DCF value per share | $18.30 | $18.30 | match |
| PepsiCo FY2025 | Gross margin | 54.15% | 54.15% | match |
| PepsiCo FY2025 | Operating margin | 12.24% | 12.24% | match |
| PepsiCo FY2025 | Net margin | 8.77% | 8.77% | match |
| PepsiCo FY2025 | Revenue growth | 2.25% | 2.25% | match |
| PepsiCo FY2025 | 3-year revenue CAGR | 2.83% | 2.83% | match |
| PepsiCo FY2025 | Free cash flow | $7.67B | $7.67B | match |
| PepsiCo FY2025 | FCF margin | 8.17% | 8.17% | match |
| PepsiCo FY2025 | Debt-to-equity | 2.410x | 2.410x | match |
| PepsiCo FY2025 | Current ratio | 0.853x | 0.853x | match |
| PepsiCo FY2025 | Cash minus debt | $-39.65B | $-39.65B | match |
| PepsiCo FY2025 | Return on equity | 42.86% | 42.86% | match |
| PepsiCo FY2025 | Return on assets | 7.97% | 7.97% | match |
| PepsiCo FY2025 | Asset turnover | 0.908x | 0.908x | match |
| PepsiCo FY2025 | Tax rate used | 19.03% | 19.03% | match |
| PepsiCo FY2025 | ROIC | 14.11% | 14.11% | match |
| PepsiCo FY2025 | FCFF (approx.) | $8.58B | $8.58B | match |
| PepsiCo FY2025 | DCF base growth | 2.80% | 2.80% | match |
| PepsiCo FY2025 | DCF enterprise value | $137.06B | $137.06B | match |
| PepsiCo FY2025 | DCF value per share | $70.95 | $70.95 | match |

## 5. Discrepancies found and what was done

| # | Found by | Problem | Effect | Status |
|---|---|---|---|---|
| 1 | Reading PepsiCo's balance sheet (3c) | Total debt used the separately tagged "current maturities" (4.0B) instead of the balance-sheet line "short-term debt obligations" (6.9B), which also contains other short-term borrowings | PepsiCo FY2025 debt understated: 46.4B instead of 49.2B | **Fixed.** The rule now uses the current-debt line when there is one. Unit test added. Debt changed in at least one year for 11 companies, mostly by under 3%; Cisco (+6.6B), PepsiCo (+2.8B) and Target (+2.1B) the most |
| 2 | Re-running version 1's script | A balance-sheet figure from a later 10-Q could override a 10-K figure listed under a lower-priority tag | PepsiCo debt showed 53.2B and Walmart 38.2B on the live version 1 site, disagreeing with the AI summary text beside them | **Fixed in version 2** (10-K values always win). The live site still has the old figures until version 2 is deployed |
| 3 | Pipeline unit test on real data | Target tagged net income only as "net income available to common shareholders" for FY2017 to FY2020 | Four years of net income were missing | **Fixed.** Tag added as a fallback |
| 4 | Automatic check | Alphabet does not tag a combined share count, so its 20-for-1 split was not detected and pre-2022 EPS was 20 times too high | EPS trend wrong before FY2020 | **Fixed.** Splits are now also detected from restated EPS |
| 5 | Automatic check | McDonald's reports share counts in millions as a plain number | Share count 1,000,000 times too small | **Fixed.** Unit conversion with a note in the data |
| 6 | Reading Netflix's history | A "long-term debt" tag from the notes (22.4B) was used for FY2020 where the balance sheet shows 16.3B | Netflix FY2019 and FY2020 debt overstated | **Fixed** by the same rule change as #1 |
| 7 | Reading Coca-Cola's balance sheet (3c) | "Loans and notes payable" (1,551) is matched to the commercial paper tag (1,495) | Coca-Cola debt 0.1% low | **Open.** Too small to affect any ratio shown. Listed under known limitations |
| 8 | Automatic check | Reported EPS differs from net income / shares in a few early years (Microsoft FY2017, Salesforce FY2017 to FY2018, others) | None on the latest year. EPS uses the latest restated value while net income is as first reported | **Accepted.** Listed per company on the Methodology page |

## 6. Not verified

- Total debt was read by hand for 7 of 38 companies. For the other 31 only "each component appears in the filing" was checked.
- Only the latest fiscal year of each company was checked against its filing. Earlier years use the same code but were not individually matched.
- Interest expense, depreciation, tax, current assets and current liabilities were not matched against filings. They feed interest coverage, EBITDA, ROIC and the current ratio.
- The AI-written summaries were checked against the data by the AI that wrote them, and five sentences were corrected after discrepancy #1. No human has checked them.
- No lint, type-check or build step exists because the project has no build tooling. The equivalent run here is a syntax check of every script, which passes.

## How to repeat everything

```bash
sh financeiq/tests/run.sh                         # checks 1, 2, 4 and the syntax check
```

```bash
python3 financeiq/tools/validate_filings.py       # check 3a (downloads statement pages from sec.gov)
```
