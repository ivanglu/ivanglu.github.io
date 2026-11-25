# FinanceIQ

A financial research tool for comparing public companies, built on the annual reports they file with the SEC.

Live: https://ivanglushchenko.com/financeiq/

- **Financial Health Score:** 0–100, from 19 measures in five categories, with adjustable weights.
- **DCF valuation simulator:** three scenarios and a sensitivity table.
- **Historical trends** and **industry benchmarks** for 38 companies.
- **Ivan's Financial Research:** case studies with data filled in automatically and analysis written by Ivan.
- **Printable PDF report** for any pair of companies.

Plain HTML, CSS and JavaScript with a Python data script. No framework, no dependencies, no server, no cost.

## Documentation

| File | What it covers |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the code is organised and why |
| [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md) | Where the numbers come from and how they are processed |
| [docs/FINANCIAL_METHODOLOGY.md](docs/FINANCIAL_METHODOLOGY.md) | Every formula, the scoring rules, the DCF model |
| [docs/FINANCIAL_VALIDATION.md](docs/FINANCIAL_VALIDATION.md) | What was tested, the results, and what is not verified |
| [docs/INTERVIEW_PREPARATION.md](docs/INTERVIEW_PREPARATION.md) | Explanations, questions and exercises for Ivan |
| [docs/IMPROVEMENT_PLAN.md](docs/IMPROVEMENT_PLAN.md) | The audit of version 1, the plan and what comes next |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | What changed in each version |

## Ivan's files

These four text files hold Ivan's own writing. The site shows a section as soon as it has text in it.

| File | Appears on |
|---|---|
| `research/aapl-msft.txt` | Research → Apple vs. Microsoft |
| `research/wmt-cost.txt` | Research → Walmart vs. Costco |
| `research/ko-pep.txt` | Research → Coca-Cola vs. PepsiCo |
| `about.txt` | About |

Each file starts with instructions. To see which sections are still empty, add `draft=1` to the address:
`research.html?r=ko-pep&draft=1` or `about.html?draft=1`.

## Run it on your computer

From the repository root (the folder that contains `financeiq/`):

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/financeiq/ . Opening the HTML files directly from disk does not work, because
browsers block pages opened that way from loading data files.

## Run the tests

```bash
sh financeiq/tests/run.sh
```

This runs the formula tests, the data-pipeline tests, the independent Python recalculation, the check of figures
quoted in the AI summaries and a syntax check of every script. It needs a Mac (it uses the JavaScript engine built into macOS) or Node.js. The formula tests
also run in any browser at `financeiq/tests/`.

To check stored figures against the filings themselves (downloads from sec.gov, takes about a minute):

```bash
python3 financeiq/tools/validate_filings.py
```

## Refresh the data

Do this when a company files a new annual report.

```bash
export FINANCEIQ_CONTACT="your-email@example.com"
```

```bash
python3 financeiq/tools/build_data.py --refresh
```

```bash
sh financeiq/tests/run.sh
```

The first line tells the SEC who is asking, which their rules require. Then:

1. Read the build output for anything marked `!!` or `FAILED`.
2. Check the Methodology page for new data notes.
3. The AI summaries in `data/summaries.json` quote figures and are **not** updated automatically. The test run
   lists every quoted figure that no longer matches the data. Rewrite those sentences, or remove the company's
   entry and the site will say that no summary exists.
4. Regenerate the sample PDF: open `report.html#AAPL-MSFT`, press "Save as PDF", and replace the file in `reports/`.

## Deploy

GitHub Pages publishes whatever is on the `main` branch. Version 2 was built on the branch `financeiq-v2`.

```bash
git checkout main
```

```bash
git merge financeiq-v2
```

```bash
git push origin main
```

The site updates within a couple of minutes. Cloudflare may serve the old files for up to ten minutes.

Before deploying, check the site locally, run the tests, and read the About page's statement on how AI was used
to make sure it is accurate.

## Known limitations

Short version: annual data only, 38 US companies, no banks, no live prices, debt excludes leases, one scoring
scale for all industries, and a deliberately simple DCF. The full list is in
[docs/FINANCIAL_VALIDATION.md](docs/FINANCIAL_VALIDATION.md) and [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

FinanceIQ is an educational project. Nothing in it is investment advice.
