/* ============================================================
   FinanceIQ shared view pieces: chunks of HTML that more than one
   page uses (score cards, the scorecard table, source tables, charts
   of yearly data, DCF scenario table, peer benchmarks).
   ============================================================ */

const Views = (() => {
  const { isNum, fmt, money, pct } = Calc;
  const { term, swatch, COLORS } = Core;

  // Yearly fields that can be charted. `fmt` picks number formatting, `term` the glossary entry.
  const METRICS = {
    revenue: { label: "Revenue", fmt: "money", term: "revenue" },
    netIncome: { label: "Net income", fmt: "money", term: "netIncome" },
    ebit: { label: "Operating income", fmt: "money", term: "ebit" },
    freeCashFlow: { label: "Free cash flow", fmt: "money", term: "fcf" },
    operatingCashFlow: { label: "Operating cash flow", fmt: "money", term: "ocf" },
    capex: { label: "Capital spending", fmt: "money", term: "capex" },
    grossMargin: { label: "Gross margin", fmt: "pct", term: "grossMargin", rate: true },
    opMargin: { label: "Operating margin", fmt: "pct", term: "opMargin", rate: true },
    netMargin: { label: "Net margin", fmt: "pct", term: "netMargin", rate: true },
    fcfMargin: { label: "Free cash flow margin", fmt: "pct", term: "fcfMargin", rate: true },
    growth: { label: "Revenue growth per year", fmt: "pct", term: "revenue", rate: true },
    debt: { label: "Total debt", fmt: "money", term: "debt" },
    cash: { label: "Cash and short-term investments", fmt: "money", term: "cash" },
    netCash: { label: "Cash minus debt", fmt: "money", term: "netCash" },
    eps: { label: "Earnings per share (diluted)", fmt: "perShare", term: "eps" },
    roic: { label: "Return on invested capital", fmt: "pct", term: "roic", rate: true },
    roe: { label: "Return on equity", fmt: "pct", term: "roe", rate: true },
    dilutedShares: { label: "Diluted shares", fmt: "shares" },
    debtToEquity: { label: "Debt-to-equity", fmt: "ratio", term: "debtToEquity", rate: true },
  };

  /* ---------------- charts of yearly data ---------------- */

  // Draw one metric for one or two companies.
  //   mode: "value" (as reported) | "yoy" (% change on the year before) | "index" (first year = 100)
  function chart(host, companies, key, { years = 10, mode = "value", height } = {}) {
    const meta = METRICS[key];
    const latest = Math.max(...companies.map((c) => c.L.fy));
    const first = latest - years + 1;
    const xs = [...new Set(companies.flatMap((c) => c.years.map((y) => y.fy)))].filter((fy) => fy >= first).sort();
    const series = companies.map((c, i) => {
      const byYear = Object.fromEntries(c.years.map((y) => [y.fy, y[key]]));
      const values = {};
      const baseYear = xs.find((fy) => isNum(byYear[fy]) && byYear[fy] > 0);
      for (const fy of xs) {
        const v = byYear[fy], prev = byYear[fy - 1];
        if (mode === "yoy") values[fy] = meta.rate ? (isNum(v) && isNum(prev) ? v - prev : null) : Calc.growth(prev, v);
        else if (mode === "index") values[fy] = isNum(v) && baseYear !== undefined ? (v / byYear[baseYear]) * 100 : null;
        else values[fy] = v;
      }
      return { name: c.name, short: c.ticker, color: companies.length === 1 ? COLORS[c._slot || 0] : COLORS[i], values };
    });
    // In "yoy" mode a margin is shown as the change in percentage points; money as % growth.
    const kind = mode === "yoy" ? "pct" : mode === "index" ? "index" : meta.fmt;
    const tip = mode === "index" ? (v) => v.toFixed(0) : mode === "yoy" && meta.rate ? (v) => (v >= 0 ? "+" : "") + pct(v).replace("%", " pts") : (v) => fmt(v, kind);
    Chart.line(host, {
      xs, series, height, label: `${meta.label}: ${companies.map((c) => c.name).join(" vs ")}`,
      fmt: tip, axisFmt: Chart.axis[kind] || ((v) => fmt(v, kind)),
      baseline: mode === "index" ? 100 : 0,
      xTitle: (fy) => "Fiscal " + fy,
    });
  }

  const legend = (A, B) => `<div class="fq-legend"><span>${swatch(0)}${esc(A.name)}</span><span>${swatch(1)}${esc(B.name)}</span></div>`;

  /* ---------------- Financial Health Score ---------------- */

  const scoreText = (s) => (isNum(s) ? Math.round(s) : "–");

  // A 0-100 bar. Text stays in normal ink; the bar carries the company color.
  const bar = (score, i) => `<span class="fq-bar" aria-hidden="true"><span style="width:${isNum(score) ? Math.max(2, score) : 0}%;background:${COLORS[i]}"></span></span>`;

  function healthCard(c, i, result, { link = false } = {}) {
    const rows = result.categories.map((cat) => `
      <div class="fq-catrow"><span>${esc(cat.label)} <small>${cat.weight.toFixed(0)}%</small></span>${bar(cat.score, i)}<b>${scoreText(cat.score)}</b></div>`).join("");
    return `
    <article class="fq-card fq-health">
      <header><h3>${swatch(i)}${esc(c.name)}</h3><span class="fq-muted">FY${c.L.fy} · ${esc(c.group === "Other" ? c.blurb : c.group)}</span></header>
      <div class="fq-health__score"><strong>${scoreText(result.overall)}</strong><span>/ 100<br><em>${Calc.band(result.overall)}</em></span></div>
      <div class="fq-catrows">${rows}</div>
      <p class="fq-muted fq-small">${result.coverage.used} of ${result.coverage.total} measures available.${link ? ` <a data-nav="health.html" href="health.html#${Core.state.a}-${Core.state.b}">See the full breakdown</a>` : ""}</p>
    </article>`;
  }

  /* ---------------- scorecard table ---------------- */

  // better: "high" or "low" decides who gets the check mark; null = no winner (size only)
  const SCORE_ROWS = [
    { label: "Revenue", term: "revenue", hint: "Total sales, latest fiscal year", get: (c) => c.L.revenue, fmt: "money", better: null },
    { label: "Revenue growth per year", term: "cagr", hint: "Average over the last five years", get: (c) => c.cagr, fmt: "pct", better: "high" },
    { label: "Net profit margin", term: "netMargin", hint: "Profit kept from each $1 of sales", get: (c) => c.L.netMargin, fmt: "pct", better: "high" },
    { label: "Operating margin", term: "opMargin", hint: "Profit from the core business, before interest and tax", get: (c) => c.L.opMargin, fmt: "pct", better: "high" },
    { label: "Return on invested capital", term: "roic", hint: "Profit earned on the money tied up in the business", get: (c) => c.L.roic, fmt: "pct", better: "high" },
    { label: "Debt-to-equity", term: "debtToEquity", hint: "Borrowed money compared with shareholders' money", get: (c) => c.L.debtToEquity, fmt: "ratio", better: "low" },
    { label: "Cash minus debt", term: "netCash", hint: "Positive means it could repay every lender today", get: (c) => c.L.netCash, fmt: "money", better: "high" },
    { label: "Free cash flow margin", term: "fcfMargin", hint: "Spare cash produced from each $1 of sales", get: (c) => c.L.fcfMargin, fmt: "pct", better: "high" },
    { label: "Earnings per share", term: "eps", hint: "Diluted, latest fiscal year", get: (c) => c.L.eps, fmt: "perShare", better: null },
  ];

  function scorecard(A, B) {
    const wins = [0, 0];
    let judged = 0, derived = false;
    const rows = SCORE_ROWS.map((r) => {
      const va = r.get(A), vb = r.get(B);
      let lead = -1;
      if (r.better && isNum(va) && isNum(vb) && va !== vb) {
        lead = (r.better === "high" ? va > vb : va < vb) ? 0 : 1;
        wins[lead]++; judged++;
      }
      const cell = (v, i, c) => {
        let text = fmt(v, r.fmt);
        if (r.term === "debtToEquity" && !isNum(v) && c.L.equity <= 0) text = "negative equity";
        if (r.term === "opMargin" && c.L.ebitDerived && isNum(v)) { text += "†"; derived = true; }
        return `<td class="${lead === i ? "fq-lead" : ""}">${text}</td>`;
      };
      return `<tr><td><span class="fq-metric">${term(r.term, r.label)}</span><span class="fq-hint">${r.hint}</span></td>${cell(va, 0, A)}${cell(vb, 1, B)}</tr>`;
    }).join("");
    return `
      <div class="fq-tablewrap"><table class="fq-table">
        <thead><tr><th>Measure</th>
          <th><span class="fq-th">${swatch(0)}${esc(A.name)} · FY${A.L.fy}</span></th>
          <th><span class="fq-th">${swatch(1)}${esc(B.name)} · FY${B.L.fy}</span></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="fq-tally">Of the ${judged} measures compared, <strong>${esc(A.name)} is ahead on ${wins[0]}</strong> and <strong>${esc(B.name)} on ${wins[1]}</strong>.
      A count like this treats every measure as equally important, which they are not. Deciding which ones matter most takes judgement.</p>
      ${derived ? `<p class="fq-small fq-muted">† This company does not report an operating income line. It is rebuilt here as pre-tax income plus interest expense.</p>` : ""}`;
  }

  /* ---------------- source tables ---------------- */

  function sourceTable(c, i, { years = 10 } = {}) {
    const rows = [...c.years].slice(-years).reverse().map((y) => `
      <tr><td>FY${y.fy} <span class="fq-hint">year ended ${y.end}</span></td>
      <td>${money(y.revenue)}</td><td>${money(y.ebit)}${y.ebitDerived ? "†" : ""}</td><td>${money(y.netIncome)}</td><td>${fmt(y.eps, "perShare")}</td>
      <td>${money(y.debt)}</td><td>${money(y.cash)}</td><td>${money(y.freeCashFlow)}</td>
      <td><a href="${esc(y.url)}" target="_blank" rel="noopener">10-K ↗</a><span class="fq-hint">filed ${y.filed}</span></td></tr>`).join("");
    return `
    <div class="fq-card">
      <h3>${swatch(i)}${esc(c.name)} <small class="fq-muted">${esc(c.legalName)}</small></h3>
      <div class="fq-tablewrap"><table class="fq-table fq-table--dense">
        <thead><tr><th>Fiscal year</th><th>Revenue</th><th>Operating income</th><th>Net income</th><th>EPS</th><th>Debt</th><th>Cash</th><th>Free cash flow</th><th>Source</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="fq-small fq-muted">Dollar figures as first reported in each ${term("tenK", "10-K")}. EPS is adjusted for later stock splits.
      <a href="${esc(c.filingsUrl)}" target="_blank" rel="noopener">All ${esc(c.name)} 10-K filings on SEC EDGAR ↗</a></p>
    </div>`;
  }

  /* ---------------- DCF ---------------- */

  const SCENARIOS = [["bear", "Bear case"], ["base", "Base case"], ["bull", "Bull case"]];

  // Run the three scenarios for one company with its current (saved or default) assumptions.
  function dcfRun(c) {
    const input = Core.dcfInputs(c);
    const results = {};
    for (const [id] of SCENARIOS) {
      results[id] = Calc.dcf({ fcf0: input.fcf0, years: input.years, cash: input.cash, debt: input.debt, shares: input.shares, ...input.scenarios[id] });
    }
    return { input, results };
  }

  function dcfScenarioTable(c, run, selected) {
    const { input, results } = run;
    const col = (f) => SCENARIOS.map(([id]) => `<td class="${id === selected ? "fq-sel" : ""}">${results[id].valid ? f(results[id], input.scenarios[id]) : "–"}</td>`).join("");
    const price = input.price > 0 ? input.price : null;
    return `
      <div class="fq-tablewrap"><table class="fq-table">
        <thead><tr><th>${esc(c.name)}</th>${SCENARIOS.map(([id, label]) => `<th class="${id === selected ? "fq-sel" : ""}">${label}</th>`).join("")}</tr></thead>
        <tbody>
          <tr><td>Cash flow growth per year</td>${col((r, s) => pct(s.growth))}</tr>
          <tr><td>${term("discountRate", "Discount rate")}</td>${col((r, s) => pct(s.discount))}</tr>
          <tr><td>${term("terminalGrowth", "Terminal growth")}</td>${col((r, s) => pct(s.terminalGrowth))}</tr>
          <tr><td>Present value of projected cash flows</td>${col((r) => money(r.sumPv))}</tr>
          <tr><td>Present value of ${term("terminalValue", "terminal value")}</td>${col((r) => money(r.pvTerminal))}</tr>
          <tr><td>${term("enterpriseValue", "Enterprise value")}</td>${col((r) => money(r.enterpriseValue))}</tr>
          <tr><td>${term("equityValue", "Equity value")}</td>${col((r) => money(r.equityValue))}</tr>
          <tr class="fq-strong"><td>Estimated value per share</td>${col((r) => fmt(r.perShare, "perShare"))}</tr>
          ${price ? `<tr><td>Compared with the price entered (${fmt(price, "perShare")})</td>${col((r) => { const u = Calc.upside(r.perShare, price); return (u >= 0 ? "+" : "") + pct(u); })}</tr>` : ""}
        </tbody>
      </table></div>`;
  }

  /* ---------------- industry benchmarks ---------------- */

  const BENCH = [
    { label: "Revenue growth per year (3 years)", term: "cagr", fmt: "pct", high: true, get: (c) => c.cagr3 },
    { label: "Operating margin", term: "opMargin", fmt: "pct", high: true, get: (c) => c.L.opMargin },
    { label: "Free cash flow margin", term: "fcfMargin", fmt: "pct", high: true, get: (c) => c.L.fcfMargin },
    { label: "Return on invested capital", term: "roic", fmt: "pct", high: true, get: (c) => c.L.roic },
    { label: "Net debt ÷ EBITDA", term: "netDebtToEbitda", fmt: "ratio", high: false, get: (c) => c.L.netDebtToEbitda },
    { label: "Debt-to-equity", term: "debtToEquity", fmt: "ratio", high: false, get: (c) => c.L.debtToEquity },
  ];

  // For one company: its value, the peer median and its rank for each benchmark metric.
  function benchmark(c) {
    if (c.group === "Other") return null;
    const peers = Core.peers(c.group);
    return {
      peers,
      rows: BENCH.map((b) => {
        const values = peers.map((p) => ({ ticker: p.ticker, name: p.name, value: b.get(p) })).filter((p) => isNum(p.value));
        return { ...b, value: b.get(c), values, ...Calc.peerStats(b.get(c), values.map((v) => v.value), b.high) };
      }),
    };
  }

  return { METRICS, chart, legend, bar, scoreText, healthCard, SCORE_ROWS, scorecard, sourceTable, SCENARIOS, dcfRun, dcfScenarioTable, BENCH, benchmark };
})();
