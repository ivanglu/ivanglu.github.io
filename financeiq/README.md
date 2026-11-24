# FinanceIQ

Compare two public companies on revenue growth, profitability, debt and cash flow,
using figures from their SEC 10-K filings. Live at https://ivanglushchenko.com/financeiq/

## Files

| File | What it is |
|---|---|
| `index.html`, `financeiq.css`, `financeiq.js` | The page. Plain HTML, CSS and JavaScript, no libraries. |
| `ivan-analysis.txt` | **Ivan's own analysis.** Whatever is written here appears in the "Ivan's analysis" box. |
| `data/TICKER.json` | Ten years of 10-K figures per company, with a link to each filing. |
| `data/summaries.json` | The AI-written strengths and risks for each company. |
| `tools/build_data.py` | Downloads fresh data from the SEC EDGAR API. |

## Common jobs

**Write or edit the analysis:** open `ivan-analysis.txt`, type below the comment block, save, commit, push.

**Refresh the numbers** (after a company files a new 10-K):

```bash
python3 financeiq/tools/build_data.py
```

Then update `data/summaries.json` so the AI summaries match the new figures.

**Add a company:** add a line to `COMPANIES` in `tools/build_data.py` (ticker, SEC CIK number,
name, sector), run the script, and add a summary for it. Banks and insurers do not fit this
dashboard well because they report revenue and debt differently.

**Preview locally:** from the repository root run `python3 -m http.server 8765`
and open http://localhost:8765/financeiq/
