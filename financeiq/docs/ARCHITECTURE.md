# Architecture

FinanceIQ is a static website. There is no server, no database and no build step. A Python script prepares one
data file ahead of time; the browser does everything else.

```
  SEC EDGAR                 your computer                              visitor's browser
 ───────────        ─────────────────────────────        ────────────────────────────────────────────
  10-K filings  →   tools/build_data.py                   data/financials.json
  (tagged data)       download, cache, rate-limit    →      ↓
                      match tags, original filing          js/calc.js      ratios, score, DCF, peers
                      split adjustment, checks              ↓
                      ↓                                    js/views.js     shared tables and cards
                    data/financials.json                    js/chart.js     SVG line chart
                    (committed to the repository)           ↓
                                                           js/pages/*.js   one script per page
```

## Files

```
financeiq/
  index.html            Overview            js/pages/overview.js
  compare.html          Comparison          js/pages/compare.js
  health.html           Financial Health    js/pages/health.js
  valuation.html        Valuation (DCF)     js/pages/valuation.js
  trends.html           Historical trends   js/pages/trends.js
  benchmarks.html       Industry benchmarks js/pages/benchmarks.js
  research.html         Research center     js/pages/research.js
  methodology.html      Methodology         js/pages/methodology.js
  about.html            About               js/pages/about.js
  report.html           Printable report    js/pages/report.js
  financeiq.css         All styles, including the print layout

  company.html          One company            js/pages/company.js
  screener.html         Screener               js/pages/screener.js
  watchlist.html        Watchlist              js/pages/watchlist.js
  (index.html is the dashboard: js/pages/dashboard.js)

  js/calc.js            Every financial formula, quarterly/TTM, DCF, valuation. No browser code.
  js/quant.js           Price and volume indicators. No browser code.
  js/ratings.js         The five-category stock rating. No browser code.
  js/screen.js          Screener rows, filters, sorting, CSV, search ranking. No browser code.
  js/chart.js           The line chart.
  js/core.js            Data loading, navigation, company picker, glossary, saved settings, tour.
  js/views.js           HTML pieces used by more than one page.

  data/financials.json  Built by tools/build_data.py. Do not edit by hand.
  data/summaries.json   AI-written strengths and risks.
  data/ratings-history.json  Dated rating snapshots. Appended by tools/snapshot_ratings.py.
  data/prices.json      Market data. Empty unless tools/build_prices.py is given licensed files.

  research/*.txt        Ivan's case-study text.        ← Ivan edits these
  about.txt             Ivan's About-page text.        ← Ivan edits this

  tools/build_data.py        Data pipeline.
  tools/test_build_data.py   Its tests.
  tools/validate_filings.py  Checks stored figures against the filings.
  tools/crosscheck.py        Recalculates ratios independently in Python.
  tools/crosscheck_quant.py  Recalculates market indicators independently in Python.
  tools/snapshot_ratings.py  Saves a dated snapshot of every rating.
  tools/build_prices.py      Converts licensed price files into data/prices.json.
  tools/check_summaries.py   Checks every figure quoted in the AI summaries.

  tests/tests.js        Tests for calc.js.     tests/index.html shows them in a browser.
  tests/run.sh          Runs every test from the terminal.

  reports/              Sample PDF report.
  docs/                 This documentation.
```

## The layers, and the rule between them

| Layer | File | May use | Must not |
|---|---|---|---|
| Data | `financials.json` | – | contain calculated ratios |
| Calculation | `calc.js` | the data | touch the page (`document`, `window`) |
| Shared views | `core.js`, `views.js`, `chart.js` | `calc.js` | contain formulas |
| Pages | `pages/*.js` | everything above | contain formulas |

The one rule that matters: **a formula lives in `calc.js` and nowhere else.** That is what lets the tests cover
every number on the site, and it means there is exactly one place to look when a number seems wrong.

## How a page starts

Every HTML page loads the same four scripts and then its own:

```html
<script src="js/calc.js"></script>
<script src="js/chart.js"></script>
<script src="js/core.js"></script>
<script src="js/views.js"></script>
<script src="js/pages/health.js"></script>
```

The page script calls `Core.start({ page, usesPair, render })`. `Core.start`:

1. draws the navigation;
2. fetches `financials.json` and `summaries.json`;
3. runs `Calc.derive()` on every company (adds margins, returns, growth rates to each year);
4. works out which two companies are selected (URL, then last visit, then Apple and Microsoft);
5. draws the company picker and calls the page's `render(A, B)`.

When the user picks a different company, `render` is called again.

## State

| What | Where | Why |
|---|---|---|
| Selected pair | URL hash `#AAPL-MSFT`, copied to `localStorage` | Any view can be shared as a link, and survives moving between pages |
| Score weights | `localStorage` | Used by the Health, Overview and Report pages |
| DCF assumptions | `localStorage`, per company and fiscal year | The report prints the assumptions the user chose. Discarded when a new fiscal year arrives |
| Tour step | `sessionStorage` | Ends when the tab closes |

Nothing leaves the browser. There are no cookies, accounts, analytics or third-party requests.

## Design decisions

| Decision | Alternative | Why this one |
|---|---|---|
| No framework | React, Vue | Nothing to install or update, and every line is readable by a beginner |
| Data built ahead of time | Fetch from the SEC in the browser | The SEC service does not allow cross-site browser requests and requires an identifying header |
| One data file | One per company | One request. Benchmarks need every company anyway |
| Hand-written SVG chart | Chart.js, D3 | One chart type is needed. No dependency to audit |
| Formulas in the browser | Pre-compute in Python | The sliders need live recalculation, and one implementation is easier to trust than two |
| Print stylesheet for PDF | A PDF library | The browser already makes PDFs well |
| Text files for Ivan's writing | Editing HTML | He can write without touching code, and his words are stored apart from generated content |

## Security

- Static files only. No secrets, keys or credentials anywhere in the project.
- Every page sets a Content-Security-Policy that allows scripts, styles and data only from the site itself.
- All text from data files and from Ivan's text files is HTML-escaped before display. The mini-Markdown in
  `core.js` allows only bold, italic, lists and `https://` links.
- External links open with `rel="noopener"`.

## Adding things

**A company:** add a line to `COMPANIES` in `build_data.py` (ticker, CIK, name, peer group, description), run
the script, run the tests, run `validate_filings.py TICKER`.

**A chartable measure:** calculate it in `Calc.derive()`, add it to `METRICS` in `views.js`, add a test.

**A scoring measure:** add an entry to `SCORE_MODEL` in `calc.js`. The Health page, Methodology page and report
all read that list, so they update themselves. Update the "19 measures" count in the tests and page text.

**A research case study:** add an entry to `REPORTS` in `pages/research.js` and a text file in `research/`.

## Deployment

GitHub Pages serves the `main` branch of the repository. Publishing is a `git push` to `main`. See the README.

## Version 3 notes

**Three ways in.** `Core.start({ mode })` takes `"single"` (address `#NVDA`, the company page), `"pair"`
(`#NVDA-MSFT`, the comparison pages) or `"none"` (dashboard, screener, watchlist). Opening a pair page with a
single ticker picks a peer as the second company.

**Ratings are calculated in the browser** on every page load, from `financials.json` and, if present,
`prices.json`. Nothing about a rating is stored except the dated snapshots used to show changes.

**Market data is optional by design.** `prices.json` ships with `"series": null`. Every page checks for it and
degrades to "not available" with an explanation. Adding licensed data needs no code change.

**Search** is one component (`Core.combo`) used in the top bar, on the dashboard, in both comparison pickers
and for "Compare with". Ranking is in `Screen.search` and is unit-tested.

**Everything personal stays in the browser:** watchlist, recent companies, weights, saved screen, DCF
assumptions, typed prices, theme.

**Scheduled refresh.** `docs/github-workflow.example.yml` is a ready-made GitHub Actions workflow. It is an
example, not active: copy it to `.github/workflows/` to turn it on.
