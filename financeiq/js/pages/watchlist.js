/* Watchlist: the companies you have starred, saved in this browser only. */

(() => {
  const { isNum } = Calc;
  let picked = [];

  function draw() {
    const list = Core.watchlist(), hist = Core.state.history;
    if (!list.length) {
      $("#app").innerHTML = `<section class="fq-section"><div class="fq-card"><p><strong>Your watchlist is empty.</strong></p>
        <p class="fq-muted">Open a company and press "Add to watchlist", or press ☆ next to a company in the screener.</p>
        <div class="fq-cta"><a class="fq-btn fq-btn--primary" href="screener.html">Open the screener</a></div></div></section>`;
      return;
    }
    const cats = Ratings.MODEL.filter((m) => Core.state.market || !m.market);
    const rows = list.map((t) => {
      const c = Core.company(t), r = Core.rating(t), ch = Core.ratingChange(t);
      const moved = ch && isNum(ch.delta) && Math.abs(ch.delta) >= 0.5;
      const why = moved ? ch.categories.filter((k) => isNum(k.delta) && Math.abs(k.delta) >= 1).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 2)
        .map((k) => `${Ratings.MODEL.find((m) => m.id === k.id).short} ${k.delta > 0 ? "+" : "−"}${Math.abs(k.delta).toFixed(0)}`).join(", ") : "";
      return `<tr>
        <td class="fq-l"><label><input type="checkbox" data-pick="${t}" ${picked.includes(t) ? "checked" : ""} aria-label="Select ${esc(c.name)} to compare"></label>
          <a href="company.html#${t}"><b>${t}</b></a> <span class="fq-muted">${esc(c.name)}</span></td>
        <td><span class="fq-gcell">${Views.scoreText(r.overall)}${Views.gradeBox(r.grade, "sm")}</span></td>
        ${cats.map((m) => { const k = r.categories.find((x) => x.id === m.id); return `<td><span class="fq-gcell">${Views.scoreText(k.score)}${Views.gradeBox(k.grade, "sm")}</span></td>`; }).join("")}
        <td>${moved ? `<span class="${ch.delta > 0 ? "fq-up" : "fq-down"}">${ch.delta > 0 ? "▲" : "▼"} ${Math.abs(ch.delta).toFixed(1)}</span> <span class="fq-hint">${Views.scoreText(ch.from)} → ${Views.scoreText(ch.to)}${why ? " · " + why : ""}</span>` : ch ? "no change" : "–"}</td>
        <td><button type="button" class="fq-btn" data-remove="${t}">Remove</button></td></tr>`;
    }).join("");
    $("#app").innerHTML = `<section class="fq-section" style="padding-top:8px">
      <div class="fq-filters"><button type="button" class="fq-btn fq-btn--primary" id="go" ${picked.length >= 2 ? "" : "disabled"}>Compare ${picked.length >= 2 ? picked.join(", ") : "(tick 2 to 4)"}</button></div>
      <div class="fq-card" style="padding:6px 10px"><div class="fq-tablewrap"><table class="fq-table fq-screen">
        <thead><tr><th class="fq-l">Company</th><th>Overall</th>${cats.map((m) => `<th>${m.short}</th>`).join("")}<th>Since last snapshot</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div></div>
      <p class="fq-small fq-muted" style="margin-top:10px">${hist.length >= 2 ? `Changes compare the snapshots of ${esc(hist[hist.length - 2].date)} and ${esc(hist[hist.length - 1].date)}.`
        : `Rating history ${hist.length ? "started on " + esc(hist[0].date) : "has not started"}. Changes will show here after the next data update. Past ratings are never reconstructed.`}
        Your list and weight settings are stored in this browser only.</p></section>`;
  }

  Core.start({ page: "watchlist", mode: "none", render: draw });

  document.addEventListener("click", (e) => {
    const r = e.target.closest("[data-remove]");
    if (r) { Core.toggleWatch(r.dataset.remove); picked = picked.filter((t) => t !== r.dataset.remove); draw(); }
    else if (e.target.closest("#go")) location.href = `compare.html#${picked.join("-")}`;
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t.dataset.pick) return;
    picked = t.checked ? [...picked, t.dataset.pick].slice(-Core.MAX_COMPARE) : picked.filter((x) => x !== t.dataset.pick);
    draw();
  });
})();
