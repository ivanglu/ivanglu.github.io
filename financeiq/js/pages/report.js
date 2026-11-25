/* Printable research report for the selected pair of companies.
   "Save as PDF" uses the browser's print dialog; financeiq.css has the print layout. */

(() => {
  const { isNum, fmt, money, pct } = Calc;
  const { swatch } = Core;
  let pair = [];
  const CHARTS = ["revenue", "freeCashFlow", "opMargin", "eps"];

  const today = () => new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  function categoryTable(A, B, ra, rb) {
    const row = (label, a, b, strong) => `<tr class="${strong ? "fq-strong" : ""}"><td>${label}</td><td>${Views.scoreText(a)}</td><td>${Views.scoreText(b)}</td></tr>`;
    return `<div class="fq-tablewrap"><table class="fq-table">
      <thead><tr><th>Financial Health Score (0 to 100)</th><th><span class="fq-th">${swatch(0)}${esc(A.name)}</span></th><th><span class="fq-th">${swatch(1)}${esc(B.name)}</span></th></tr></thead>
      <tbody>${ra.categories.map((c, i) => row(`${c.label} <span class="fq-muted">(weight ${c.weight.toFixed(0)}%)</span>`, c.score, rb.categories[i].score)).join("")}
      ${row("Overall", ra.overall, rb.overall, true)}
      <tr><td>Rating band</td><td>${Calc.band(ra.overall)}</td><td>${Calc.band(rb.overall)}</td></tr>
      <tr><td>Measures available</td><td>${ra.coverage.used} of ${ra.coverage.total}</td><td>${rb.coverage.used} of ${rb.coverage.total}</td></tr></tbody></table></div>`;
  }

  function highlights(c, i, result) {
    const h = Calc.highlights(result);
    const ai = Core.state.summaries.companies[c.ticker];
    const list = (items) => (items.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="fq-muted">None by the scoring rules.</p>`);
    return `<div class="fq-card fq-avoid-break">
      <h3>${swatch(i)}${esc(c.name)} (${c.ticker})</h3>
      <p><strong>Highest-scoring measures</strong></p>${list(h.strengths)}
      <p><strong>Lowest-scoring measures</strong></p>${list(h.weaknesses)}
      ${ai ? `<p><strong>AI-generated summary</strong> <span class="fq-muted">(${esc(Core.state.summaries.model)}, ${esc(Core.state.summaries.generated)})</span></p>
        <ul>${ai.strengths.slice(0, 2).map((t) => `<li>Strength: ${esc(t)}</li>`).join("")}${ai.risks.slice(0, 2).map((t) => `<li>Risk: ${esc(t)}</li>`).join("")}</ul>` : ""}
    </div>`;
  }

  function dcfBlock(c, i) {
    const run = Views.dcfRun(c), input = run.input;
    return `<div class="fq-card fq-avoid-break">
      <h3>${swatch(i)}${esc(c.name)} (${c.ticker})</h3>
      <p class="fq-muted">Starting ${input.usesFcff ? "free cash flow to the firm" : "free cash flow (after interest; interest expense not reported)"} ${money(input.fcf0)} ·
        ${input.years}-year projection · cash ${money(input.cash)} · debt ${money(input.debt)} · ${fmt(input.shares, "shares")} diluted shares ·
        ${input.custom ? "assumptions edited by the user" : "default assumptions"}</p>
      ${Views.dcfScenarioTable(c, run, null)}
      ${input.fcf0 <= 0 ? `<p class="fq-muted">Starting cash flow is not positive, so these values are not meaningful.</p>` : ""}
    </div>`;
  }

  function benchBlock(c, i) {
    const b = Views.benchmark(c);
    if (!b) return `<div class="fq-card fq-avoid-break"><h3>${swatch(i)}${esc(c.name)}</h3><p class="fq-muted">Not in a tracked peer group, so no benchmark is shown.</p></div>`;
    return `<div class="fq-card fq-avoid-break">
      <h3>${swatch(i)}${esc(c.name)} <small class="fq-muted">vs ${b.peers.length} ${esc(c.group)} companies</small></h3>
      <div class="fq-tablewrap"><table class="fq-table">
        <thead><tr><th>Measure</th><th>Company</th><th>Peer median</th><th>Rank</th></tr></thead>
        <tbody>${b.rows.map((r) => `<tr><td>${r.label}</td><td>${fmt(r.value, r.fmt)}</td><td>${fmt(r.median, r.fmt)}</td><td>${r.rank ? `${r.rank} of ${r.of}` : "n/a"}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="fq-muted">Peers: ${b.peers.map((p) => esc(p.name)).join(", ")}.</p></div>`;
  }

  function sources(c, i) {
    return `<p>${swatch(i)} <strong>${esc(c.legalName)}</strong> (CIK ${c.cik}): ` + c.years.slice(-5).reverse().map((y) =>
      `FY${y.fy} (year ended ${y.end}, 10-K filed ${y.filed}, accession ${y.accn})`).join("; ") + `.</p>`;
  }

  const draw = () => CHARTS.forEach((k) => Views.chart($(`[data-chart="${k}"]`), pair, k, { years: 5, height: 190 }));

  Core.start({
    page: "report",
    usesPair: true,
    render(A, B) {
      pair = [A, B];
      const ra = Core.score(A), rb = Core.score(B);
      const d = Core.state.data;
      document.title = `FinanceIQ report: ${A.name} vs ${B.name}`;
      let n = 0;
      const h = (title) => `<h2>${++n}. ${title}</h2>`;
      $("#app").innerHTML = `
        <div class="fq-masthead">
          <div><span class="fq-brand"><span class="fq-brand__mark">F</span>FinanceIQ</span>
            <h1>${esc(A.name)} vs. ${esc(B.name)}</h1>
            <div class="fq-muted">${A.ticker} and ${B.ticker} · Financial comparison report</div></div>
          <div>Report generated ${today()}<br>Data updated ${esc(d.generated)}<br>${Core.SITE_URL.replace("https://", "")}</div>
        </div>
        <p class="fq-muted">${esc(A.name)}: ${esc(A.blurb)}, fiscal year ended ${A.L.end}. ${esc(B.name)}: ${esc(B.blurb)}, fiscal year ended ${B.L.end}.
          All figures are from Form 10-K filings with the U.S. Securities and Exchange Commission.</p>

        ${h("Financial health scores")}
        ${categoryTable(A, B, ra, rb)}

        ${h("Financial comparison")}
        ${Views.scorecard(A, B)}

        ${h("Five-year trends")}
        ${Views.legend(A, B)}
        <div class="fq-two fq-avoid-break">${CHARTS.map((k) => `<div class="fq-mini"><h3>${Views.METRICS[k].label}</h3><div class="fq-chart" data-chart="${k}"></div></div>`).join("")}</div>

        ${h("Key strengths and weaknesses")}
        <div class="fq-two">${highlights(A, 0, ra)}${highlights(B, 1, rb)}</div>

        ${h("Discounted cash flow valuation")}
        <p>Enterprise-value DCF: projected free cash flow is discounted to today, a terminal value covers later years, then debt is subtracted and cash added. Three scenarios are shown because the result depends heavily on the assumptions.</p>
        <div class="fq-grid">${dcfBlock(A, 0)}${dcfBlock(B, 1)}</div>

        ${h("Industry benchmarks")}
        <div class="fq-two">${benchBlock(A, 0)}${benchBlock(B, 1)}</div>

        ${h("Data sources and reporting dates")}
        ${sources(A, 0)}${sources(B, 1)}
        <p class="fq-muted">Source: ${esc(d.source)}. Filings can be read at sec.gov/edgar by searching for the company name or CIK number.</p>

        ${h("Methodology and limitations")}
        <ul>
          <li>Dollar amounts are as first reported in each annual report. EPS and share counts are adjusted for later stock splits. Fiscal years end in different months.</li>
          <li>The Financial Health Score converts 19 measures to 0 to 100 points on fixed, published scales and averages them by category. The same scale is used for every industry, so companies in different industries are not directly comparable. Measures that cannot be calculated are left out, not scored as zero.</li>
          <li>Debt excludes lease obligations. Free cash flow is operating cash flow minus capital spending and is not adjusted for stock-based pay or acquisitions.</li>
          <li>The DCF uses one constant growth rate and illustrative discount rates that are not estimated for each company. Small changes in assumptions change the result substantially.</li>
          <li>Peer medians are medians of a short named list of companies, not industry-wide averages.</li>
          <li>Full methodology: ${Core.SITE_URL.replace("https://", "")}methodology.html</li>
        </ul>

        ${h("Disclaimer")}
        <p>This report is produced by FinanceIQ, a student educational project by Ivan Glushchenko. It is not investment advice, not a recommendation to buy or sell any security, and not a forecast of share prices. It may contain errors. Check any figure against the original filing before relying on it.</p>
        <p class="fq-muted" style="margin-top:22px;border-top:1px solid var(--border-strong);padding-top:8px">FinanceIQ · ${Core.SITE_URL.replace("https://", "")} · ${esc(A.ticker)} vs ${esc(B.ticker)} · ${today()}</p>`;
      draw();
    },
  });

  document.addEventListener("click", (e) => { if (e.target.closest("#print")) window.print(); });
  window.addEventListener("beforeprint", draw);
  Core.onResize(() => pair.length && draw());
})();
