/* Comparison page: four chart panels with plain-English explanations,
   AI-written strengths and risks, and the source tables. */

(() => {
  const { isNum, money, pct } = Calc;
  const { poss, swatch, term } = Core;
  const tabs = {};   // which tab is selected in each panel

  // "$27.60" out of every $100 of sales
  const per100 = (v) => "$" + Math.abs(v * 100).toFixed(2);
  const para = (html) => `<p>${html}</p>`;
  const why = (text) => `<p class="fq-why"><strong>Why it matters:</strong> ${text}</p>`;
  const grew = (r) => (r >= 0 ? `grew about ${pct(r)}` : `shrank about ${pct(Math.abs(r))}`);
  const moved = (r) => (r >= 0 ? `rose ${pct(r)}` : `fell ${pct(Math.abs(r))}`);

  const PANELS = [
    { id: "revenue", title: "Revenue growth", keys: ["revenue", "growth"],
      what: "Revenue is all the money a company takes in from selling its products and services, before any costs." },
    { id: "profit", title: "Profitability", keys: ["netMargin", "opMargin", "grossMargin"],
      what: "Margins show how much of each sales dollar is left after costs. Net margin counts every cost, including taxes." },
    { id: "debt", title: "Debt", keys: ["debt", "cash", "netCash"],
      what: "Debt is money borrowed from lenders that must be repaid with interest. Cash and short-term investments are the cushion against it." },
    { id: "cash", title: "Cash flow", keys: ["freeCashFlow", "operatingCashFlow", "capex"],
      what: "Free cash flow is the cash left after paying to run the business and to buy buildings and equipment." },
  ];

  // Each function turns the numbers for two companies into sentences.
  const explain = {
    revenue(A, B) {
      const [big, small] = A.L.revenue >= B.L.revenue ? [A, B] : [B, A];
      const times = big.L.revenue / small.L.revenue;
      let p1 = `${A.name} brought in <strong>${money(A.L.revenue)}</strong> in fiscal ${A.L.fy} and ${B.name} brought in <strong>${money(B.L.revenue)}</strong>. `;
      p1 += times < 1.1 ? `They are about the same size by sales.` : `${big.name} is about ${times.toFixed(1)} times the size of ${small.name} by sales.`;
      let p2 = "";
      if (isNum(A.cagr) && isNum(B.cagr)) {
        const [fast, slow] = A.cagr >= B.cagr ? [A, B] : [B, A];
        const gap = (fast.cagr - slow.cagr) * 100;
        p2 = `Over the last ${fast.span} years, ${poss(fast.name)} sales ${grew(fast.cagr)} a year on average, while ${poss(slow.name)} ${grew(slow.cagr)}. `;
        p2 += gap < 1.5 ? `That is close enough to call their growth about even.` : `So <strong>${fast.name} is growing ${gap > 8 ? "much " : ""}faster</strong>.`;
      }
      if (isNum(A.L.growth) && isNum(B.L.growth)) p2 += ` In the most recent year, sales ${moved(A.L.growth)} at ${A.name} and ${moved(B.L.growth)} at ${B.name}.`;
      return para(p1) + para(p2) + why("Growing revenue means more customers or higher prices. A company that can't grow sales can only grow profit by cutting costs, and that has a limit.");
    },

    profit(A, B) {
      const kept = (c) => (c.L.netMargin >= 0 ? `${c.name} kept <strong>${per100(c.L.netMargin)}</strong> as profit` : `${c.name} <strong>lost ${per100(c.L.netMargin)}</strong>`);
      let p1 = `Out of every $100 of sales in its latest year, ${kept(A)} and ${kept(B)}, after paying all costs and taxes. `;
      const [hi, lo] = A.L.netMargin >= B.L.netMargin ? [A, B] : [B, A];
      p1 += (hi.L.netMargin - lo.L.netMargin) * 100 < 1 ? `Their profitability is nearly identical.` : `<strong>${hi.name} turns more of each sales dollar into profit.</strong>`;
      const trend = (c) => {
        const d = (c.L.netMargin - c.P.netMargin) * 100;
        const word = Math.abs(d) < 1 ? "is about where it was" : d > 0 ? "has widened" : "has narrowed";
        return `${poss(c.name)} net margin ${word} since fiscal ${c.P.fy} (${pct(c.P.netMargin)} then, ${pct(c.L.netMargin)} now)`;
      };
      return para(p1) + para(`${trend(A)}. ${trend(B)}.`) + why("Two companies can sell the same amount and end up with very different profits. A high margin usually means customers will pay extra for the product, or that it is cheap to make.");
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
      const made = (c) => (isNum(c.L.freeCashFlow)
        ? `${c.name} produced <strong>${money(c.L.freeCashFlow)}</strong> of free cash flow (${c.L.freeCashFlow >= 0 ? per100(c.L.fcfMargin) + " per $100 of sales" : "it spent more cash than it brought in"})`
        : `${c.name} does not report capital spending in a standard way, so free cash flow can't be calculated`);
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

  function panel(p, A, B) {
    const active = tabs[p.id] || p.keys[0];
    const buttons = p.keys.map((k) => `<button type="button" data-panel="${p.id}" data-key="${k}" aria-pressed="${k === active}">${Views.METRICS[k].label}</button>`).join("");
    return `
    <article class="fq-card" id="panel-${p.id}">
      <div class="fq-panel__head"><h3>${p.title}</h3><div class="fq-seg" role="group" aria-label="${p.title} chart">${buttons}</div></div>
      <p class="fq-panel__what">${p.what}</p>
      ${Views.legend(A, B)}
      <div class="fq-chart" data-chart="${p.id}"></div>
      <div class="fq-plain"><h4>In plain English</h4>${explain[p.id](A, B)}</div>
    </article>`;
  }

  function aiCard(c, i) {
    const s = Core.state.summaries.companies[c.ticker];
    const list = (items) => `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
    return `
    <article class="fq-card fq-ai">
      <h3>${swatch(i)}${esc(c.name)}</h3>
      ${s ? `<h4>Strengths</h4>${list(s.strengths)}<h4>Risks</h4>${list(s.risks)}`
          : `<p class="fq-empty">No AI summary has been written for ${esc(c.name)} yet. The rule-based strengths and weaknesses on the <a data-nav="health.html" href="health.html#${Core.state.a}-${Core.state.b}">Financial Health</a> page cover every company.</p>`}
      <p class="fq-ai__src">
        <a href="${esc(c.L.url)}" target="_blank" rel="noopener">Latest annual report: 10-K for fiscal ${c.L.fy}, filed ${c.L.filed} ↗</a>
        <a href="${esc(c.filingsUrl)}" target="_blank" rel="noopener">All ${esc(c.name)} 10-K filings on SEC EDGAR ↗</a>
      </p>
    </article>`;
  }

  let pair = [];
  const draw = () => PANELS.forEach((p) => Views.chart($(`[data-chart="${p.id}"]`), pair, tabs[p.id] || p.keys[0]));

  Core.start({
    page: "compare",
    usesPair: true,
    render(A, B) {
      pair = [A, B];
      const s = Core.state.summaries;
      $("#app").innerHTML = `
        <section class="fq-section" id="charts">
          <h2>The four tests</h2>
          <p class="fq-sub">Ten years of history. Move your pointer over a chart to read exact values, and use the buttons to switch measures.</p>
          <div class="fq-grid">${PANELS.map((p) => panel(p, A, B)).join("")}</div>
        </section>
        <section class="fq-section" id="ai">
          <h2>Strengths and risks <span class="fq-badge">AI-generated</span></h2>
          <p class="fq-sub">Written by ${esc(s.model)}, an AI model, from the figures on this site on ${esc(s.generated)}. AI can be wrong, so each summary links to the original report. Calculations on this site never use AI.</p>
          <div class="fq-two">${aiCard(A, 0)}${aiCard(B, 1)}</div>
        </section>
        <section class="fq-section" id="sources">
          <h2>The numbers and their sources</h2>
          <p class="fq-sub">The main figures used above, with the date each report was filed and a link to it.</p>
          <div class="fq-grid">${Views.sourceTable(A, 0)}${Views.sourceTable(B, 1)}</div>
        </section>`;
      draw();
    },
  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-key]");
    if (!btn) return;
    tabs[btn.dataset.panel] = btn.dataset.key;
    $$("button", btn.parentElement).forEach((b) => b.setAttribute("aria-pressed", b === btn));
    Views.chart($(`[data-chart="${btn.dataset.panel}"]`), pair, btn.dataset.key);
  });
  Core.onResize(() => pair.length && draw());
})();
