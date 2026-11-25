/* Company research page: one company, its grades and everything behind them.
   Address: company.html#NVDA   (the tab is remembered while you stay on the page) */

(() => {
  const { isNum, fmt, money, pct } = Calc;
  const { term } = Core;
  let company = null, tab = new URLSearchParams(location.search).get("tab") || "overview";

  const TABS = [["overview", "Overview"], ["financials", "Financials"], ["earnings", "Earnings"], ["quant", "Quantitative"],
    ["valuation", "Valuation"], ["ownership", "Ownership"], ["trends", "Historical trends"], ["research", "Research"]];
  const CASES = [["aapl-msft", ["AAPL", "MSFT"], "Apple vs. Microsoft"], ["wmt-cost", ["WMT", "COST"], "Walmart vs. Costco"],
    ["ko-pep", ["KO", "PEP"], "Coca-Cola vs. PepsiCo"], ["nvda-msft", ["NVDA", "MSFT"], "Nvidia vs. Microsoft"]];

  const signed = (v) => (isNum(v) ? `<span class="${v >= 0 ? "fq-up" : "fq-down"}">${v >= 0 ? "▲" : "▼"} ${pct(Math.abs(v))}</span>` : "n/a");
  const market = () => Core.state.market && Core.state.market[company.ticker];

  /* ---------------- header ---------------- */

  function header(c, rating) {
    const m = market(), info = Core.state.marketInfo, watching = Core.watchlist().includes(c.ticker);
    const change = Core.ratingChange(c.ticker);
    return `
      <div class="fq-cohead">
        <div>
          <h1>${esc(c.name)} <span class="fq-muted" style="font-weight:500">${c.ticker}</span></h1>
          <div class="fq-cohead__meta">
            <span>${esc(c.group === "Other" ? c.blurb : c.group + " · " + c.blurb)}</span>
            <span>${m ? `Price ${fmt(m.v.price, "perShare")} · market value ${money(m.v.marketCap)} · as of ${esc(info.asOf)}` : "No share price (market data not connected)"}</span>
            <span>Latest report: quarter ended ${esc(c.latest.end)}, filed ${esc(c.latest.filed)}</span>
          </div>
          <div class="fq-cohead__actions">
            <button type="button" class="fq-btn" id="watch" aria-pressed="${watching}">${watching ? "★ In watchlist" : "☆ Add to watchlist"}</button>
            <span class="fq-combo fq-compare-with"><input id="cmp" type="text" placeholder="Compare with…" aria-label="Compare with another company" data-empty-label="Compare ${esc(c.ticker)} with"></span>
            <a class="fq-btn" href="valuation.html#${c.ticker}">DCF simulator</a>
          </div>
        </div>
        <div class="fq-cohead__rating">
          ${Views.gradeBox(rating.grade, "lg")}
          <div><span>${rating.complete ? "FinanceIQ rating" : "Partial FinanceIQ rating"}</span><strong>${Views.scoreText(rating.overall)} / 100</strong>
            <span>${change && isNum(change.delta) && Math.abs(change.delta) >= 0.5 ? `${change.delta > 0 ? "▲" : "▼"} ${Math.abs(change.delta).toFixed(1)} since ${esc(change.fromDate)}` : `Rated ${esc(Core.state.data.generated.slice(0, 10))} · ${Math.round(rating.coverage * 100)}% data coverage`}</span></div>
        </div>
      </div>
      <div class="fq-tabs" role="tablist" aria-label="Research sections">${TABS.map(([id, label]) => `<button type="button" role="tab" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`).join("")}</div>`;
  }

  /* ---------------- tabs ---------------- */

  function overview(c, rating) {
    const ex = rating.explanation, health = Core.score(c);
    const active = Object.keys(Ratings.PRESETS).find((n) => Ratings.MODEL.every((k) => Ratings.PRESETS[n][k.id] === Core.ratingWeights()[k.id]));
    const ai = Core.state.summaries.companies[c.ticker];
    const list = (items, none) => (items.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="fq-muted">${none}</p>`);
    return `
      <section class="fq-section">
        <div class="fq-panel__head"><h2 style="margin:0;font-size:21px">Stock rating</h2>
          <div class="fq-seg" role="group" aria-label="Rating weights">${Object.keys(Ratings.PRESETS).map((n) => `<button type="button" data-rpreset="${n}" aria-pressed="${n === active}">${n.replace(" Investor", "")}</button>`).join("")}</div></div>
        <p class="fq-sub">Five independent grades. The presets change how much each category counts, not the grades themselves.</p>
        ${Views.ratingCards(rating)}
        <div class="fq-plain"><h4>What is driving the rating</h4><p>${esc(ex.summary)}</p></div>
        <div class="fq-two" style="margin-top:14px">
          <div class="fq-card fq-hl"><h4 style="margin-top:0">Strongest measures</h4>${list(ex.positives, "No measure scores 70 or above.")}</div>
          <div class="fq-card fq-hl"><h4 style="margin-top:0">Weakest measures</h4>${list(ex.negatives, "No measure scores 35 or below.")}</div>
        </div>
      </section>
      <section class="fq-section">
        <h2>Every measure behind the grades</h2>
        <p class="fq-sub">Open a category to see each measure, its value, how it compares, and how it was scored.</p>
        ${Views.factorSections(rating, c)}
        <p class="fq-note">Grades describe reported results and past prices. They are not forecasts, and an A is not a recommendation to buy. The weights are starting assumptions, not proven to be the best ones.</p>
      </section>
      <section class="fq-section">
        <h2>Business health <span class="fq-badge">separate from the stock rating</span></h2>
        <p class="fq-sub">The Financial Health Score looks only at the business, on fixed scales. A company can be healthy and still be an unattractive stock at its price.</p>
        <div class="fq-two">${Views.healthCard(c, 0, health)}
          <div class="fq-card fq-ai"><h3>Strengths and risks <span class="fq-badge">AI-generated</span></h3>
            ${ai ? `<h4>Strengths</h4>${list(ai.strengths, "")}<h4>Risks</h4>${list(ai.risks, "")}<p class="fq-small fq-muted">Written by ${esc(Core.state.summaries.model)} from annual figures on ${esc(Core.state.summaries.generated)}. Quoted figures are checked against the data automatically. AI plays no part in any grade.</p>` : `<p class="fq-empty">No AI summary for this company.</p>`}</div></div>
      </section>`;
  }

  function financials(c) {
    const t = c.ttm, qs = c.quarters.slice(-8).reverse(), ys = c.years.slice(-5).reverse();
    const stat = (label, value, sub) => `<div><span>${label}</span><strong>${value}</strong><small>${sub || ""}</small></div>`;
    return `
      <section class="fq-section">
        <h2>${term("ttm", "Trailing twelve months")}</h2>
        <p class="fq-sub">The four most recent quarters added together, to ${esc(t.asOf || c.L.end)}.</p>
        <div class="fq-card"><div class="fq-keystats">
          ${stat("Revenue", money(t.revenue), "growth " + pct(t.revenueGrowth))}
          ${stat("Operating income", money(t.opIncome), "margin " + pct(t.opMargin))}
          ${stat("Net income", money(t.netIncome), "")}
          ${stat("EPS (diluted)", fmt(t.eps, "perShare"), "growth " + pct(t.epsGrowth))}
          ${stat("Operating cash flow", money(t.operatingCashFlow), "")}
          ${stat("Free cash flow", money(t.freeCashFlow), "")}
          ${stat("Debt", money(c.latest.debt), "at " + esc(c.latest.end))}
          ${stat("Cash and short-term investments", money(c.latest.cash), "")}
        </div></div>
      </section>
      ${piotroskiCard(c)}
      <section class="fq-section">
        <h2>Quarterly results</h2>
        <p class="fq-sub">Growth is ${term("yoy", "year over year")}: each quarter against the same quarter a year earlier.</p>
        <div class="fq-card"><div class="fq-tablewrap"><table class="fq-table fq-table--dense">
          <thead><tr><th>Quarter ended</th><th>Revenue</th><th>Growth</th><th>Operating income</th><th>Margin</th><th>Net income</th><th>EPS</th><th>EPS growth</th><th>Source</th></tr></thead>
          <tbody>${qs.map((q) => `<tr><td>${q.end}${q.q4Derived ? " *" : ""}</td><td>${money(q.revenue)}</td><td>${signed(q.revenueGrowth)}</td><td>${money(q.operatingIncome)}</td><td>${pct(q.opMargin)}</td><td>${money(q.netIncome)}</td><td>${fmt(q.eps, "perShare")}</td><td>${signed(q.epsGrowth)}</td><td>${q.form}, filed ${q.filed}</td></tr>`).join("")}</tbody>
        </table></div>
        <p class="fq-small fq-muted">* Companies do not file a quarterly report for their fourth quarter. It is calculated as the full year minus the first three quarters. EPS is adjusted for stock splits.</p></div>
      </section>
      <section class="fq-section">
        <h2>Annual results</h2>
        <div class="fq-card"><div class="fq-tablewrap"><table class="fq-table fq-table--dense">
          <thead><tr><th>Fiscal year</th><th>Revenue</th><th>Gross margin</th><th>Operating margin</th><th>Net income</th><th>EPS</th><th>Free cash flow</th><th>ROIC</th><th>Debt</th><th>Cash</th><th>Source</th></tr></thead>
          <tbody>${ys.map((y) => `<tr><td>FY${y.fy}<span class="fq-hint">ended ${y.end}</span></td><td>${money(y.revenue)}</td><td>${pct(y.grossMargin)}</td><td>${pct(y.opMargin)}${y.ebitDerived ? "†" : ""}</td><td>${money(y.netIncome)}</td><td>${fmt(y.eps, "perShare")}</td><td>${money(y.freeCashFlow)}</td><td>${pct(y.roic)}</td><td>${money(y.debt)}</td><td>${money(y.cash)}</td><td><a href="${esc(y.url)}" target="_blank" rel="noopener">10-K ↗</a></td></tr>`).join("")}</tbody>
        </table></div>
        <p class="fq-small fq-muted">Dollar figures as first reported. <a href="${esc(c.filingsUrl)}" target="_blank" rel="noopener">All ${esc(c.name)} filings on SEC EDGAR ↗</a></p></div>
      </section>`;
  }

  function piotroskiCard(c) {
    const f = c.piotroski;
    if (!f) return "";
    const mark = (p) => (p === true ? '<span class="fq-up">✓ Pass</span>' : p === false ? '<span class="fq-down">✗ Fail</span>' : '<span class="fq-muted">n/a</span>');
    return `<section class="fq-section">
      <h2>Piotroski F-Score: ${Calc.isNum(f.score) ? `${f.score} of ${f.available}` : "not available"}</h2>
      <p class="fq-sub">Nine yes/no tests from accounting research, comparing fiscal ${f.fy} with the year before. 8 or 9 is usually read as strong, 3 or fewer as weak. It was designed to separate stronger from weaker cheap stocks, so treat it as one view of quality, not a verdict.</p>
      <div class="fq-card"><div class="fq-tablewrap"><table class="fq-table fq-table--dense">
        <tbody>${f.tests.map((t, i) => `<tr><td>${i + 1}. ${esc(t.label)}<span class="fq-hint">${esc(t.why)}</span></td><td>${mark(t.pass)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="fq-small fq-muted">Two simplifications: debt is total debt rather than long-term debt only, and new shares are judged from the diluted share count with 0.5% allowed. ${Calc.isNum(f.score) ? "" : `Only ${f.available} of 9 tests could be calculated, so no score is given.`}</p></div>
    </section>`;
  }

  function earnings(c, rating) {
    const m = c.momentum, q = c.Q, p = c.quarters[c.quarters.length - 2] || {};
    return `
      <section class="fq-section">
        <h2>Earnings momentum</h2>
        <p class="fq-sub">Growth and ${term("acceleration", "acceleration")} are different things. A company growing 20% after growing 30% is still growing, but it is slowing down.</p>
        <div class="fq-card"><div class="fq-keystats">
          <div><span>EPS growth, latest quarter</span><strong>${pct(q.epsGrowth)}</strong><small>previous quarter ${pct(p.epsGrowth)}</small></div>
          <div><span>EPS acceleration</span><strong>${isNum(m.epsAccel) ? Ratings.format(m.epsAccel, "pts") : "n/a"}</strong><small>latest minus previous</small></div>
          <div><span>Revenue growth, latest quarter</span><strong>${pct(q.revenueGrowth)}</strong><small>previous quarter ${pct(p.revenueGrowth)}</small></div>
          <div><span>Revenue acceleration</span><strong>${isNum(m.revenueAccel) ? Ratings.format(m.revenueAccel, "pts") : "n/a"}</strong><small>latest minus previous</small></div>
          <div><span>Quarters with higher EPS than a year before</span><strong>${m.epsUpCount} of ${m.epsUpOf}</strong><small>last ${m.epsUpOf} quarters</small></div>
        </div></div>
        <div class="fq-two" style="margin-top:16px">
          <article class="fq-card fq-mini"><h3>Revenue growth, year over year</h3><div class="fq-chart" data-qchart="revenueGrowth"></div></article>
          <article class="fq-card fq-mini"><h3>EPS growth, year over year</h3><div class="fq-chart" data-qchart="epsGrowth"></div></article>
        </div>
        <p class="fq-small fq-muted">A gap in the EPS line means the year-ago quarter was a loss, where a growth percentage would be misleading.</p>
      </section>
      <section class="fq-section">${Views.factorSections({ categories: rating.categories.filter((k) => k.id === "earnings") }, c, "earnings")}</section>
      <section class="fq-section"><h2>Analyst estimates and earnings surprises</h2>
        <p class="fq-note">Not available. Comparing results with analyst forecasts needs licensed consensus data with dates attached, which FinanceIQ does not have. Nothing here is estimated or inferred in its place: the grade above uses reported results only.</p></section>`;
  }

  function quant(c, rating) {
    const m = market(), info = Core.state.marketInfo;
    const cat = rating.categories.filter((k) => k.id === "quant");
    if (!m) {
      return `<section class="fq-section"><h2>Quantitative momentum</h2>${Views.noMarket()}
        <p class="fq-sub" style="margin-top:16px">When price data is connected, this tab grades four things, each from daily closing prices and volume:</p>
        <div class="fq-card" style="margin-top:12px"><div class="fq-tablewrap"><table class="fq-table fq-table--dense"><thead><tr><th>Measure</th><th>Weight in category</th><th class="fq-l" style="text-align:left">What it shows</th></tr></thead>
          <tbody>${cat[0].factors.map((f) => `<tr><td>${esc(f.label)}</td><td>${(f.weight * 100).toFixed(0)}%</td><td style="text-align:left;white-space:normal">${esc(f.why)}</td></tr>`).join("")}</tbody></table></div>
          <p class="fq-small fq-muted">Volume measures are proxies for market participation. They cannot show who is buying or selling.</p></div></section>`;
    }
    const q = m.q;
    return `<section class="fq-section"><h2>Quantitative momentum</h2>
      <p class="fq-sub">From daily prices to ${esc(info.asOf)} against ${esc(info.benchmark)}. Price returns, not total returns: dividends are not included.</p>
      <div class="fq-card"><div class="fq-keystats">
        <div><span>3-month return</span><strong>${pct(q.return3m)}</strong><small>vs benchmark ${isNum(q.relative3m) ? Ratings.format(q.relative3m, "pts") : "n/a"}</small></div>
        <div><span>6-month return</span><strong>${pct(q.return6m)}</strong><small>vs benchmark ${isNum(q.relative6m) ? Ratings.format(q.relative6m, "pts") : "n/a"}</small></div>
        <div><span>12-month return</span><strong>${pct(q.return12m)}</strong><small>&nbsp;</small></div>
        <div><span>Price vs 200-day average</span><strong>${pct(q.priceVs200)}</strong><small>&nbsp;</small></div>
        <div><span>From 52-week high</span><strong>${pct(q.fromHigh52)}</strong><small>&nbsp;</small></div>
        <div><span>Volatility (annualized)</span><strong>${pct(q.volatility)}</strong><small>beta ${isNum(q.beta) ? q.beta.toFixed(2) : "n/a"}</small></div>
      </div></div>
      ${info.showPrices ? `<article class="fq-card fq-mini" style="margin-top:16px"><h3>Price, last 12 months</h3><div class="fq-chart" data-price="1"></div></article>` : `<p class="fq-note">The price licence allows calculated figures to be shown but not the prices themselves, so there is no price chart.</p>`}
      </section><section class="fq-section">${Views.factorSections({ categories: cat }, c, "quant")}</section>`;
  }

  function valuation(c, rating) {
    const m = market(), saved = Core.dcfInputs(c);
    const price = m ? m.v.price : saved.price > 0 ? saved.price : null;
    const v = price ? Calc.valuation(c, price) : null;
    const run = Views.dcfRun(c);
    const rev = price ? Calc.reverseDcf({ fcf0: run.input.fcf0, years: run.input.years, cash: run.input.cash, debt: run.input.debt, shares: run.input.shares, discount: run.input.scenarios.base.discount, terminalGrowth: run.input.scenarios.base.terminalGrowth }, price) : null;
    const row = (label, t, value, note) => `<tr><td>${term(t, label)}</td><td>${value}</td><td style="text-align:left;white-space:normal" class="fq-muted">${note}</td></tr>`;
    const r2 = (x) => (isNum(x) ? x.toFixed(1) + "×" : "not meaningful");
    return `
      <section class="fq-section"><h2>Valuation multiples</h2>
        ${m ? `<p class="fq-sub">At ${fmt(price, "perShare")} on ${esc(Core.state.marketInfo.asOf)}.</p>` : `${Views.noMarket()}
          <div class="fq-toolbar" style="margin-top:14px"><label>Share price you want to test ($)
            <input type="number" id="myprice" min="0" step="0.01" value="${price || ""}" inputmode="decimal" style="width:130px"></label>
            <span class="fq-muted fq-small">Typed by you, saved in this browser only. It is not a market quote.</span></div>`}
        ${v ? `<div class="fq-card"><div class="fq-tablewrap"><table class="fq-table"><tbody>
          ${row("Market value", "marketCap", money(v.marketCap), `${fmt(price, "perShare")} × ${fmt(c.latest.dilutedShares, "shares")} diluted shares`)}
          ${row("Enterprise value", "enterpriseValue", money(v.enterpriseValue), `market value + debt ${money(c.latest.debt)} − cash ${money(c.latest.cash)}`)}
          ${row("Price-to-earnings", "pe", r2(v.pe), `trailing EPS ${fmt(c.ttm.eps, "perShare")}${v.pe === null ? "; earnings are negative" : ""}`)}
          ${row("Earnings yield", "pe", pct(v.earningsYield), "EPS ÷ price, the inverse of P/E")}
          ${row("Price-to-sales", "revenue", r2(v.priceToSales), `trailing revenue ${money(c.ttm.revenue)}`)}
          ${row("Price-to-book", "equityValue", r2(v.priceToBook), c.latest.equity > 0 ? `equity ${money(c.latest.equity)}` : "shareholder equity is negative")}
          ${row("EV ÷ EBITDA", "ebitda", r2(v.evToEbitda), "trailing operating income + latest annual depreciation")}
          ${row("EV ÷ revenue", "enterpriseValue", r2(v.evToRevenue), "")}
          ${row("Free cash flow yield", "fcf", pct(v.fcfYield), `trailing free cash flow ${money(c.ttm.freeCashFlow)}`)}
          ${row("PEG ratio", "pe", isNum(v.peg) ? v.peg.toFixed(2) : "not meaningful", "P/E ÷ three-year EPS growth rate; shown only when both are positive")}
        </tbody></table></div></div>` : ""}
      </section>
      <section class="fq-section">${Views.factorSections({ categories: rating.categories.filter((k) => k.id === "valuation") }, c)}
        <p class="fq-small fq-muted" style="margin-top:8px">The Valuation grade ranks companies against each other, so it needs a price for every company from the same day. A price typed in for one company cannot produce it.</p></section>
      <section class="fq-section"><h2>Discounted cash flow</h2>
        <p class="fq-sub">Three scenarios from the DCF model, using ${run.input.custom ? "your saved assumptions" : "the default assumptions"}. These are scenarios, not a fair-value prediction, and they are not part of the Valuation grade.</p>
        <div class="fq-card">${run.input.fcf0 > 0 ? Views.dcfScenarioTable(c, { input: { ...run.input, price }, results: run.results }, null) : `<p class="fq-note fq-note--warn">Free cash flow is negative, so a growth DCF is not meaningful for ${esc(c.name)} right now.</p>`}
          ${rev ? `<p class="fq-note"><strong>Reverse DCF.</strong> ${rev.bounded ? `At ${fmt(price, "perShare")} the price is ${rev.bounded === "above" ? "higher" : "lower"} than this model can explain with any growth rate between −50% and +100%.`
            : `At ${fmt(price, "perShare")}, the price implies free cash flow growing about <strong>${pct(rev.growth)}</strong> a year for ${run.input.years} years, with the base-case discount rate (${pct(run.input.scenarios.base.discount)}) and terminal growth (${pct(run.input.scenarios.base.terminalGrowth)}). For comparison, revenue grew ${pct(c.cagr3)} a year over the last three years.`}</p>` : ""}
          <p style="margin:12px 0 0"><a class="fq-btn" href="valuation.html#${c.ticker}">Open the full DCF simulator</a></p></div>
      </section>`;
  }

  const ownership = (c) => `<section class="fq-section"><h2>Institutional ownership</h2>
    <p class="fq-note">Not built yet. Large investment managers report their holdings to the SEC each quarter on Form 13F, up to 45 days after the quarter ends. Using it properly means matching security identifiers to tickers, handling amended filings and stock splits, and it would always be months old.
    It can show what large holders owned at a past date. It can never show real-time buying or selling, and FinanceIQ will not present it that way. It is on the list of deferred features in the methodology.</p></section>`;

  const TREND_KEYS = ["revenue", "netIncome", "freeCashFlow", "opMargin", "eps", "roic", "debt", "dilutedShares"];
  const trends = (c) => `<section class="fq-section"><h2>Ten years of annual results</h2>
    <div class="fq-two">${TREND_KEYS.map((k) => `<article class="fq-card fq-mini"><h3>${Views.METRICS[k].term ? term(Views.METRICS[k].term, Views.METRICS[k].label) : Views.METRICS[k].label}</h3><div class="fq-chart" data-trend="${k}"></div></article>`).join("")}</div>
    <p style="margin-top:14px"><a class="fq-btn" href="trends.html#${c.ticker}">Compare trends with another company</a></p></section>`;

  function research(c) {
    const mine = CASES.filter(([, pair]) => pair.includes(c.ticker));
    return `<section class="fq-section"><h2>Ivan's research on ${esc(c.name)}</h2>
      ${mine.length ? `<div class="fq-three">${mine.map(([id, , title]) => `<a class="fq-link" href="research.html?r=${id}"><strong>${esc(title)} →</strong><span>Case study</span></a>`).join("")}</div>`
        : `<p class="fq-muted">No case study covers ${esc(c.name)} yet.</p>`}
      <p style="margin-top:14px"><a class="fq-btn" href="research.html">All case studies</a></p></section>`;
  }

  /* ---------------- draw ---------------- */

  function drawCharts() {
    $$("[data-qchart]").forEach((el) => Views.quarterChart(el, [company], el.dataset.qchart));
    $$("[data-trend]").forEach((el) => Views.chart(el, [company], el.dataset.trend, { years: 10, height: 200 }));
    const priceEl = $("[data-price]"), m = market(), info = Core.state.marketInfo;
    if (priceEl && m) {
      const n = Math.min(252, m.series.close.length), dates = info.dates.slice(-n), close = m.series.close.slice(-n);
      Chart.line(priceEl, { xs: dates, height: 240, label: "Price", fmt: (v) => fmt(v, "perShare"), axisFmt: Chart.axis.perShare, baseline: Math.min(...close),
        series: [{ name: company.name, short: company.ticker, color: Core.COLORS[0], values: Object.fromEntries(dates.map((d, i) => [d, close[i]])) }] });
    }
  }

  function render(c) {
    company = c; c._slot = 0;
    const rating = Core.rating(c.ticker);
    document.title = `${c.name} (${c.ticker}) · FinanceIQ`;
    $("#fq-hero").innerHTML = header(c, rating);
    const body = { overview: () => overview(c, rating), financials: () => financials(c), earnings: () => earnings(c, rating), quant: () => quant(c, rating),
      valuation: () => valuation(c, rating), ownership: () => ownership(c), trends: () => trends(c), research: () => research(c) }[tab] || (() => overview(c, rating));
    $("#app").innerHTML = body();
    Core.combo($("#cmp"), { exclude: () => c.ticker, emptyList: () => Core.byGroup().filter((x) => x.group === c.group).concat(Core.byGroup().filter((x) => x.group !== c.group)).slice(0, 12),
      onSelect: (t) => { location.href = `compare.html#${c.ticker}-${t}`; } });
    drawCharts();
  }

  Core.start({ page: "company", mode: "single", render });

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab]"), p = e.target.closest("[data-rpreset]");
    if (t) { tab = t.dataset.tab; history.replaceState(null, "", `company.html?tab=${tab}#${company.ticker}`); render(company); }
    else if (p) { Core.setRatingWeights({ ...Ratings.PRESETS[p.dataset.rpreset] }); render(company); }
    else if (e.target.closest("#watch")) { Core.toggleWatch(company.ticker); render(company); }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id !== "myprice") return;
    const input = Core.dcfInputs(company), v = Number(e.target.value);
    Core.saveDcf(company, { fcf0: input.fcf0, cash: input.cash, debt: input.debt, shares: input.shares, years: input.years, fade: input.fade, scenarios: input.scenarios, price: v > 0 ? v : null });
    render(company);
  });
  Core.onResize(() => company && drawCharts());
})();
