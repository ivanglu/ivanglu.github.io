/* Valuation page: an interactive discounted cash flow (DCF) model with
   three scenarios and a sensitivity table. All arithmetic is in Calc.dcf. */

(() => {
  const { isNum, money, pct, fmt } = Calc;
  const { term, swatch } = Core;
  let pair = [], slot = 0, scenario = "base";

  const company = () => pair[slot];

  // Sliders work in whole percentages; the model works in fractions.
  const RATES = [
    { key: "growth", label: "Cash flow growth per year", min: -10, max: 30, step: 0.5, tip: "How fast free cash flow grows each year of the projection." },
    { key: "discount", label: "Discount rate", min: 4, max: 15, step: 0.25, tip: Core.GLOSSARY.discountRate },
    { key: "terminalGrowth", label: "Terminal growth", min: 0, max: 5, step: 0.25, tip: Core.GLOSSARY.terminalGrowth },
  ];

  /* ---------------- where the starting cash flow comes from ---------------- */

  function bridgeCard(c) {
    const L = c.L;
    const afterTax = isNum(L.interestExpense) ? L.interestExpense * (1 - L.taxRate) : null;
    const history = c.years.slice(-5).map((y) => `<td>${money(isNum(y.fcff) ? y.fcff : y.freeCashFlow)}</td>`).join("");
    return `
    <div class="fq-card">
      <h3>Starting point: ${term("fcff", "free cash flow to the firm")}</h3>
      <p class="fq-panel__what">This model values the whole business first (enterprise value), then subtracts debt and adds cash to get the shareholders' part.
        For that to be consistent, the cash flow must be the one available to lenders <em>and</em> shareholders: ${term("fcff", "FCFF")}.
        The simpler "operating cash flow minus capital spending" is measured after interest has been paid, so it is closer to ${term("fcfe", "free cash flow to equity")}.</p>
      <div class="fq-tablewrap"><table class="fq-table">
        <tbody>
          <tr><td>${term("ocf", "Operating cash flow")}, FY${L.fy}</td><td>${money(L.operatingCashFlow)}</td></tr>
          <tr><td>− ${term("capex", "Capital spending")}</td><td>${money(L.capex)}</td></tr>
          <tr><td>= Free cash flow (after interest)</td><td>${money(L.freeCashFlow)}</td></tr>
          <tr><td>+ Interest expense × (1 − tax rate of ${pct(L.taxRate)}${L.taxRateAssumed ? ", US statutory rate assumed" : ""})</td><td>${isNum(afterTax) ? money(afterTax) : "not reported"}</td></tr>
          <tr class="fq-strong"><td>= Free cash flow to the firm (approximation)</td><td>${isNum(L.fcff) ? money(L.fcff) : "n/a"}</td></tr>
        </tbody>
      </table></div>
      ${isNum(L.fcff) ? "" : `<p class="fq-note fq-note--warn">${esc(c.name)} does not report interest expense as a separate line, so the after-tax interest cannot be added back.
        The model starts from free cash flow after interest (${money(L.freeCashFlow)}) instead. That slightly understates the cash flow to the firm, and so the value.</p>`}
      <p class="fq-small fq-muted" style="margin:12px 0 4px">Same measure, last five fiscal years:</p>
      <div class="fq-tablewrap"><table class="fq-table fq-table--dense">
        <thead><tr>${c.years.slice(-5).map((y) => `<th>FY${y.fy}</th>`).join("")}</tr></thead><tbody><tr>${history}</tr></tbody>
      </table></div>
      <p class="fq-small fq-muted" style="margin-top:10px">This is an approximation built from the cash flow statement. It does not adjust for stock-based pay, acquisitions or one-off items, which a professional analyst would review line by line.</p>
    </div>`;
  }

  /* ---------------- inputs ---------------- */

  function inputsCard(c, input) {
    const s = input.scenarios[scenario];
    const num = (id, label, value, step, hint) => `
      <label class="fq-field"><span>${label}</span><input type="number" data-in="${id}" value="${value}" step="${step}" inputmode="decimal"><small>${hint}</small></label>`;
    return `
    <div class="fq-card" id="assumptions">
      <div class="fq-panel__head"><h3>Assumptions</h3><button type="button" class="fq-btn" id="reset">Reset to defaults</button></div>
      <p class="fq-panel__what">The starting values come from the FY${c.L.fy} annual report. The growth and discount rates are neutral starting points set by a published rule, not forecasts. Change any of them.</p>
      <div class="fq-inputs">
        ${num("fcf0", "Starting free cash flow ($ billions)", +(input.fcf0 / 1e9).toFixed(2), 0.1, "Latest year. Year 1 = this × (1 + growth).")}
        ${num("cash", "Cash and short-term investments ($ billions)", +(input.cash / 1e9).toFixed(2), 0.1, `Balance sheet, ${c.L.end}`)}
        ${num("debt", "Debt ($ billions)", +(input.debt / 1e9).toFixed(2), 0.1, `Balance sheet, ${c.L.end}. Leases excluded.`)}
        ${num("shares", "Diluted shares (millions)", +(input.shares / 1e6).toFixed(1), 1, `Weighted average, FY${c.L.fy}`)}
        ${num("price", "Share price today ($, optional)", input.price || "", 0.01, "Type it in. FinanceIQ has no price feed.")}
        <label class="fq-field"><span>Projection period: <b id="years-out">${input.years}</b> years</span><input type="range" data-in="years" min="5" max="10" step="1" value="${input.years}"><small>5 to 10 years, then the terminal value takes over.</small></label>
      </div>
      <div class="fq-panel__head" style="margin-top:22px"><h3 style="font-size:16px">Scenario</h3>
        <div class="fq-seg" role="group" aria-label="Scenario to edit">${Views.SCENARIOS.map(([id, label]) => `<button type="button" data-scenario="${id}" aria-pressed="${id === scenario}">${label}</button>`).join("")}</div>
      </div>
      <p class="fq-panel__what">The three sliders below belong to the selected scenario. All three scenarios share the values above.</p>
      <div class="fq-inputs">
        ${RATES.map((r) => `
          <div class="fq-slider">
            <span><span class="fq-term" tabindex="0" data-tip="${esc(r.tip)}">${r.label}</span> (%)</span>
            <input type="range" data-rate="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}" value="${+(s[r.key] * 100).toFixed(2)}" aria-label="${r.label}">
            <input type="number" data-rate="${r.key}" min="${r.min}" max="${r.max}" step="${r.step}" value="${+(s[r.key] * 100).toFixed(2)}" aria-label="${r.label}, percent">
          </div>`).join("")}
      </div>
    </div>`;
  }

  /* ---------------- outputs ---------------- */

  // Blend from a light to a dark blue; `t` from 0 to 1.
  function heat(t) {
    const a = [205, 226, 251], b = [37, 106, 191];
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return `background:rgb(${c.join(",")});color:${t > 0.55 ? "#fff" : "#0b0d12"}`;
  }

  function matrix(input) {
    const s = input.scenarios[scenario];
    const rates = [-2, -1, 0, 1, 2].map((d) => +(s.discount + d / 100).toFixed(4)).filter((r) => r > 0);
    const growths = [1, 0.5, 0, -0.5, -1].map((d) => +(s.terminalGrowth + d / 100).toFixed(4)).filter((g) => g >= 0);
    const grid = Calc.sensitivity({ fcf0: input.fcf0, years: input.years, cash: input.cash, debt: input.debt, shares: input.shares, growth: s.growth }, rates, growths);
    const flat = grid.flat().filter(isNum);
    const lo = Math.min(...flat), hi = Math.max(...flat);
    const rows = growths.map((g, gi) => `<tr><th>${pct(g, 2)}</th>${rates.map((r, ri) => {
      const v = grid[gi][ri];
      if (!isNum(v)) return `<td class="fq-na" title="Discount rate must be above terminal growth">–</td>`;
      const here = r === +s.discount.toFixed(4) && g === +s.terminalGrowth.toFixed(4);
      return `<td class="${here ? "fq-here" : ""}" style="${heat(hi > lo ? (v - lo) / (hi - lo) : 0.5)}">${fmt(v, "perShare")}</td>`;
    }).join("")}</tr>`).join("");
    return `
      <div class="fq-tablewrap"><table class="fq-matrix">
        <thead><tr><th>Terminal growth ↓ &nbsp; Discount rate →</th>${rates.map((r) => `<th>${pct(r, 2)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="fq-small fq-muted">Estimated value per share. Darker means higher. The outlined cell is the ${scenario} case as set above.${
        flat.length ? ` Across this table the estimate ranges from ${fmt(lo, "perShare")} to ${fmt(hi, "perShare")}.` : ""}</p>`;
  }

  function output() {
    const c = company(), run = Views.dcfRun(c), input = run.input, res = run.results[scenario];
    const label = Views.SCENARIOS.find(([id]) => id === scenario)[1];
    const price = input.price > 0 ? input.price : null;
    let html = "";
    if (!res.valid) {
      html += `<div class="fq-card fq-error" role="alert"><strong>The ${label.toLowerCase()} cannot be calculated.</strong><ul>${res.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`;
    } else {
      const up = Calc.upside(res.perShare, price);
      html += `
      <div class="fq-card">
        <h3>${swatch(slot)}${esc(c.name)}: ${label.toLowerCase()}</h3>
        <div class="fq-bigvalue">
          <div><span>${term("enterpriseValue", "Enterprise value")}</span><strong>${money(res.enterpriseValue)}</strong></div>
          <div><span>${term("equityValue", "Equity value")}</span><strong>${money(res.equityValue)}</strong></div>
          <div><span>Estimated value per share</span><strong>${fmt(res.perShare, "perShare")}</strong></div>
          ${isNum(up) ? `<div><span>Versus the ${fmt(price, "perShare")} you entered</span><strong>${up >= 0 ? "+" : ""}${pct(up)}</strong></div>` : ""}
        </div>
        ${input.fcf0 <= 0 ? `<p class="fq-note fq-note--warn">The starting cash flow is zero or negative, so growing it only makes it more negative and the result is not meaningful.
          ${esc(c.name)} is spending more than it brings in, usually because of heavy investment. A DCF needs a positive, sustainable cash flow: try entering what you think a normal year would look like.</p>` : ""}
        ${res.equityValue < 0 && input.fcf0 > 0 ? `<p class="fq-note fq-note--warn">Debt is larger than the estimated value of the business plus cash under these assumptions, which gives a negative equity value.</p>` : ""}
        <div class="fq-tablewrap"><table class="fq-table fq-table--dense">
          <thead><tr><th>Year</th><th>Projected free cash flow</th><th>Discount factor</th><th>Present value</th></tr></thead>
          <tbody>
            ${res.rows.map((r) => `<tr><td>Year ${r.year}</td><td>${money(r.fcf)}</td><td>${r.factor.toFixed(3)}</td><td>${money(r.pv)}</td></tr>`).join("")}
            <tr><td>${term("terminalValue", "Terminal value")} (all years after year ${input.years})</td><td>${money(res.terminalValue)}</td><td>${res.rows[res.rows.length - 1].factor.toFixed(3)}</td><td>${money(res.pvTerminal)}</td></tr>
            <tr class="fq-strong"><td>Enterprise value</td><td></td><td></td><td>${money(res.enterpriseValue)}</td></tr>
            <tr><td>− Debt</td><td></td><td></td><td>${money(input.debt)}</td></tr>
            <tr><td>+ Cash and short-term investments</td><td></td><td></td><td>${money(input.cash)}</td></tr>
            <tr class="fq-strong"><td>Equity value</td><td></td><td></td><td>${money(res.equityValue)}</td></tr>
            <tr><td>÷ Diluted shares</td><td></td><td></td><td>${fmt(input.shares, "shares")}</td></tr>
            <tr class="fq-strong"><td>Value per share</td><td></td><td></td><td>${fmt(res.perShare, "perShare")}</td></tr>
          </tbody>
        </table></div>
        <p class="fq-note"><strong>${pct(res.terminalShare, 0)} of the enterprise value comes from the terminal value</strong>, the part of the model that covers every year after year ${input.years}.
          That is normal for a DCF, and it is the main reason small changes in the discount rate or terminal growth move the answer so much.</p>
      </div>`;
    }
    html += `
      <section class="fq-section">
        <h2>Three scenarios</h2>
        <p class="fq-sub">The same model run with pessimistic, middle and optimistic assumptions. The spread between them is a more honest answer than any single number.</p>
        <div class="fq-card">${Views.dcfScenarioTable(c, run, scenario)}</div>
      </section>
      <section class="fq-section">
        <h2>Sensitivity</h2>
        <p class="fq-sub">How the value per share changes when only the discount rate and the terminal growth rate change, keeping everything else from the ${label.toLowerCase()}.</p>
        <div class="fq-card">${res.valid ? matrix(input) : `<p class="fq-empty">Fix the assumptions above to see the table.</p>`}</div>
      </section>
      <section class="fq-section fq-prose">
        <h2>How to read this</h2>
        <p><strong>Why the answer moves so much.</strong> A DCF adds up cash that will not arrive for many years. Each year's cash is divided by (1 + discount rate) once for every year you wait, so a slightly higher rate shrinks every distant year, and most of the value is in the distant years.</p>
        <p><strong>Why this is not "the right price".</strong> The market price already reflects what millions of investors expect about growth, risk and interest rates. This model reflects only the handful of assumptions on this page. When the two disagree, the useful question is which assumption would have to be true for the market to be right.</p>
        <p><strong>What the model leaves out.</strong> It uses one constant growth rate, ignores stock-based pay and leases, and uses an illustrative discount rate instead of one estimated for each company. It is a learning tool for seeing how valuation works, not advice to buy or sell.</p>
      </section>`;
    $("#val-out").innerHTML = html;
  }

  function draw() {
    const c = company(), input = Core.dcfInputs(c);
    $("#app").innerHTML = `
      <section class="fq-section">
        <div class="fq-toolbar"><label>Company
          <span class="fq-seg" role="group" aria-label="Company to value">${pair.map((p, i) => `<button type="button" data-slot="${i}" aria-pressed="${i === slot}">${esc(p.name)}</button>`).join("")}</span></label>
          ${input.custom ? `<span class="fq-badge">Using your saved assumptions</span>` : ""}
        </div>
        <div class="fq-grid">${bridgeCard(c)}${inputsCard(c, input)}</div>
      </section>
      <section class="fq-section" id="val-out"></section>`;
    output();
  }

  // Read every input, save, and recalculate.
  function onInput(e) {
    const c = company(), input = Core.dcfInputs(c), t = e.target;
    if (t.dataset.in) {
      const v = Number(t.value), id = t.dataset.in;
      if (id === "years") { input.years = v; $("#years-out").textContent = v; }
      else if (id === "price") input.price = t.value === "" ? null : v;
      else if (id === "shares") input.shares = v * 1e6;
      else input[id] = t.value === "" ? NaN : v * 1e9;
    } else if (t.dataset.rate) {
      const v = Number(t.value);
      input.scenarios[scenario][t.dataset.rate] = t.value === "" ? NaN : v / 100;
      // keep the slider and the number box showing the same value
      $$(`[data-rate="${t.dataset.rate}"]`).forEach((el) => { if (el !== t) el.value = t.value; });
    } else return;
    Core.saveDcf(c, { fcf0: input.fcf0, cash: input.cash, debt: input.debt, shares: input.shares, price: input.price || null, years: input.years, scenarios: input.scenarios });
    output();
  }

  Core.start({
    page: "valuation",
    usesPair: true,
    render(A, B) { pair = [A, B]; pair.forEach((c, i) => { c._slot = i; }); draw(); },
  });

  document.addEventListener("input", onInput);
  document.addEventListener("click", (e) => {
    const s = e.target.closest("[data-slot]"), sc = e.target.closest("[data-scenario]");
    if (s) { slot = Number(s.dataset.slot); draw(); }
    else if (sc) { scenario = sc.dataset.scenario; draw(); }
    else if (e.target.closest("#reset")) { Core.resetDcf(company()); draw(); }
  });
})();
