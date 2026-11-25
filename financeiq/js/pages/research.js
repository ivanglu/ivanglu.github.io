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
    {
      id: "nvda-msft", pair: ["NVDA", "MSFT"], title: "Nvidia vs. Microsoft",
      question: "Who captures more economic value from AI?",
      charts: ["revenue", "opMargin", "freeCashFlow", "capex"],
      metrics: ["revenue", "cagr3", "grossMargin", "opMargin", "netIncome", "freeCashFlow", "capexShare", "roic", "netCash"],
    },
    // Questions about all tracked companies. `universe` lists the columns of the data table.
    {
      id: "strong-but-unattractive", title: "Strong company, unattractive investment?",
      question: "Can a financially strong company be an unattractive investment?",
      universe: ["health", "fundamental", "quality", "valuation", "roic", "revenueGrowth"], sort: "health",
      needsMarket: "Answering this fully needs the Valuation grade, which needs share prices. Until market data is connected, the table shows business strength only.",
    },
    {
      id: "momentum-vs-fundamentals", title: "Momentum and fundamentals",
      question: "Does market momentum provide information beyond financial fundamentals?",
      universe: ["fundamental", "earnings", "quant", "revenueGrowth", "epsGrowth"], sort: "fundamental",
      needsMarket: "The Quantitative momentum grade needs daily share prices, which are not connected. The table shows the fundamentals side of the comparison.",
    },
    {
      id: "quality-outperformance", title: "Do high-quality companies outperform?",
      question: "Do high-quality companies outperform their lower-quality peers?",
      universe: ["quality", "roic", "opMargin", "revenueGrowth", "relative6m"], sort: "quality",
      needsMarket: "\"Outperform\" means share-price returns, which need price history. FinanceIQ began saving dated rating snapshots on 25 November 2026, so a fair test becomes possible only as time passes. The table shows quality grades today.",
    },
    {
      id: "weight-sensitivity", title: "How much do the weights matter?",
      question: "How sensitive are stock rankings to different scoring weights?",
      universe: ["rankBalanced", "rankGrowth", "rankQuality", "rankConservative", "rankRange"], sort: "rankRange",
    },
  ];

  // Columns available for the all-companies table of a universe report.
  const presetRank = (name) => {
    const rated = Ratings.rateAll(Core.state.list, Core.state.market, Ratings.PRESETS[name]);
    const order = [...Core.state.list].sort((a, b) => rated[b.ticker].overall - rated[a.ticker].overall).map((c) => c.ticker);
    return (c) => order.indexOf(c.ticker) + 1;
  };
  const UCOLS = {
    health: ["Financial Health Score", "score", (c) => Core.score(c).overall],
    fundamental: ["Fundamentals", "score", (c) => Core.rating(c.ticker).categories[0].score],
    quant: ["Quantitative", "score", (c) => Core.rating(c.ticker).categories[1].score],
    valuation: ["Valuation", "score", (c) => Core.rating(c.ticker).categories[2].score],
    earnings: ["Earnings momentum", "score", (c) => Core.rating(c.ticker).categories[3].score],
    quality: ["Financial quality", "score", (c) => Core.rating(c.ticker).categories[4].score],
    roic: ["ROIC", "pct", (c) => c.L.roic], opMargin: ["Operating margin", "pct", (c) => c.L.opMargin],
    revenueGrowth: ["Revenue growth (TTM)", "pct", (c) => c.ttm.revenueGrowth], epsGrowth: ["EPS growth (TTM)", "pct", (c) => c.ttm.epsGrowth],
    relative6m: ["6-month relative strength", "pct", (c) => { const m = Core.state.market && Core.state.market[c.ticker]; return m ? m.q.relative6m : null; }],
    rankBalanced: ["Rank: Balanced", "rank", null], rankGrowth: ["Rank: Growth", "rank", null], rankQuality: ["Rank: Quality", "rank", null],
    rankConservative: ["Rank: Conservative", "rank", null], rankRange: ["Largest rank change", "rank", null],
  };

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
      const [a, b] = r.pair ? r.pair.map(Core.company) : [null, null];
      return `
      <a class="fq-link" href="research.html?r=${r.id}${draft ? "&draft=1" : ""}">
        <span class="fq-badge" style="margin-bottom:10px">${status}</span>
        <strong>${esc(r.title)} →</strong>
        <span>${esc(r.question)}</span>
        <span style="display:block;margin-top:10px">${a ? `${swatch(0)} ${esc(a.name)} FY${a.L.fy} &nbsp; ${swatch(1)} ${esc(b.name)} FY${b.L.fy}` : `All ${Core.state.list.length} tracked companies`}</span>
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

  // A report about every tracked company: Ivan's sections around one sortable data table.
  async function universeReport(r) {
    current = null;
    const doc = Core.parseDoc(await Core.getText(file(r.id)));
    current = r;
    const blocks = Object.fromEntries(Object.keys(IVAN).map((id) => [id, ivanBlock(doc, id)]));
    const anyWritten = Object.keys(IVAN).some((id) => doc.sections[IVAN[id][0]]);
    const ranks = { rankBalanced: presetRank("Balanced"), rankGrowth: presetRank("Growth Investor"), rankQuality: presetRank("Quality Investor"), rankConservative: presetRank("Conservative Investor") };
    ranks.rankRange = (c) => { const v = Object.keys(ranks).filter((k) => k !== "rankRange").map((k) => ranks[k](c)); return Math.max(...v) - Math.min(...v); };
    const get = (key) => ranks[key] || UCOLS[key][2];
    const rows = Core.state.list.map((c) => ({ c, v: Object.fromEntries(r.universe.map((k) => [k, get(k)(c)])) }))
      .sort((x, y) => (Calc.isNum(y.v[r.sort]) ? y.v[r.sort] : -1e9) - (Calc.isNum(x.v[r.sort]) ? x.v[r.sort] : -1e9));
    const cell = (k, v) => (UCOLS[k][1] === "score" ? `<span class="fq-gcell">${Views.scoreText(v)}${k === "health" ? "" : Views.gradeBox(Ratings.grade(v), "sm")}</span>` : UCOLS[k][1] === "rank" ? (Calc.isNum(v) ? v : "n/a") : fmt(v, "pct"));
    let n = 0;
    const section = (title, body) => (body ? `<h2 class="fq-report-h"><span>${String(++n).padStart(2, "0")}</span>${title}</h2>${body}` : "");
    const dates = [doc.meta.published && `Published ${esc(doc.meta.published)}`, doc.meta.revised && `Revised ${esc(doc.meta.revised)}`].filter(Boolean).join(" · ");
    $("#app").innerHTML = `
      <section class="fq-section">
        <p><a href="research.html${draft ? "?draft=1" : ""}">← All case studies</a></p>
        <p class="fq-eyebrow" style="margin-top:18px">Research question · ${esc(r.title)}</p>
        <p class="fq-rq">${esc(r.question)}</p>
        <p class="fq-muted">By Ivan Glushchenko${dates ? " · " + dates : ""} · Data updated ${esc(Core.state.data.generated)}</p>
        ${anyWritten || draft ? "" : `<p class="fq-note">Ivan's written analysis for this question is in progress. The table below is filled in automatically.</p>`}
        ${draft ? `<p class="fq-note fq-note--warn">Draft view. Dashed boxes are sections still to be written. Visitors do not see them.</p>` : ""}
        ${r.needsMarket && !Core.state.market ? `<p class="fq-note fq-note--warn"><strong>Data limit.</strong> ${r.needsMarket}</p>` : ""}
        ${section("Initial hypothesis", blocks.hypothesis)}
        ${section("Data", `<div class="fq-card"><div class="fq-tablewrap"><table class="fq-table fq-table--dense">
          <thead><tr><th>Company</th>${r.universe.map((k) => `<th>${UCOLS[k][0]}</th>`).join("")}</tr></thead>
          <tbody>${rows.map((x) => `<tr><td><a href="company.html#${x.c.ticker}"><b>${x.c.ticker}</b></a> <span class="fq-muted">${esc(x.c.name)}</span></td>${r.universe.map((k) => `<td>${cell(k, x.v[k])}</td>`).join("")}</tr>`).join("")}</tbody>
        </table></div><p class="fq-small fq-muted">Sorted by ${UCOLS[r.sort][0].toLowerCase()}. ${r.id === "weight-sensitivity" ? "Rank 1 is the highest overall score under that preset. The last column is the gap between a company's best and worst rank across the four presets." : "Scores are 0 to 100. Grades are relative to the tracked companies and fixed scales."} Calculated from SEC filings by the code described on the methodology page.</p></div>`)}
        ${section("Quantitative findings", blocks.findings)}
        ${section("Interpretation", blocks.interpretation)}
        ${section("Counterarguments", blocks.counter)}
        ${section("Risks and limitations", blocks.risks)}
        ${section("Conclusion", blocks.conclusion)}
        <div class="fq-cta" style="margin-top:28px"><a class="fq-btn" href="screener.html">Open the screener</a></div>
      </section>`;
    current = null;   // no charts to redraw
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
      return !r ? list() : r.universe ? universeReport(r) : report(r);
    },
  });
  Core.onResize(() => current && drawCharts());
})();
