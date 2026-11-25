/* Financial Health page: weight sliders, score cards, the full breakdown
   of all 19 measures, and rule-based strengths and weaknesses. */

(() => {
  const { isNum, fmt } = Calc;
  const { term, swatch } = Core;
  let pair = [];

  // Which glossary entry explains each measure.
  const TERMS = { revenueGrowth: "revenue", revenueCagr3: "cagr", ebitCagr3: "ebit", epsCagr3: "eps", fcfConsistency: "fcf" };

  const presetOf = (w) => Object.keys(Calc.PRESETS).find((name) =>
    Calc.SCORE_MODEL.every((c) => Math.abs(Calc.PRESETS[name][c.id] - w[c.id]) < 0.01)) || null;

  function weightsCard() {
    const raw = Core.getWeights(), norm = Calc.normalizeWeights(raw), active = presetOf(raw);
    return `
    <div class="fq-card" id="weights">
      <div class="fq-panel__head">
        <h3>What matters most to you?</h3>
        <div class="fq-seg" role="group" aria-label="Scoring presets">
          ${Object.keys(Calc.PRESETS).map((name) => `<button type="button" data-preset="${name}" aria-pressed="${name === active}">${name}</button>`).join("")}
        </div>
      </div>
      <p class="fq-panel__what">Drag a slider to give a category more or less weight. The five weights are always rescaled so they add up to 100%.</p>
      <div class="fq-weights">
        ${Calc.SCORE_MODEL.map((c) => `
          <div class="fq-weight">
            <label for="w-${c.id}">${c.label}</label><output id="o-${c.id}">${norm[c.id].toFixed(0)}%</output>
            <input type="range" id="w-${c.id}" data-weight="${c.id}" min="0" max="100" step="5" value="${raw[c.id]}" aria-describedby="about-${c.id}">
            <small class="fq-muted" id="about-${c.id}" style="grid-column:1/-1">${c.about}</small>
          </div>`).join("")}
      </div>
    </div>`;
  }

  function breakdown(A, B, ra, rb) {
    const cell = (m, i) => `<td>${isNum(m.value) ? fmt(m.value, m.fmt) : m.note ? `<span class="fq-term" tabindex="0" data-tip="${esc(m.note)}">${isNum(m.score) ? "see note" : "n/a"}</span>` : "n/a"}</td>
      <td><span class="fq-scorecell">${Views.bar(m.score, i)}<b>${Views.scoreText(m.score)}</b></span></td>`;
    const rows = ra.categories.map((cat, ci) => {
      const other = rb.categories[ci];
      return `<tr class="fq-group"><td>${cat.label} · weight ${cat.weight.toFixed(0)}%</td><td></td><td><span class="fq-scorecell"><span></span><b>${Views.scoreText(cat.score)}</b></span></td><td></td><td><span class="fq-scorecell"><span></span><b>${Views.scoreText(other.score)}</b></span></td></tr>` +
        cat.metrics.map((m, mi) => `<tr><td>${term(TERMS[m.id] || m.id, m.label)}<span class="fq-hint">0 points at ${fmt(m.lo, m.fmt)}, 100 points at ${fmt(m.hi, m.fmt)}</span></td>${cell(m, 0)}${cell(other.metrics[mi], 1)}</tr>`).join("");
    }).join("");
    return `
      <div class="fq-tablewrap"><table class="fq-table">
        <thead><tr><th>Measure</th><th colspan="2"><span class="fq-th">${swatch(0)}${esc(A.name)}</span></th><th colspan="2"><span class="fq-th">${swatch(1)}${esc(B.name)}</span></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  function highlightsCard(c, i, result) {
    const h = Calc.highlights(result);
    const list = (items, empty) => (items.length ? `<ul>${items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : `<p class="fq-empty" style="padding:0">${empty}</p>`);
    return `
    <article class="fq-card fq-hl">
      <h3>${swatch(i)}${esc(c.name)}</h3>
      <h4>Scores highest on</h4>${list(h.strengths, "No measure scores 75 or above.")}
      <h4>Scores lowest on</h4>${list(h.weaknesses, "No measure scores 35 or below.")}
      ${result.notes.length ? `<h4>Notes on the data</h4>${list(result.notes, "")}` : ""}
    </article>`;
  }

  function output() {
    const [A, B] = pair;
    const ra = Core.score(A), rb = Core.score(B);
    const hash = `#${A.ticker}-${B.ticker}`;
    const cross = A.group !== B.group || A.group === "Other";
    $("#health-out").innerHTML = `
      <div class="fq-two">${Views.healthCard(A, 0, ra)}${Views.healthCard(B, 1, rb)}</div>
      ${cross ? `<p class="fq-note fq-note--warn">These two companies are in different industries (${esc(A.group === "Other" ? A.blurb : A.group)} and ${esc(B.group === "Other" ? B.blurb : B.group)}).
        The score uses the same scale for every company, so a retailer will always score lower on margins than a software company even if it is the best retailer in the world.
        Use the <a data-nav="benchmarks.html" href="benchmarks.html${hash}">industry benchmarks</a> for a like-for-like view.</p>` : ""}
      <section class="fq-section">
        <h2>Where the points come from</h2>
        <p class="fq-sub">Each measure is turned into 0 to 100 points on a straight-line scale between the two published levels. A category score is the average of its measures, and the overall score is the weighted average of the categories. A measure that cannot be calculated is left out instead of being counted as zero.</p>
        <div class="fq-card">${breakdown(A, B, ra, rb)}</div>
      </section>
      <section class="fq-section">
        <h2>Strengths and weaknesses</h2>
        <p class="fq-sub">Picked by rule from the scores above: the three highest-scoring measures at 75 or more, and the three lowest at 35 or less. No AI is involved.</p>
        <div class="fq-two">${highlightsCard(A, 0, ra)}${highlightsCard(B, 1, rb)}</div>
      </section>
      <p class="fq-note">The Financial Health Score summarises one annual report using fixed rules. It says nothing about whether a share is cheap or expensive and is not a forecast or a recommendation.
        The full rules are in the <a data-nav="methodology.html" href="methodology.html${hash}">methodology</a>.</p>`;
  }

  function syncWeightLabels() {
    const raw = Core.getWeights(), norm = Calc.normalizeWeights(raw), active = presetOf(raw);
    Calc.SCORE_MODEL.forEach((c) => { $("#o-" + c.id).textContent = norm[c.id].toFixed(0) + "%"; $("#w-" + c.id).value = raw[c.id]; });
    $$("[data-preset]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.preset === active));
  }

  Core.start({
    page: "health",
    usesPair: true,
    render(A, B) {
      pair = [A, B];
      $("#app").innerHTML = `<section class="fq-section">${weightsCard()}</section><section class="fq-section" id="health-out"></section>`;
      output();
    },
  });

  document.addEventListener("input", (e) => {
    const id = e.target.dataset && e.target.dataset.weight;
    if (!id) return;
    const w = Core.getWeights();
    w[id] = Number(e.target.value);
    Core.store.set("weights", w);
    syncWeightLabels(); output();
  });
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    Core.store.set("weights", { ...Calc.PRESETS[btn.dataset.preset] });
    syncWeightLabels(); output();
  });
})();
