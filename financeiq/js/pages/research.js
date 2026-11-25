/* Ivan's Financial Research: a list of case studies, and one report view.

   research.html            -> the list
   research.html?r=ko-pep   -> one report
   add &draft=1 to see every section Ivan still has to write, with prompts

   FinanceIQ fills in the data, tables and charts. Everything in an orange
   "Written by Ivan" box comes from a text file in research/ that Ivan edits. */

(() => {
  const { isNum, fmt } = Calc;
  const { swatch, term } = Core;

  const REPORTS = [
    {
      id: "aapl-msft", pair: ["AAPL", "MSFT"], title: "Apple vs. Microsoft",
      question: "Which company has the more sustainable and financially resilient business model?",
      charts: ["revenue", "freeCashFlow", "opMargin", "netCash"],
      metrics: ["revenue", "cagr3", "opMargin", "netMargin", "freeCashFlow", "fcfMargin", "capexShare", "netCash", "interestCoverage", "roic"],
    },
    {
      id: "wmt-cost", pair: ["WMT", "COST"], title: "Walmart vs. Costco",
      question: "Does higher revenue necessarily indicate a stronger business?",
      charts: ["revenue", "growth", "netMargin", "roic"],
      metrics: ["revenue", "cagr3", "grossMargin", "netMargin", "netIncome", "roic", "assetTurnover", "freeCashFlow", "netCash", "debtToEquity"],
    },
    {
      id: "ko-pep", pair: ["KO", "PEP"], title: "Coca-Cola vs. PepsiCo",
      question: "Which company generates better returns on invested capital?",
      charts: ["roic", "opMargin", "freeCashFlow", "debt"],
      metrics: ["revenue", "opMargin", "nopat", "investedCapital", "roic", "roe", "assetTurnover", "fcfMargin", "debtToEquity", "netDebtToEbitda"],
    },
  ];

  // Rows available for the "key metrics" table of a report.
  const ROWS = {
    revenue: ["Revenue", "revenue", "money", (c) => c.L.revenue],
    cagr3: ["Revenue growth per year (3 years)", "cagr", "pct", (c) => c.cagr3],
    grossMargin: ["Gross margin", "grossMargin", "pct", (c) => c.L.grossMargin],
    opMargin: ["Operating margin", "opMargin", "pct", (c) => c.L.opMargin],
    netMargin: ["Net profit margin", "netMargin", "pct", (c) => c.L.netMargin],
    netIncome: ["Net income", "netIncome", "money", (c) => c.L.netIncome],
    nopat: ["Operating profit after tax (NOPAT)", "roic", "money", (c) => c.L.nopat],
    investedCapital: ["Invested capital (debt + equity)", "roic", "money", (c) => c.L.investedCapital],
    roic: ["Return on invested capital", "roic", "pct", (c) => c.L.roic],
    roe: ["Return on equity", "roe", "pct", (c) => c.L.roe],
    assetTurnover: ["Asset turnover", "assetTurnover", "ratio", (c) => c.L.assetTurnover],
    freeCashFlow: ["Free cash flow", "fcf", "money", (c) => c.L.freeCashFlow],
    fcfMargin: ["Free cash flow margin", "fcfMargin", "pct", (c) => c.L.fcfMargin],
    capexShare: ["Capital spending ÷ operating cash flow", "capex", "pct", (c) => Calc.div(c.L.capex, c.L.operatingCashFlow)],
    netCash: ["Cash minus debt", "netCash", "money", (c) => c.L.netCash],
    debtToEquity: ["Debt-to-equity", "debtToEquity", "ratio", (c) => c.L.debtToEquity],
    interestCoverage: ["Interest coverage", "interestCoverage", "ratio", (c) => c.L.interestCoverage],
    netDebtToEbitda: ["Net debt ÷ EBITDA", "netDebtToEbitda", "ratio", (c) => c.L.netDebtToEbitda],
  };

  // The sections Ivan writes. The heading in his text file must match the first item.
  const IVAN = {
    hypothesis: ["initial hypothesis", "Initial hypothesis", "Before looking closely at the numbers, what do you expect the answer to be, and why? Write it down first so you can be proved wrong."],
    findings: ["quantitative findings", "Quantitative findings", "State what the data shows, with numbers. Three to five findings. No opinions yet."],
    interpretation: ["interpretation", "Interpretation", "What do the findings mean for the research question? Explain the cause behind each number, not just the number."],
    counter: ["counterarguments", "Counterarguments", "Make the strongest case for the other company. What would someone who disagrees with you point to?"],
    risks: ["risks and limitations", "Risks and limitations", "What could make your conclusion wrong? What does this data not show (for example the future, the share price, things outside the financial statements)?"],
    conclusion: ["conclusion", "Conclusion", "Answer the research question in a few sentences. Was your hypothesis right?"],
  };

  const params = new URLSearchParams(location.search);
  const draft = params.get("draft") === "1";
  const file = (id) => `research/${id}.txt`;

  /* ---------------- list ---------------- */

  async function list() {
    const docs = await Promise.all(REPORTS.map((r) => Core.getText(file(r.id)).then(Core.parseDoc)));
    const cards = REPORTS.map((r, i) => {
      const written = Object.values(IVAN).filter(([key]) => docs[i].sections[key]).length;
      const total = Object.keys(IVAN).length;
      const status = written === total ? `Published${docs[i].meta.published ? " " + esc(docs[i].meta.published) : ""}`
        : written ? `In progress: ${written} of ${total} sections written` : "Data ready · analysis in progress";
      const [a, b] = r.pair.map(Core.company);
      return `
      <a class="fq-link" href="research.html?r=${r.id}${draft ? "&draft=1" : ""}">
        <span class="fq-badge" style="margin-bottom:10px">${status}</span>
        <strong>${esc(r.title)} →</strong>
        <span>${esc(r.question)}</span>
        <span style="display:block;margin-top:10px">${swatch(0)} ${esc(a.name)} FY${a.L.fy} &nbsp; ${swatch(1)} ${esc(b.name)} FY${b.L.fy}</span>
      </a>`;
    }).join("");
    $("#app").innerHTML = `
      <section class="fq-section">
        <h2>Case studies</h2>
        <div class="fq-three">${cards}</div>
      </section>
      <section class="fq-section fq-prose">
        <h2>How each report is put together</h2>
        <ol>
          <li><strong>A research question</strong> that the financial statements can help answer.</li>
          <li><strong>A hypothesis</strong>, written by Ivan before studying the numbers.</li>
          <li><strong>Data, key metrics and charts</strong>, filled in by FinanceIQ from each company's 10-K filings, with links to the filings.</li>
          <li><strong>Findings, interpretation, counterarguments, limitations and a conclusion</strong>, written by Ivan.</li>
        </ol>
        <p>Nothing in the sections marked "Written by Ivan" is produced by AI. The figures and charts are calculated by the same code as the rest of the site, described on the <a data-nav="methodology.html" href="methodology.html">methodology</a> page.</p>
      </section>`;
  }

  /* ---------------- one report ---------------- */

  function ivanBlock(doc, id) {
    const [key, title, prompt] = IVAN[id];
    if (doc.sections[key]) return `<div class="fq-card fq-ivan"><p class="fq-ivan__by">Written by Ivan Glushchenko</p>${doc.sections[key]}</div>`;
    if (draft) return `<div class="fq-todo"><strong>Draft view: "${title}" is not written yet.</strong><br>${prompt}<br><small>Add your text under the line <code>## ${title}</code> in <code>${file(current.id)}</code>.</small></div>`;
    return null;
  }

  let current = null, pair = [];
  const drawCharts = () => current.charts.forEach((k) => Views.chart($(`[data-chart="${k}"]`), pair, k, { years: 10, height: 220 }));

  async function report(r) {
    current = r;
    const [A, B] = (pair = r.pair.map(Core.company));
    const doc = Core.parseDoc(await Core.getText(file(r.id)));
    const blocks = Object.fromEntries(Object.keys(IVAN).map((id) => [id, ivanBlock(doc, id)]));
    const anyWritten = Object.keys(IVAN).some((id) => doc.sections[IVAN[id][0]]);
    let n = 0;
    const section = (title, body) => (body ? `<h2 class="fq-report-h"><span>${String(++n).padStart(2, "0")}</span>${title}</h2>${body}` : "");

    const metricRows = r.metrics.map((id) => {
      const [label, t, kind, get] = ROWS[id];
      return `<tr><td>${term(t, label)}</td><td>${fmt(get(A), kind)}</td><td>${fmt(get(B), kind)}</td></tr>`;
    }).join("");
    const filings = (c, i) => `<p>${swatch(i)} <strong>${esc(c.legalName)}</strong>: ` + c.years.slice(-5).reverse().map((y) =>
      `<a href="${esc(y.url)}" target="_blank" rel="noopener">FY${y.fy} 10-K</a> <span class="fq-muted">(filed ${y.filed})</span>`).join(", ") + `</p>`;
    const dates = [doc.meta.published && `Published ${esc(doc.meta.published)}`, doc.meta.revised && `Revised ${esc(doc.meta.revised)}`].filter(Boolean).join(" · ");

    $("#app").innerHTML = `
      <section class="fq-section">
        <p><a href="research.html${draft ? "?draft=1" : ""}">← All case studies</a></p>
        <p class="fq-eyebrow" style="margin-top:18px">Case study · ${esc(r.title)}</p>
        <p class="fq-rq">${esc(r.question)}</p>
        <p class="fq-muted">By Ivan Glushchenko${dates ? " · " + dates : ""} · Data as of FY${A.L.fy} (${esc(A.name)}) and FY${B.L.fy} (${esc(B.name)})</p>
        ${anyWritten || draft ? "" : `<p class="fq-note">Ivan's written analysis for this case study is in progress. The data, metrics and charts below are filled in automatically from the companies' annual reports.</p>`}
        ${draft ? `<p class="fq-note fq-note--warn">Draft view. Dashed boxes are sections still to be written. Visitors do not see them.</p>` : ""}

        ${section("Initial hypothesis", blocks.hypothesis)}
        ${section("Financial data and sources", `<div class="fq-card">
          <p>All figures come from annual reports (Form 10-K) filed with the U.S. Securities and Exchange Commission, read through the SEC's EDGAR data service. Dollar amounts are shown as first reported.</p>
          ${filings(A, 0)}${filings(B, 1)}</div>`)}
        ${section("Key financial metrics", `<div class="fq-card"><div class="fq-tablewrap"><table class="fq-table">
          <thead><tr><th>Latest fiscal year</th><th><span class="fq-th">${swatch(0)}${esc(A.name)} · FY${A.L.fy}</span></th><th><span class="fq-th">${swatch(1)}${esc(B.name)} · FY${B.L.fy}</span></th></tr></thead>
          <tbody>${metricRows}</tbody></table></div></div>`)}
        ${section("Supporting charts", `${Views.legend(A, B)}<div class="fq-two" style="margin-top:10px">${r.charts.map((k) => `
          <article class="fq-card fq-mini"><h3>${esc(Views.METRICS[k].label)}</h3><div class="fq-chart" data-chart="${k}"></div></article>`).join("")}</div>`)}
        ${section("Quantitative findings", blocks.findings)}
        ${section("Interpretation", blocks.interpretation)}
        ${section("Counterarguments", blocks.counter)}
        ${section("Risks and limitations", blocks.risks)}
        ${section("Conclusion", blocks.conclusion)}

        <div class="fq-cta" style="margin-top:28px">
          <a class="fq-btn" href="index.html#${A.ticker}-${B.ticker}">Open this pair in the dashboard</a>
          <a class="fq-btn" href="report.html#${A.ticker}-${B.ticker}">Download the data report (PDF)</a>
        </div>
      </section>`;
    drawCharts();
  }

  Core.start({
    page: "research",
    usesPair: false,
    render() {
      const r = REPORTS.find((x) => x.id === params.get("r"));
      return r ? report(r) : list();
    },
  });
  Core.onResize(() => current && drawCharts());
})();
