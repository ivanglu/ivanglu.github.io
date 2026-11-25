/* Historical Trends page: ten measures as small charts, in three views. */

(() => {
  const { isNum, pct } = Calc;
  const { swatch, term } = Core;
  let pair = [], mode = "value", years = 5;

  const KEYS = ["revenue", "netIncome", "ebit", "freeCashFlow", "grossMargin", "opMargin", "debt", "eps", "roic", "dilutedShares"];
  const MODES = [["value", "Reported values"], ["yoy", "Change on prior year"], ["index", "Indexed (start = 100)"]];

  // One line under each chart title: growth over the selected period for each company.
  function caption(key) {
    const meta = Views.METRICS[key];
    return pair.map((c, i) => {
      const end = c.L, start = Calc.yearBack(c, years - 1) || c.years[0];
      const span = end.fy - start.fy;
      let text = "n/a";
      if (isNum(start[key]) && isNum(end[key]) && span > 0) {
        if (meta.rate) {
          const d = (end[key] - start[key]) * 100;
          text = `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} pts since FY${start.fy}`;
        } else {
          const g = Calc.cagr(start[key], end[key], span);
          text = isNum(g) ? `${g >= 0 ? "+" : ""}${pct(g)} a year since FY${start.fy}` : "growth rate not meaningful (negative value)";
        }
      }
      return `<span>${swatch(i)}${text}</span>`;
    }).join("");
  }

  function draw() {
    KEYS.forEach((k) => {
      Views.chart($(`[data-chart="${k}"]`), pair, k, { years, mode, height: 210 });
      $(`[data-cap="${k}"]`).innerHTML = caption(k);
    });
  }

  Core.start({
    page: "trends",
    usesPair: true,
    render(A, B) {
      pair = [A, B];
      const seg = (name, options, current) => options.map(([v, label]) => `<button type="button" data-${name}="${v}" aria-pressed="${String(v) === String(current)}">${label}</button>`).join("");
      $("#app").innerHTML = `
        <section class="fq-section">
          <div class="fq-toolbar">
            <label>View <span class="fq-seg" role="group" aria-label="View">${seg("mode", MODES, mode)}</span></label>
            <label>Period <span class="fq-seg" role="group" aria-label="Period">${seg("years", [[5, "5 years"], [10, "10 years"]], years)}</span></label>
          </div>
          ${Views.legend(A, B)}
          <div class="fq-two" style="margin-top:12px">
            ${KEYS.map((k) => { const m = Views.METRICS[k]; return `
              <article class="fq-card fq-mini">
                <h3>${m.term ? term(m.term, m.label) : m.label}</h3>
                <p class="fq-cagr" data-cap="${k}"></p>
                <div class="fq-chart" data-chart="${k}"></div>
              </article>`; }).join("")}
          </div>
          <div class="fq-note">
            <p><strong>Reading the three views.</strong> <em>Reported values</em> are the figures from each annual report. <em>Change on prior year</em> shows growth for dollar amounts and the change in percentage points for margins and returns.
            <em>Indexed</em> sets each company's first year to 100, which makes a small company and a large one directly comparable.</p>
            <p>The line under each title is the ${term("cagr", "compound annual growth rate")} over the selected period, or the change in percentage points for a ratio.
            Fiscal years end in different months: ${esc(A.name)}'s FY${A.L.fy} ended ${A.L.end} and ${esc(B.name)}'s FY${B.L.fy} ended ${B.L.end}.</p>
          </div>
        </section>
        <section class="fq-section">
          <h2>Reporting dates and sources</h2>
          <p class="fq-sub">Each row is one annual report. EPS and share counts are adjusted for later stock splits so that years can be compared.</p>
          <div class="fq-grid">${Views.sourceTable(A, 0, { years })}${Views.sourceTable(B, 1, { years })}</div>
        </section>`;
      draw();
    },
  });

  document.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mode]"), y = e.target.closest("[data-years]");
    if (m) mode = m.dataset.mode; else if (y) years = Number(y.dataset.years); else return;
    Core.rerender();
  });
  Core.onResize(() => pair.length && draw());
})();
