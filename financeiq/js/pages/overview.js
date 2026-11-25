/* Overview page: headline scores, the scorecard and links into every section. */

Core.start({
  page: "overview",
  usesPair: true,
  render(A, B) {
    const hash = `#${A.ticker}-${B.ticker}`;
    const link = (file, title, text) => `<a class="fq-link" data-nav="${file}" href="${file}${hash}"><strong>${title} →</strong><span>${text}</span></a>`;
    const differentIndustry = A.group !== B.group || A.group === "Other";
    $("#app").innerHTML = `
      <section class="fq-section">
        <h2>Financial Health Score</h2>
        <p class="fq-sub">One number from 0 to 100 for each company, built from 19 measures of growth, profitability, stability, cash flow and capital efficiency. It describes the latest annual report. It is not a prediction of the share price.</p>
        <div class="fq-two">${Views.healthCard(A, 0, Core.score(A), { link: true })}${Views.healthCard(B, 1, Core.score(B), { link: true })}</div>
        ${differentIndustry ? `<p class="fq-note fq-note--warn">${esc(A.name)} and ${esc(B.name)} are in different industries. Margins and debt levels differ a lot between industries, so read the scores together with the <a data-nav="benchmarks.html" href="benchmarks.html${hash}">industry benchmarks</a>.</p>` : ""}
        <div class="fq-cta">
          <button type="button" class="fq-btn fq-btn--primary" id="tour">Take the 2-minute tour</button>
          <a class="fq-btn" data-nav="report.html" href="report.html${hash}">Download a PDF report</a>
        </div>
      </section>

      <section class="fq-section fq-scorecard">
        <h2>Scorecard</h2>
        <p class="fq-sub">The headline numbers from each company's latest annual report. A check mark shows which company is ahead on that measure.</p>
        <div class="fq-card">${Views.scorecard(A, B)}</div>
      </section>

      <section class="fq-section">
        <h2>Go deeper</h2>
        <div class="fq-links">
          ${link("compare.html", "Comparison", "Four tests with charts and plain-English explanations, plus AI-written strengths and risks.")}
          ${link("health.html", "Financial Health", "See how the score is built and change the weights to match what you care about.")}
          ${link("valuation.html", "Valuation", "A discounted cash flow model with bear, base and bull cases and a sensitivity table.")}
          ${link("trends.html", "Trends", "Ten measures over five or ten years, with growth rates.")}
          ${link("benchmarks.html", "Benchmarks", "How each company ranks against named peers in its own industry.")}
          ${link("research.html", "Ivan's research", "Case studies with a question, the evidence and Ivan's own conclusion.")}
        </div>
      </section>`;
    $("#tour").addEventListener("click", () => Core.tourGo(0));
  },
});
