/* Methodology page: the prose is in methodology.html. This script fills in the
   tables that come straight from the code and data, so they can never drift apart. */

Core.start({
  page: "methodology",
  usesPair: false,
  render() {
    const { fmt } = Calc;
    document.body.classList.remove("fq-is-loading");
    const d = Core.state.data;
    $("#m-updated").textContent = `Last successful data update: ${d.generated}. ${d.companies.length} companies.`;

    // scoring model, read from Calc.SCORE_MODEL
    $("#m-model").innerHTML = `<div class="fq-tablewrap"><table class="fq-table" style="font-size:14px">
      <thead><tr><th>Category and measure</th><th>0 points at</th><th>100 points at</th></tr></thead><tbody>${
      Calc.SCORE_MODEL.map((c) => `<tr class="fq-group"><td>${c.label} · default weight ${c.weight}%</td><td></td><td></td></tr>` +
        c.metrics.map((m) => `<tr><td>${esc(m.label)}</td><td>${fmt(m.lo, m.fmt)}${m.lo > m.hi ? " or more" : " or less"}</td><td>${fmt(m.hi, m.fmt)}${m.lo > m.hi ? " or less" : " or more"}</td></tr>`).join("")).join("")
      }</tbody></table></div>`;

    $("#m-presets").innerHTML = `<div class="fq-tablewrap"><table class="fq-table" style="font-size:14px">
      <thead><tr><th>Preset</th>${Calc.SCORE_MODEL.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>${
      Object.entries(Calc.PRESETS).map(([name, w]) => `<tr><td>${name}</td>${Calc.SCORE_MODEL.map((c) => `<td>${w[c.id]}%</td>`).join("")}</tr>`).join("")
      }</tbody></table></div>`;

    const groups = [...new Set(d.companies.map((c) => c.group))];
    $("#m-groups").innerHTML = `<div class="fq-tablewrap"><table class="fq-table" style="font-size:14px">
      <thead><tr><th>Group</th><th style="text-align:left">Companies</th></tr></thead><tbody>${
      groups.map((g) => `<tr><td>${g === "Other" ? "No peer group" : esc(g)}</td><td style="text-align:left;white-space:normal">${Core.peers(g).map((c) => esc(c.name)).join(", ")}</td></tr>`).join("")
      }</tbody></table></div>`;

    $("#m-quality").innerHTML = `<div class="fq-tablewrap"><table class="fq-table fq-table--dense">
      <thead><tr><th>Company</th><th>Years</th><th style="text-align:left">Notes</th></tr></thead><tbody>${
      d.companies.map((c) => {
        const notes = [];
        c.splits.forEach((s) => notes.push(`Stock split ${s.ratio}-for-1 detected (first shown in the report filed ${s.restatedIn}); earlier per-share figures adjusted.`));
        const built = [...new Set(c.years.flatMap((y) => y.notes))];
        built.forEach((n) => notes.push(n + "."));
        if (c.years.some((y) => y.ebitDerived)) notes.push("No operating income line reported; EBIT = pre-tax income + interest expense.");
        const missing = ["grossProfit", "interestExpense", "depreciation"].filter((k) => c.L[k] === null);
        if (missing.length) notes.push("Not reported in the latest year: " + missing.join(", ") + ".");
        c.warnings.forEach((w) => notes.push("Check: " + w + "."));
        return `<tr><td>${esc(c.name)} <span class="fq-hint">${c.ticker}</span></td><td>FY${c.years[0].fy}–${c.L.fy}</td>
          <td style="text-align:left;white-space:normal">${notes.length ? notes.map(esc).join("<br>") : "No notes."}</td></tr>`;
      }).join("")
      }</tbody></table></div>`;
  },
});
