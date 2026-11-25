/* Screener: every company in one sortable, filterable table.
   The logic (rows, filters, sorting, CSV) is in js/screen.js and is unit-tested. */

(() => {
  const { isNum, fmt } = Calc;
  const params = new URLSearchParams(location.search);
  const saved = Core.store.get("screen", null) || {};
  const st = {
    sort: params.get("sort") || saved.sort || "fundamental", desc: saved.desc !== false,
    filters: { text: "", group: params.get("group") || (saved.filters && saved.filters.group) || "", minGrade: (saved.filters && saved.filters.minGrade) || {}, maxGrade: {}, min: {}, max: {} },
    preset: null, picked: [],
  };

  const grade = (key, label, market) => ({ key, label, kind: "grade", market });
  const COLUMNS = [
    { key: "name", label: "Company", kind: "name" }, { key: "group", label: "Peer group", kind: "text" },
    { key: "price", label: "Price", kind: "perShare", market: true }, { key: "marketCap", label: "Market value", kind: "money", market: true },
    grade("overall", "Overall"), grade("fundamental", "Fundamentals"), grade("quant", "Quantitative", true), grade("valuation", "Valuation", true),
    grade("earnings", "Earnings momentum"), grade("quality", "Quality"),
    { key: "revenueGrowth", label: "Revenue growth (TTM)", kind: "pct" }, { key: "epsGrowth", label: "EPS growth (TTM)", kind: "pct" },
    { key: "opMargin", label: "Operating margin", kind: "pct" }, { key: "roic", label: "ROIC", kind: "pct" },
    { key: "pe", label: "P/E", kind: "ratio", market: true }, { key: "fcfYield", label: "FCF yield", kind: "pct", market: true },
    { key: "relative6m", label: "6-month relative strength", kind: "pct", market: true },
    { key: "coverage", label: "Data coverage", kind: "pct0" },
  ];
  const GRADED = ["fundamental", "earnings", "quality", "quant", "valuation"];

  function table(rows, market) {
    const cols = COLUMNS.filter((c) => market || !c.market);
    const cell = (r, c) => {
      const v = r[c.key];
      if (c.kind === "name") return `<td class="fq-l"><button type="button" class="fq-star" data-star="${r.ticker}" aria-pressed="${Core.watchlist().includes(r.ticker)}" aria-label="Watchlist: ${esc(r.name)}">${Core.watchlist().includes(r.ticker) ? "★" : "☆"}</button>
        <label><input type="checkbox" data-pick="${r.ticker}" ${st.picked.includes(r.ticker) ? "checked" : ""} aria-label="Select ${esc(r.name)} to compare"></label>
        <a href="company.html#${r.ticker}"><b>${r.ticker}</b></a> <span class="fq-muted">${esc(r.name)}</span></td>`;
      if (c.kind === "text") return `<td class="fq-l">${esc(v === "Other" ? r.blurb : v)}</td>`;
      if (c.kind === "grade") return `<td><span class="fq-gcell">${Views.scoreText(v)}${Views.gradeBox(Ratings.grade(v), "sm")}${c.key === "overall" && !r.complete ? '<span class="fq-term" tabindex="0" data-tip="Partial rating: not all five categories are available.">*</span>' : ""}</span></td>`;
      return `<td>${fmt(v, c.kind)}</td>`;
    };
    return `<div class="fq-tablewrap"><table class="fq-table fq-table--dense fq-screen">
      <thead><tr>${cols.map((c) => `<th class="${c.kind === "name" || c.kind === "text" ? "fq-l" : ""}" ${c.key === st.sort ? `aria-sort="${st.desc ? "descending" : "ascending"}"` : ""}><button type="button" data-sort="${c.key}">${c.label}${c.key === st.sort ? (st.desc ? " ▼" : " ▲") : ""}</button></th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${cols.map((c) => cell(r, c)).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="fq-l fq-muted">No company passes these filters.</td></tr>`}</tbody></table></div>`;
  }

  function draw() {
    const market = Boolean(Core.state.market);
    const all = Core.state.list.map((c) => Screen.row(c, Core.rating(c.ticker), Core.state.market));
    const rows = Screen.sortRows(Screen.applyFilters(all, st.filters), st.sort, st.desc);
    const groups = [...new Set(all.map((r) => r.group))];
    const gradeSelect = (key, label) => `<label>${label} at least<select data-min="${key}"><option value="">Any</option>${["A", "B", "C", "D"].map((g) => `<option ${st.filters.minGrade[key] === g ? "selected" : ""}>${g}</option>`).join("")}</select></label>`;
    const preset = Screen.PRESETS.find((p) => p.id === st.preset);
    $("#app").innerHTML = `
      <section class="fq-section" style="padding-top:8px">
        <div class="fq-chips" role="group" aria-label="Ready-made screens">
          ${Screen.PRESETS.map((p) => `<button type="button" class="fq-chip" data-preset="${p.id}" aria-pressed="${p.id === st.preset}" ${p.market && !market ? `disabled title="Needs price data: connect it on the Prices page"` : ""}>${p.name}</button>`).join("")}
        </div>
        ${preset ? `<p class="fq-note" style="margin:0 0 14px"><strong>${esc(preset.name)}.</strong> ${esc(preset.why)}</p>` : ""}
        <div class="fq-filters">
          <label>Find<input type="search" id="f-text" value="${esc(st.filters.text)}" placeholder="Ticker or name"></label>
          <label>Peer group<select id="f-group"><option value="">All</option>${groups.map((g) => `<option value="${esc(g)}" ${st.filters.group === g ? "selected" : ""}>${g === "Other" ? "Other industries" : esc(g)}</option>`).join("")}</select></label>
          ${gradeSelect("fundamental", "Fundamentals")}${gradeSelect("earnings", "Earnings")}${gradeSelect("quality", "Quality")}
          ${market ? gradeSelect("quant", "Quantitative") + gradeSelect("valuation", "Valuation") : ""}
          <button type="button" class="fq-btn" id="reset">Clear</button>
          <button type="button" class="fq-btn" id="save">Save this screen</button>
          <button type="button" class="fq-btn" id="csv">Export CSV</button>
          <button type="button" class="fq-btn fq-btn--primary" id="go" ${st.picked.length >= 2 ? "" : "disabled"}>Compare ${st.picked.length >= 2 ? st.picked.join(", ") : "(tick 2 to 4)"}</button>
        </div>
        <p class="fq-small fq-muted">${rows.length} of ${all.length} companies. Click a column heading to sort. ☆ adds to your watchlist.${market ? "" : ` Price, valuation and momentum columns appear when you <a href="prices.html">connect price data</a>.`}</p>
        <div class="fq-card" style="padding:6px 10px">${table(rows, market)}</div>
        <p class="fq-small fq-muted" style="margin-top:10px">* Partial rating. Grades are relative to the ${all.length} tracked companies and to fixed scales, as described in the <a href="methodology.html#rating">methodology</a>. The CSV contains figures calculated from SEC filings only.</p>
      </section>`;
    st.rows = rows;
  }

  Core.start({ page: "screener", mode: "none", render: draw });

  document.addEventListener("click", (e) => {
    const t = e.target, s = t.closest("[data-sort]"), p = t.closest("[data-preset]"), star = t.closest("[data-star]");
    if (s) { if (st.sort === s.dataset.sort) st.desc = !st.desc; else { st.sort = s.dataset.sort; st.desc = !["name", "group"].includes(st.sort); } }
    else if (p) {
      if (st.preset === p.dataset.preset) { st.preset = null; st.filters = { ...st.filters, minGrade: {}, maxGrade: {}, min: {}, max: {} }; }
      else { const x = Screen.PRESETS.find((y) => y.id === p.dataset.preset); st.preset = x.id; st.sort = x.sort; st.desc = true;
        st.filters = { text: "", group: st.filters.group, minGrade: { ...(x.filters.minGrade || {}) }, maxGrade: { ...(x.filters.maxGrade || {}) }, min: { ...(x.filters.min || {}) }, max: { ...(x.filters.max || {}) } }; }
    }
    else if (star) Core.toggleWatch(star.dataset.star);
    else if (t.closest("#reset")) { st.preset = null; st.filters = { text: "", group: "", minGrade: {}, maxGrade: {}, min: {}, max: {} }; st.picked = []; }
    else if (t.closest("#save")) { Core.store.set("screen", { sort: st.sort, desc: st.desc, filters: { group: st.filters.group, minGrade: st.filters.minGrade } }); t.closest("#save").textContent = "Saved in this browser"; return; }
    else if (t.closest("#go")) { location.href = `compare.html#${st.picked.join("-")}`; return; }
    else if (t.closest("#csv")) {
      const cols = COLUMNS.filter((c) => !c.market).map((c) => ({ key: c.key, label: c.label }));
      const blob = new Blob([Screen.toCsv(st.rows, [{ key: "ticker", label: "Ticker" }, ...cols])], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "financeiq-screen.csv"; a.click(); URL.revokeObjectURL(a.href); return;
    } else return;
    draw();
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.pick) { st.picked = t.checked ? [...st.picked, t.dataset.pick].slice(-Core.MAX_COMPARE) : st.picked.filter((x) => x !== t.dataset.pick); }
    else if (t.dataset.min) { st.filters.minGrade[t.dataset.min] = t.value; st.preset = null; }
    else if (t.id === "f-group") st.filters.group = t.value;
    else return;
    draw();
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "f-text") return;
    st.filters.text = e.target.value; draw();
    const box = $("#f-text"); box.focus(); box.setSelectionRange(box.value.length, box.value.length);
  });
})();
