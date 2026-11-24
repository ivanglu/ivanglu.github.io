/* ============================================================
   FinanceIQ — main script. No libraries; plain JavaScript + SVG.

   How it fits together:
     1. load()        fetches the company list, AI summaries and Ivan's analysis
     2. prepare()     turns raw 10-K figures into ratios (margins, growth, ...)
     3. render()      builds every section for the two selected companies
     4. drawChart()   draws one interactive line chart as SVG
     5. explain.*     turn the numbers into plain-English sentences
   ============================================================ */

const DEFAULT_PAIR = ["AAPL", "MSFT"];
const COLORS = ["var(--series-a)", "var(--series-b)"];

const state = { list: [], summaries: {}, analysis: null, cache: {}, a: null, b: null, tabs: {} };

/* ---------------- small helpers ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);

// Escape text before putting it into HTML.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const isNum = (v) => typeof v === "number" && isFinite(v);

// $478.8B, $850M, −$2.7B
function money(v) {
  if (!isNum(v)) return "n/a";
  const abs = Math.abs(v);
  const text = abs >= 1e9 ? (abs / 1e9).toFixed(1) + "B" : Math.round(abs / 1e6) + "M";
  return (v < 0 ? "−$" : "$") + text;
}
const pct = (v, digits = 1) => (isNum(v) ? (v < 0 ? "−" : "") + Math.abs(v * 100).toFixed(digits) + "%" : "n/a");
const ratio = (v) => (isNum(v) ? v.toFixed(2) + "×" : "n/a");
// "$27.60" out of every $100 of sales
const per100 = (v) => "$" + Math.abs(v * 100).toFixed(2);

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + " → " + res.status);
  return res.json();
}

/* ---------------- data ---------------- */

// Add the ratios the dashboard needs to each fiscal year.
function prepare(company) {
  const ys = company.years;
  ys.forEach((y, i) => {
    const prev = ys[i - 1];
    const div = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);
    y.growth = prev ? div(y.revenue - prev.revenue, prev.revenue) : null;
    y.grossMargin = div(y.grossProfit, y.revenue);
    y.opMargin = div(y.operatingIncome, y.revenue);
    y.netMargin = div(y.netIncome, y.revenue);
    y.fcfMargin = div(y.freeCashFlow, y.revenue);
    y.netCash = isNum(y.cash) && isNum(y.debt) ? y.cash - y.debt : null;
    y.debtToEquity = isNum(y.equity) && y.equity > 0 ? div(y.debt, y.equity) : null;
  });
  company.L = ys[ys.length - 1];                      // latest year
  company.P = ys[Math.max(0, ys.length - 6)];         // five years earlier
  company.span = company.L.fy - company.P.fy;
  // Compound annual growth rate: (end / start)^(1 / years) − 1
  company.cagr = company.span > 0 ? Math.pow(company.L.revenue / company.P.revenue, 1 / company.span) - 1 : null;
  return company;
}

async function getCompany(ticker) {
  if (!state.cache[ticker]) state.cache[ticker] = prepare(await getJSON(`data/${ticker}.json`));
  return state.cache[ticker];
}

/* ---------------- charts ---------------- */

// Each chart panel has tabs; each tab plots one field of the yearly data.
const PANELS = [
  {
    id: "revenue", title: "Revenue growth",
    what: "Revenue is all the money a company takes in from selling its products and services, before any costs.",
    tabs: [
      { key: "revenue", label: "Revenue", fmt: money },
      { key: "growth", label: "Growth per year", fmt: pct },
    ],
  },
  {
    id: "profit", title: "Profitability",
    what: "Margins show how much of each sales dollar is left after costs. Net margin counts every cost, including taxes.",
    tabs: [
      { key: "netMargin", label: "Net margin", fmt: pct },
      { key: "opMargin", label: "Operating margin", fmt: pct },
      { key: "grossMargin", label: "Gross margin", fmt: pct },
    ],
  },
  {
    id: "debt", title: "Debt",
    what: "Debt is money borrowed from lenders that must be repaid with interest. Cash on hand is the cushion against it.",
    tabs: [
      { key: "debt", label: "Total debt", fmt: money },
      { key: "cash", label: "Cash", fmt: money },
      { key: "netCash", label: "Cash minus debt", fmt: money },
    ],
  },
  {
    id: "cash", title: "Cash flow",
    what: "Free cash flow is the cash left after paying to run the business and to buy buildings and equipment.",
    tabs: [
      { key: "freeCashFlow", label: "Free cash flow", fmt: money },
      { key: "operatingCashFlow", label: "Operating cash flow", fmt: money },
      { key: "capex", label: "Capital spending", fmt: money },
    ],
  },
];

// Pick round axis values (0, 50, 100, ...) that cover lo..hi.
function niceTicks(lo, hi, count = 5) {
  if (lo === hi) hi = lo + 1;
  const rough = (hi - lo) / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough);
  const ticks = [];
  for (let v = Math.floor(lo / step) * step; v < hi + step * 0.999; v += step) ticks.push(+v.toPrecision(12));
  return ticks;
}

// Shorter number format for the axis: $100B, 20%
function axisFmt(fmt, v) {
  if (fmt === pct) return pct(v, 0);
  const abs = Math.abs(v);
  const text = abs >= 1e9 ? +(abs / 1e9).toFixed(1) + "B" : abs >= 1e6 ? Math.round(abs / 1e6) + "M" : "0";
  return (v < 0 ? "−$" : "$") + text;
}

function drawChart(host, companies, tab) {
  const W = Math.max(300, host.clientWidth);
  const H = W < 480 ? 250 : 300;
  const m = { top: 14, right: 58, bottom: 28, left: 52 };

  const years = [...new Set(companies.flatMap((c) => c.years.map((y) => y.fy)))].sort();
  const series = companies.map((c, i) => ({
    name: c.name, ticker: c.ticker, color: COLORS[i],
    byYear: Object.fromEntries(c.years.map((y) => [y.fy, y[tab.key]])),
  }));
  const values = series.flatMap((s) => Object.values(s.byYear)).filter(isNum);
  if (!values.length) {
    host.innerHTML = `<p class="fq-note">Neither company reports this figure in a standard way.</p>`;
    return;
  }

  const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values));
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const x = (fy) => m.left + (years.indexOf(fy) / Math.max(1, years.length - 1)) * (W - m.left - m.right);
  const y = (v) => m.top + (1 - (v - lo) / (hi - lo)) * (H - m.top - m.bottom);

  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(tab.label)}: ${esc(companies.map((c) => c.name).join(" vs "))}">`;

  // grid + y labels
  for (const t of ticks) {
    svg += `<line class="${t === 0 && lo < 0 ? "fq-zero" : "fq-gridline"}" x1="${m.left}" x2="${W - m.right}" y1="${y(t)}" y2="${y(t)}"/>`;
    svg += `<text x="${m.left - 8}" y="${y(t) + 4}" text-anchor="end">${axisFmt(tab.fmt, t)}</text>`;
  }
  // x labels (skip every other one on narrow screens)
  const skip = (W - m.left - m.right) / years.length < 44 ? 2 : 1;
  years.forEach((fy, i) => {
    if ((years.length - 1 - i) % skip === 0) svg += `<text x="${x(fy)}" y="${H - 8}" text-anchor="middle">${fy}</text>`;
  });

  // lines + dots; a missing year breaks the line instead of drawing through it
  const ends = [];
  for (const s of series) {
    let d = "", pen = false, last = null;
    for (const fy of years) {
      const v = s.byYear[fy];
      if (!isNum(v)) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${x(fy).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true; last = { fy, v };
    }
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const fy of years) {
      if (isNum(s.byYear[fy])) svg += `<circle cx="${x(fy)}" cy="${y(s.byYear[fy])}" r="3" fill="${s.color}" stroke="var(--bg-elev)" stroke-width="1.5"/>`;
    }
    if (last) ends.push({ s, px: x(last.fy), py: y(last.v) });
  }
  // label each line at its right end; nudge apart if they would overlap
  if (ends.length === 2 && Math.abs(ends[0].py - ends[1].py) < 14) {
    const [top, bottom] = ends[0].py <= ends[1].py ? ends : [ends[1], ends[0]];
    const mid = (top.py + bottom.py) / 2;
    top.py = mid - 7; bottom.py = mid + 7;
  }
  for (const e of ends) svg += `<text class="fq-endlabel" x="${e.px + 9}" y="${e.py + 4}">${esc(e.s.ticker)}</text>`;

  // hover layer
  svg += `<line class="fq-cross" id="cross" y1="${m.top}" y2="${H - m.bottom}" visibility="hidden"/>`;
  series.forEach((s, i) => { svg += `<circle id="hot${i}" r="5" fill="${s.color}" stroke="var(--bg-elev)" stroke-width="2" visibility="hidden"/>`; });
  svg += `<rect id="hit" x="${m.left - 10}" y="0" width="${W - m.left - m.right + 20}" height="${H}" fill="transparent"/></svg>`;
  host.innerHTML = svg + `<div class="fq-tip" hidden></div>`;

  const tip = $(".fq-tip", host), cross = $("#cross", host);
  const hide = () => {
    tip.hidden = true;
    cross.setAttribute("visibility", "hidden");
    series.forEach((_, i) => $("#hot" + i, host).setAttribute("visibility", "hidden"));
  };
  $("#hit", host).addEventListener("pointermove", (ev) => {
    const box = host.getBoundingClientRect();
    const px = ev.clientX - box.left;
    // nearest fiscal year to the pointer
    const fy = years.reduce((best, f) => (Math.abs(x(f) - px) < Math.abs(x(best) - px) ? f : best), years[0]);
    cross.setAttribute("x1", x(fy)); cross.setAttribute("x2", x(fy));
    cross.setAttribute("visibility", "visible");
    let html = `<b>Fiscal ${fy}</b>`;
    series.forEach((s, i) => {
      const v = s.byYear[fy], dot = $("#hot" + i, host);
      if (isNum(v)) { dot.setAttribute("cx", x(fy)); dot.setAttribute("cy", y(v)); dot.setAttribute("visibility", "visible"); }
      else dot.setAttribute("visibility", "hidden");
      html += `<div><i class="fq-swatch" style="background:${s.color}"></i>${esc(s.name)}<em>${isNum(v) ? tab.fmt(v) : "—"}</em></div>`;
    });
    tip.innerHTML = html;
    tip.hidden = false;
    const left = x(fy) + 14 + tip.offsetWidth > W ? x(fy) - 14 - tip.offsetWidth : x(fy) + 14;
    tip.style.left = Math.max(0, left) + "px";
  });
  $("#hit", host).addEventListener("pointerleave", hide);
}

/* ---------------- plain-English explanations ---------------- */

// Each function gets the two companies and returns HTML paragraphs.
const explain = {
  revenue(A, B) {
    const [big, small] = A.L.revenue >= B.L.revenue ? [A, B] : [B, A];
    const times = big.L.revenue / small.L.revenue;
    let p1 = `${A.name} brought in <strong>${money(A.L.revenue)}</strong> in fiscal ${A.L.fy} and ${B.name} brought in <strong>${money(B.L.revenue)}</strong>. `;
    p1 += times < 1.1 ? `They are about the same size by sales.` : `${big.name} is about ${times.toFixed(1)} times the size of ${small.name} by sales.`;

    const [fast, slow] = A.cagr >= B.cagr ? [A, B] : [B, A];
    const gap = (fast.cagr - slow.cagr) * 100;
    let p2 = `Over the last ${fast.span} years, ${poss(fast.name)} sales ${grew(fast.cagr)} a year on average, while ${poss(slow.name)} ${grew(slow.cagr)}. `;
    p2 += gap < 1.5 ? `That is close enough to call their growth about even.`
      : `So <strong>${fast.name} is growing ${gap > 8 ? "much " : ""}faster</strong>.`;
    if (isNum(A.L.growth) && isNum(B.L.growth)) {
      p2 += ` In the most recent year, sales ${moved(A.L.growth)} at ${A.name} and ${moved(B.L.growth)} at ${B.name}.`;
    }
    return para(p1) + para(p2) + why("Growing revenue means more customers or higher prices. A company that can't grow sales can only grow profit by cutting costs, and that has a limit.");
  },

  profit(A, B) {
    const kept = (c) => c.L.netMargin >= 0
      ? `${c.name} kept <strong>${per100(c.L.netMargin)}</strong> as profit`
      : `${c.name} <strong>lost ${per100(c.L.netMargin)}</strong>`;
    let p1 = `Out of every $100 of sales in its latest year, ${kept(A)} and ${kept(B)}, after paying all costs and taxes. `;
    const [hi, lo] = A.L.netMargin >= B.L.netMargin ? [A, B] : [B, A];
    const gap = (hi.L.netMargin - lo.L.netMargin) * 100;
    p1 += gap < 1 ? `Their profitability is nearly identical.` : `<strong>${hi.name} turns more of each sales dollar into profit.</strong>`;

    const trend = (c) => {
      const d = (c.L.netMargin - c.P.netMargin) * 100;
      const word = Math.abs(d) < 1 ? "is about where it was" : d > 0 ? "has widened" : "has narrowed";
      return `${poss(c.name)} net margin ${word} since fiscal ${c.P.fy} (${pct(c.P.netMargin)} then, ${pct(c.L.netMargin)} now)`;
    };
    const p2 = `${trend(A)}. ${trend(B)}.`;
    return para(p1) + para(p2) + why("Two companies can sell the same amount and end up with very different profits. A high margin usually means customers will pay extra for the product, or that it is cheap to make.");
  },

  debt(A, B) {
    const position = (c) => {
      if (!c.L.debt) return `${c.name} reports no debt and holds ${money(c.L.cash)} in cash and short-term investments.`;
      const net = c.L.netCash;
      return `${c.name} owes lenders <strong>${money(c.L.debt)}</strong> and holds ${money(c.L.cash)} in cash and short-term investments, so it has ${money(Math.abs(net))} ${net >= 0 ? "more cash than debt" : "more debt than cash"}.`;
    };
    const payoff = (c) => {
      if (!c.L.debt) return null;
      if (!(c.L.freeCashFlow > 0)) return `${c.name} is not producing free cash flow right now, so it could not pay debt down out of its own cash flow`;
      const yrs = c.L.debt / c.L.freeCashFlow;
      return `${c.name} could repay all of its debt with about ${yrs < 1 ? Math.max(1, Math.round(yrs * 12)) + " months" : yrs.toFixed(1) + " years"} of free cash flow`;
    };
    const payoffs = [payoff(A), payoff(B)].filter(Boolean);
    let html = para(position(A) + " " + position(B));
    if (payoffs.length) html += para("At last year's pace, " + payoffs.join(", and ") + ".");
    const negative = [A, B].filter((c) => isNum(c.L.equity) && c.L.equity <= 0);
    if (negative.length) {
      html += para(`${negative.map((c) => c.name).join(" and ")} ${negative.length > 1 ? "have" : "has"} negative shareholder equity, which means the company owes more than the recorded value of everything it owns. This often comes from years of buying back its own shares, not from losses, but it leaves less of a cushion.`);
    }
    return html + why("Debt is not automatically bad, since borrowing can pay for growth. It becomes a risk when a company owes far more than it can comfortably repay from the cash it produces.");
  },

  cash(A, B) {
    const made = (c) => isNum(c.L.freeCashFlow)
      ? `${c.name} produced <strong>${money(c.L.freeCashFlow)}</strong> of free cash flow (${c.L.freeCashFlow >= 0 ? per100(c.L.fcfMargin) + " per $100 of sales" : "it spent more cash than it brought in"})`
      : `${c.name} does not report capital spending in a standard way, so free cash flow can't be calculated`;
    let html = para(`${made(A)}. ${made(B)}.`);
    const share = (c) => (isNum(c.L.capex) && c.L.operatingCashFlow > 0 ? c.L.capex / c.L.operatingCashFlow : null);
    const sa = share(A), sb = share(B);
    if (isNum(sa) && isNum(sb)) {
      const [heavy, light, sh, sl] = sa >= sb ? [A, B, sa, sb] : [B, A, sb, sa];
      html += para(`${heavy.name} put ${pct(sh, 0)} of its operating cash back into buildings and equipment, compared with ${pct(sl, 0)} for ${light.name}. ` +
        (sh - sl > 0.15 ? `Heavy investment like that lowers free cash flow today in the hope of more growth later.` : `Both reinvest a similar share of their cash.`));
    }
    return html + why("Profit is an accounting number, but cash is what actually pays for dividends, debt repayment and new projects. A company with strong free cash flow has more choices.");
  },
};

const para = (html) => `<p>${html}</p>`;
const why = (text) => `<p class="fq-why"><strong>Why it matters:</strong> ${text}</p>`;
// Apple -> Apple's, Starbucks -> Starbucks', McDonald's -> McDonald's
const poss = (name) => (name.endsWith("'s") ? name : name.endsWith("s") ? name + "'" : name + "'s");
const grew = (r) => (r >= 0 ? `grew about ${pct(r)}` : `shrank about ${pct(Math.abs(r))}`);
const moved = (r) => (r >= 0 ? `rose ${pct(r)}` : `fell ${pct(Math.abs(r))}`);

/* ---------------- scorecard ---------------- */

// better: "high" or "low" decides who gets the check mark; null = no winner (size only)
const SCORE_ROWS = [
  { label: "Revenue", hint: "Total sales, latest fiscal year", get: (c) => c.L.revenue, fmt: money, better: null },
  { label: "Revenue growth per year", hint: "Average over the last five years", get: (c) => c.cagr, fmt: pct, better: "high" },
  { label: "Net profit margin", hint: "Profit kept from each $1 of sales", get: (c) => c.L.netMargin, fmt: pct, better: "high" },
  { label: "Operating margin", hint: "Profit from the core business, before interest and tax", get: (c) => c.L.opMargin, fmt: pct, better: "high" },
  { label: "Debt-to-equity", hint: "Borrowed money compared with shareholders' money", get: (c) => c.L.debtToEquity, fmt: ratio, better: "low" },
  { label: "Cash minus debt", hint: "Positive means it could repay every lender today", get: (c) => c.L.netCash, fmt: money, better: "high" },
  { label: "Free cash flow margin", hint: "Spare cash produced from each $1 of sales", get: (c) => c.L.fcfMargin, fmt: pct, better: "high" },
];

function scorecard(A, B) {
  const wins = [0, 0];
  let judged = 0;
  const rows = SCORE_ROWS.map((r) => {
    const va = r.get(A), vb = r.get(B);
    let lead = -1;
    if (r.better && isNum(va) && isNum(vb) && va !== vb) {
      lead = (r.better === "high" ? va > vb : va < vb) ? 0 : 1;
      wins[lead]++; judged++;
    }
    const cell = (v, i, c) => {
      let text = r.fmt(v);
      if (r.label === "Debt-to-equity" && !isNum(v) && c.L.equity <= 0) text = "negative equity";
      return `<td class="${lead === i ? "fq-lead" : ""}">${text}</td>`;
    };
    return `<tr><td><span class="fq-metric">${r.label}</span><span class="fq-hint">${r.hint}</span></td>${cell(va, 0, A)}${cell(vb, 1, B)}</tr>`;
  }).join("");

  return `
  <section class="fq-section" id="scorecard">
    <h2>Scorecard</h2>
    <p class="fq-sub">The headline numbers from each company's latest annual report. A check mark shows which company is ahead on that measure.</p>
    <div class="fq-card">
      <div class="fq-tablewrap"><table class="fq-table">
        <thead><tr><th>Measure</th>
          <th><span class="fq-th"><i class="fq-swatch fq-swatch--a"></i>${esc(A.name)} · FY${A.L.fy}</span></th>
          <th><span class="fq-th"><i class="fq-swatch fq-swatch--b"></i>${esc(B.name)} · FY${B.L.fy}</span></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="fq-tally">Of the ${judged} measures compared, <strong>${esc(A.name)} is ahead on ${wins[0]}</strong> and <strong>${esc(B.name)} on ${wins[1]}</strong>.
      A count like this treats every measure as equally important, which they are not. Deciding which ones matter most takes judgement.</p>
    </div>
  </section>`;
}

/* ---------------- AI summary + sources ---------------- */

function aiCard(c, i) {
  const s = state.summaries.companies[c.ticker];
  const list = (items) => `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
  return `
  <article class="fq-card fq-ai">
    <h3><i class="fq-swatch" style="background:${COLORS[i]}"></i>${esc(c.name)}</h3>
    <p class="fq-ai__meta">${esc(c.sector)} · ${esc(c.legalName)}</p>
    ${s ? `<h4>Strengths</h4>${list(s.strengths)}<h4>Risks</h4>${list(s.risks)}` : `<p class="fq-note">No AI summary has been generated for this company yet.</p>`}
    <p class="fq-ai__src">
      <a href="${esc(c.L.url)}" target="_blank" rel="noopener">Latest annual report: 10-K for fiscal ${c.L.fy}, filed ${c.L.filed} ↗</a>
      <a href="${esc(c.filingsUrl)}" target="_blank" rel="noopener">All ${esc(c.name)} 10-K filings on SEC EDGAR ↗</a>
    </p>
  </article>`;
}

function sourceTable(c, i) {
  const rows = [...c.years].reverse().map((y) => `
    <tr><td>FY${y.fy} <span class="fq-hint">year ended ${y.end}</span></td>
    <td>${money(y.revenue)}</td><td>${money(y.netIncome)}</td><td>${money(y.debt)}</td><td>${money(y.cash)}</td><td>${money(y.freeCashFlow)}</td>
    <td><a href="${esc(y.url)}" target="_blank" rel="noopener">10-K ↗</a></td></tr>`).join("");
  return `
  <div class="fq-card">
    <h3><i class="fq-swatch" style="background:${COLORS[i]}"></i>${esc(c.name)}</h3>
    <div class="fq-tablewrap"><table class="fq-table">
      <thead><tr><th>Fiscal year</th><th>Revenue</th><th>Net income</th><th>Debt</th><th>Cash</th><th>Free cash flow</th><th>Report</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

/* ---------------- Ivan's analysis ---------------- */

// ivan-analysis.txt is a small text file Ivan writes himself. Format:
//   pair: AAPL, MSFT        <- header lines, then a blank line, then the text
//   ## Heading   - bullet   **bold**   *italic*   [link](https://...)
function parseAnalysis(text) {
  text = text.replace(/<!--[\s\S]*?-->/g, "").replace(/\r/g, "");
  const meta = {};
  const lines = text.split("\n");
  while (lines.length && /^\s*$/.test(lines[0])) lines.shift();
  while (lines.length && /^[a-z]+:/i.test(lines[0])) {
    const [k, ...rest] = lines.shift().split(":");
    meta[k.trim().toLowerCase()] = rest.join(":").trim();
  }
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  let html = "", para = [], list = [];
  const flush = () => {
    if (para.length) html += `<p>${inline(para.join(" "))}</p>`;
    if (list.length) html += `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`;
    para = []; list = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) flush();
    else if (line.startsWith("#")) { flush(); html += `<h3>${inline(line.replace(/^#+\s*/, ""))}</h3>`; }
    else if (/^[-*]\s+/.test(line)) { if (para.length) flush(); list.push(line.replace(/^[-*]\s+/, "")); }
    else { if (list.length) flush(); para.push(line); }
  }
  flush();
  const pair = (meta.pair || DEFAULT_PAIR.join(",")).split(/[\s,]+|vs/i).map((t) => t.trim().toUpperCase()).filter(Boolean);
  return { html, pair, updated: meta.updated || "" };
}

function ivanSection(A, B) {
  const an = state.analysis;
  const [p1, p2] = an.pair;
  const names = an.pair.map((t) => (state.list.find((c) => c.ticker === t) || { name: t }).name);
  const viewingPair = [A.ticker, B.ticker].includes(p1) && [A.ticker, B.ticker].includes(p2);
  const jump = viewingPair ? "" :
    `<p class="fq-note">Ivan's write-up is about ${esc(names[0])} and ${esc(names[1])}. <a href="#${p1}-${p2}" data-pair>Load that comparison</a> to see the numbers he refers to.</p>`;

  if (!an.html) {
    return `
    <section class="fq-section" id="ivan">
      <h2>Ivan's analysis</h2>
      <div class="fq-card fq-ivan fq-ivan--pending">
        <p class="fq-ivan__by">Written by Ivan Glushchenko, not by AI</p>
        <p>Ivan is writing this section. It will cover what he learned from comparing ${esc(names[0])} and ${esc(names[1])},
        and which of the two he believes is financially stronger, in his own words.</p>
      </div>
    </section>`;
  }
  return `
  <section class="fq-section" id="ivan">
    <h2>Ivan's analysis</h2>
    <p class="fq-sub">Everything above is data and software. This part is my own reading of the numbers.</p>
    <div class="fq-card fq-ivan">
      <p class="fq-ivan__by">Written by Ivan Glushchenko, not by AI${an.updated ? " · " + esc(an.updated) : ""}</p>
      ${jump}
      <div class="fq-ivan__body">${an.html}</div>
    </div>
  </section>`;
}

/* ---------------- page ---------------- */

function panelHTML(p, A, B) {
  const active = state.tabs[p.id] || p.tabs[0].key;
  const tabs = p.tabs.map((t) => `<button type="button" data-panel="${p.id}" data-tab="${t.key}" aria-pressed="${t.key === active}">${t.label}</button>`).join("");
  return `
  <article class="fq-card fq-panel" id="panel-${p.id}">
    <div class="fq-panel__head"><h3>${p.title}</h3><div class="fq-tabs" role="group" aria-label="${p.title} chart">${tabs}</div></div>
    <p class="fq-panel__what">${p.what}</p>
    <div class="fq-legend">
      <span><i class="fq-swatch fq-swatch--a"></i>${esc(A.name)}</span>
      <span><i class="fq-swatch fq-swatch--b"></i>${esc(B.name)}</span>
    </div>
    <div class="fq-chart" data-chart="${p.id}"></div>
    <div class="fq-plain"><h4>In plain English</h4>${explain[p.id](A, B)}</div>
  </article>`;
}

function drawAllCharts() {
  const pair = [state.cache[state.a], state.cache[state.b]];
  for (const p of PANELS) {
    const tab = p.tabs.find((t) => t.key === state.tabs[p.id]) || p.tabs[0];
    drawChart($(`[data-chart="${p.id}"]`), pair, tab);
  }
}

async function render() {
  const [A, B] = await Promise.all([getCompany(state.a), getCompany(state.b)]);
  const s = state.summaries;
  $("#app").innerHTML = `
    ${scorecard(A, B)}
    <section class="fq-section" id="charts">
      <h2>The four tests</h2>
      <p class="fq-sub">Ten years of history for each company. Move your pointer over a chart to read exact values, and use the buttons to switch measures.</p>
      <div class="fq-panels">${PANELS.map((p) => panelHTML(p, A, B)).join("")}</div>
    </section>
    <section class="fq-section" id="ai">
      <h2>Strengths and risks <span class="fq-badge">AI-generated</span></h2>
      <p class="fq-sub">Written by ${esc(s.model)}, an AI model, from the figures on this page on ${esc(s.generated)}. AI can be wrong, so each summary links to the original report.</p>
      <div class="fq-two">${aiCard(A, 0)}${aiCard(B, 1)}</div>
    </section>
    ${ivanSection(A, B)}
    <section class="fq-section" id="sources">
      <h2>The numbers and their sources</h2>
      <p class="fq-sub">Every figure used above, with a link to the annual report it came from.</p>
      <div class="fq-sources">${sourceTable(A, 0)}${sourceTable(B, 1)}</div>
    </section>`;
  drawAllCharts();
  document.title = `${A.name} vs ${B.name} — FinanceIQ`;
}

function syncPicker() {
  const options = (selected, other) => state.list.map((c) =>
    `<option value="${c.ticker}" ${c.ticker === selected ? "selected" : ""} ${c.ticker === other ? "disabled" : ""}>${esc(c.name)} (${c.ticker})</option>`).join("");
  $("#selA").innerHTML = options(state.a, state.b);
  $("#selB").innerHTML = options(state.b, state.a);
}

function setPair(a, b, updateHash = true) {
  state.a = a; state.b = b;
  syncPicker();
  if (updateHash) history.replaceState(null, "", `#${a}-${b}`);
  return render();
}

// The pair lives in the URL (#AAPL-MSFT) so a comparison can be shared as a link.
function pairFromHash() {
  const m = location.hash.match(/^#([A-Z]+)-([A-Z]+)$/);
  const known = (t) => state.list.some((c) => c.ticker === t);
  return m && known(m[1]) && known(m[2]) && m[1] !== m[2] ? [m[1], m[2]] : null;
}

async function load() {
  try {
    const [index, summaries, analysisText] = await Promise.all([
      getJSON("data/companies.json"),
      getJSON("data/summaries.json"),
      fetch("ivan-analysis.txt").then((r) => (r.ok ? r.text() : "")),
    ]);
    state.list = index.companies.sort((x, y) => x.name.localeCompare(y.name));
    state.summaries = summaries;
    state.analysis = parseAnalysis(analysisText);
    $("#generated").textContent = index.generated;

    $("#selA").addEventListener("change", (e) => setPair(e.target.value, state.b));
    $("#selB").addEventListener("change", (e) => setPair(state.a, e.target.value));
    $("#swap").addEventListener("click", () => setPair(state.b, state.a));
    // chart tab buttons and the "load that comparison" link
    $("#app").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (btn) {
        state.tabs[btn.dataset.panel] = btn.dataset.tab;
        btn.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === btn));
        const p = PANELS.find((x) => x.id === btn.dataset.panel);
        drawChart($(`[data-chart="${p.id}"]`), [state.cache[state.a], state.cache[state.b]], p.tabs.find((t) => t.key === btn.dataset.tab));
      }
      if (e.target.closest("a[data-pair]")) {
        e.preventDefault();
        setPair(...state.analysis.pair.slice(0, 2)).then(() => $("#ivan").scrollIntoView());
      }
    });
    window.addEventListener("hashchange", () => { const p = pairFromHash(); if (p) setPair(p[0], p[1], false); });
    // redraw charts when the window width changes
    let timer;
    new ResizeObserver(() => { clearTimeout(timer); timer = setTimeout(() => state.a && $("[data-chart]") && drawAllCharts(), 120); }).observe($("#app"));

    const start = pairFromHash() || DEFAULT_PAIR;
    await setPair(start[0], start[1], false);
  } catch (err) {
    console.error(err);
    $("#app").innerHTML = `<p class="fq-loading">Sorry, the financial data could not be loaded. Please refresh the page.</p>`;
  }
}

load();
