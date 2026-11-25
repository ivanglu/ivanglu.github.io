/* Shows the results of tests.js on the page. */
(() => {
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const all = Tests.results, failed = all.filter((t) => !t.ok);
  const groups = [...new Set(all.map((t) => t.group))];
  document.getElementById("out").innerHTML = `
    <div class="fq-card ${failed.length ? "fq-error" : ""}" id="summary"><strong>${all.length - failed.length} passed, ${failed.length} failed, ${all.length} total</strong></div>
    ${groups.map((g) => `<section class="fq-section"><h2>${esc(g)}</h2><div class="fq-card"><table class="fq-table fq-table--dense"><tbody>${
      all.filter((t) => t.group === g).map((t) => `<tr><td>${esc(t.name)}${t.ok ? "" : `<span class="fq-hint">${esc(t.error)}</span>`}</td><td>${t.ok ? "✓ pass" : "✗ FAIL"}</td></tr>`).join("")
    }</tbody></table></div></section>`).join("")}`;
})();
