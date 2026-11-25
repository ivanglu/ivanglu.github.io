/* Dashboard: search, the highest-graded companies in each category,
   sector summaries, the latest filings and rating changes. */

(() => {
  const { isNum, median } = Calc;

  // Old links still work:  #NVDA -> company page,  #NVDA-MSFT -> comparison,  #screener -> screener
  const h = location.hash;
  if (/^#[A-Z]+$/.test(h)) location.replace("company.html" + h);
  else if (/^#[A-Z]+-[A-Z]+$/.test(h)) location.replace("compare.html" + h);
  else if (h === "#screener") location.replace("screener.html");

  const catScore = (r, id) => r.categories.find((c) => c.id === id).score;

  function top(title, why, id, link) {
    const rows = Core.state.list.map((c) => ({ c, s: id === "overall" ? Core.rating(c.ticker).overall : catScore(Core.rating(c.ticker), id) }))
      .filter((x) => isNum(x.s)).sort((a, b) => b.s - a.s).slice(0, 6);
    return `<article class="fq-card"><h3>${title}</h3><p class="fq-panel__what">${why}</p>
      ${rows.length ? `<ol class="fq-rank">${rows.map((x, i) => `<li><span class="fq-n">${i + 1}</span><span><a href="company.html#${x.c.ticker}">${esc(x.c.name)}</a> <small>${x.c.ticker}</small></span><b>${Math.round(x.s)}</b>${Views.gradeBox(Ratings.grade(x.s), "sm")}</li>`).join("")}</ol>` : Views.noMarket()}
      <p class="fq-small" style="margin:10px 0 0"><a href="screener.html${link}">See all in the screener →</a></p></article>`;
  }

  function sectors() {
    const groups = [...new Set(Core.state.list.map((c) => c.group))].filter((g) => g !== "Other");
    const cell = (g, id) => { const s = median(Core.peers(g).map((c) => catScore(Core.rating(c.ticker), id))); return `<td><span class="fq-gcell">${Views.scoreText(s)}${Views.gradeBox(Ratings.grade(s), "sm")}</span></td>`; };
    return `<div class="fq-tablewrap"><table class="fq-table"><thead><tr><th>Peer group</th><th>Companies</th><th>Fundamentals</th><th>Earnings momentum</th><th>Financial quality</th></tr></thead>
      <tbody>${groups.map((g) => `<tr><td><a href="screener.html?group=${encodeURIComponent(g)}">${esc(g)}</a></td><td>${Core.peers(g).length}</td>${cell(g, "fundamental")}${cell(g, "earnings")}${cell(g, "quality")}</tr>`).join("")}</tbody></table></div>
      <p class="fq-small fq-muted">Median score of the companies FinanceIQ tracks in each group. These are small, hand-picked groups, not whole industries.</p>`;
  }

  function changes() {
    const hist = Core.state.history;
    if (hist.length < 2) {
      return `<p class="fq-muted">Rating history starts ${hist.length ? "on " + esc(hist[0].date) : "with the next data update"}. Upgrades and downgrades will appear here once there are two dated snapshots to compare. Past ratings are never reconstructed after the fact.</p>`;
    }
    const moved = Core.state.list.map((c) => ({ c, ch: Core.ratingChange(c.ticker) })).filter((x) => x.ch && isNum(x.ch.delta) && Math.abs(x.ch.delta) >= 1)
      .sort((a, b) => Math.abs(b.ch.delta) - Math.abs(a.ch.delta)).slice(0, 8);
    if (!moved.length) return `<p class="fq-muted">No rating moved by a point or more between ${esc(hist[hist.length - 2].date)} and ${esc(hist[hist.length - 1].date)}.</p>`;
    return `<ol class="fq-rank">${moved.map((x) => `<li><span class="${x.ch.delta > 0 ? "fq-up" : "fq-down"}">${x.ch.delta > 0 ? "▲" : "▼"}</span><span><a href="company.html#${x.c.ticker}">${esc(x.c.name)}</a> <small>${x.ch.fromGrade} → ${x.ch.toGrade}</small></span><b>${x.ch.delta > 0 ? "+" : "−"}${Math.abs(x.ch.delta).toFixed(1)}</b><span></span></li>`).join("")}</ol>
      <p class="fq-small fq-muted">${esc(hist[hist.length - 2].date)} to ${esc(hist[hist.length - 1].date)}.</p>`;
  }

  function latestFilings() {
    const rows = [...Core.state.list].sort((a, b) => b.latest.filed.localeCompare(a.latest.filed)).slice(0, 6);
    return `<ol class="fq-rank">${rows.map((c) => `<li><span></span><span><a href="company.html?tab=financials#${c.ticker}">${esc(c.name)}</a> <small>quarter ended ${c.latest.end}</small></span><small>filed ${c.latest.filed}</small><span></span></li>`).join("")}</ol>`;
  }

  Core.start({
    page: "dashboard",
    mode: "none",
    render() {
      const market = Boolean(Core.state.market), watch = Core.watchlist();
      $("#app").innerHTML = `
        <section class="fq-section" style="padding-top:8px">
          <div class="fq-combo fq-herosearch"><input id="hero-search" type="search" placeholder="Type a ticker or company name, for example NV" aria-label="Search for a company" data-empty-label="Companies"></div>
          <div class="fq-cta">
            <a class="fq-btn" href="screener.html">Open the screener</a>
            <a class="fq-btn" href="compare.html">Compare two companies</a>
            <button type="button" class="fq-btn" id="tour">Take the 2-minute tour</button>
          </div>
        </section>
        <section class="fq-section">
          <h2>Highest graded</h2>
          <p class="fq-sub">Among the ${Core.state.list.length} companies FinanceIQ tracks. Grades describe reported results; they are not recommendations.</p>
          <div class="fq-dash">
            ${top("Fundamental performance", "Growth in sales, profit and cash flow, and how profitable the business is.", "fundamental", "?sort=fundamental")}
            ${top("Earnings momentum", "Whether profit growth is speeding up or slowing down.", "earnings", "?sort=earnings")}
            ${top("Financial quality", "Returns on capital, balance-sheet strength and cash backing of profit.", "quality", "?sort=quality")}
            ${market ? top("Quantitative momentum", "Price and volume behaviour against a benchmark.", "quant", "?sort=quant") + top("Valuation", "Price compared with sales, profit and cash flow.", "valuation", "?sort=valuation") : ""}
          </div>
          ${market ? "" : `<div style="margin-top:16px">${Views.noMarket()}</div>`}
        </section>
        <section class="fq-section"><h2>By peer group</h2><div class="fq-card">${sectors()}</div></section>
        <section class="fq-section"><div class="fq-dash">
          <article class="fq-card"><h3>Rating changes</h3>${changes()}</article>
          <article class="fq-card"><h3>Latest reports filed</h3>${latestFilings()}</article>
          <article class="fq-card"><h3>Your watchlist</h3>${watch.length ? `<ol class="fq-rank">${watch.slice(0, 6).map((t) => { const c = Core.company(t), r = Core.rating(t); return `<li><span></span><span><a href="company.html#${t}">${esc(c.name)}</a> <small>${t}</small></span><b>${Views.scoreText(r.overall)}</b>${Views.gradeBox(r.grade, "sm")}</li>`; }).join("")}</ol><p class="fq-small" style="margin:10px 0 0"><a href="watchlist.html">Open watchlist →</a></p>`
            : `<p class="fq-muted">Nothing saved yet. Open a company and press "Add to watchlist". The list stays in this browser.</p>`}</article>
        </div></section>`;
      Core.combo($("#hero-search"), { emptyList: () => Core.byGroup().slice(0, 10), onSelect: (t) => { location.href = `company.html#${t}`; } });
      $("#tour").addEventListener("click", () => Core.tourGo(0));
    },
  });
})();
