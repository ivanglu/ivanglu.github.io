# Data sources

## The one source

| | |
|---|---|
| Provider | U.S. Securities and Exchange Commission, EDGAR |
| Service | XBRL "company facts" API |
| Address | `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` (one file per company) |
| Cost | Free. No key, no account |
| Content | Every tagged number from every filing the company has made |
| Used by | `tools/build_data.py` |

A second SEC address is used only for checking: `tools/validate_filings.py` reads the rendered statement pages
inside each filing (`https://www.sec.gov/Archives/edgar/data/<CIK>/<accession>/R2.htm` and so on).

Nothing else is downloaded. There is no share-price source. A free one that is reliable and allows this use
was looked for and not found, so the Valuation page asks the user to type a price in.

## SEC fair-access rules

The SEC allows automated access on three conditions, and the script follows them:

1. **Identify yourself.** Requests send a `User-Agent` with a contact address. Set yours before running:

   ```bash
   export FINANCEIQ_CONTACT="your-email@example.com"
   ```

   The default is a placeholder. Replace it before running the script regularly.
2. **No more than 10 requests a second.** The script waits 0.25 seconds between downloads (4 a second).
3. **Do not download what you already have.** Each company file is cached in `tools/.cache/` for 24 hours.
   A full refresh is 38 requests.

## How a number gets from a filing to the site

1. **Tags.** Companies label the same idea differently. `build_data.py` lists the accepted tags for each line
   item in priority order (`FLOW` and `STOCK` near the top of the file) and uses the first with a value.
2. **Annual only.** For income and cash-flow items, only facts from a 10-K (or 10-K/A) covering 345 to 380
   days are accepted. That keeps 52- and 53-week years and rejects quarters.
3. **Original filing.** Each fiscal year appears in up to three 10-Ks. The earliest is kept, so the figure
   matches the report linked for that year. Amended and later filings do not overwrite it.
4. **Balance-sheet fallback.** If the 10-K does not tag a balance-sheet item under any accepted tag, the
   value from a later 10-Q that repeats the same year-end date is used and noted.
5. **Fiscal years.** A year is labelled by the calendar year in which it ends. "FY2026" is Sept 2026 for
   Apple, June 2026 for Microsoft and January 2026 for Walmart.
6. **Units.** Everything is stored in whole US dollars and whole shares. One company (McDonald's) reports
   share counts in millions; that is converted and noted.

## Figures that are built, not read

| Figure | How | Why |
|---|---|---|
| Total debt | Sum of balance-sheet debt lines (rule in `total_debt()`), components stored in `debtParts` | No single standard tag |
| Cash | Cash and equivalents + short-term investments, components in `cashParts` | Same |
| Gross profit | Revenue − cost of revenue, when only those are tagged | Noted per company |
| Pre-tax income | Domestic + foreign, when only the split is tagged | Noted per company |
| Depreciation | Depreciation + amortization of intangibles, when no combined tag exists | Noted per company |
| Interest expense | Cash interest paid, when no expense line exists | Noted per company |
| Diluted shares | Net income ÷ diluted EPS, when no combined share count is tagged (Alphabet) | Noted per company |

Every one of these is listed for each company on the Methodology page, generated from the `notes` field in the data.

## Stock splits

After a split, the next 10-K restates earlier years. So when two 10-Ks give different share counts (or EPS)
for the same fiscal year and the ratio is a whole number (or 1.5), a split happened between them. The script
finds these ratios and applies them to the years reported only in older filings. Detected in the current
data: Apple 4:1, Alphabet 20:1, Amazon 20:1, Nvidia 4:1 and 10:1, Broadcom 10:1, Walmart 3:1, TJX 2:1,
Tesla 5:1 and 3:1, Netflix 10:1.

## Automatic checks

Run on every build, results stored in each company's `warnings`:

- assets ≠ liabilities + equity by more than 3% (normally non-controlling interests);
- gross profit larger than revenue;
- reported EPS more than 6% away from net income ÷ diluted shares;
- a gap between fiscal years;
- share count changing by more than 40% in a year.

The build exits with an error if any company fails to download or has fewer than four usable years.

## The output file

`data/financials.json` (about 300 KB):

```
generated   when the build ran (shown on every page as "last successful update")
source, currency, period
companies[] ticker, name, legalName, group, blurb, cik, filingsUrl, splits[], warnings[]
  years[]   fy, end, filed, accn, url            which filing
            revenue … capex                      reported figures (null if not reported)
            eps, dilutedShares                   split-adjusted
            debtParts[], cashParts[]             the lines added up
            notes[]                              anything built or taken from another filing
```

## Known data limitations

- Tag quality is the company's. A figure tagged with an unusual or custom tag is missed and shows as "n/a".
- Debt excludes operating and finance lease liabilities (retailers and restaurants have large ones).
- Short-term borrowings other than commercial paper can be missed when a company uses its own label
  (Coca-Cola: $56M, 0.1% of its debt).
- "Cash" leaves out long-term investments, which understates the cushion at Apple and Alphabet.
- Some companies do not report gross profit (Disney, McDonald's, Starbucks, Oracle), operating income
  (Nike, IBM, TJX) or interest expense (Apple since FY2024).
- AI summaries are not regenerated when data is refreshed. `tools/check_summaries.py` reports any figure they
  quote that the data no longer contains.
