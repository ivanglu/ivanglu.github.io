/* Industry Benchmarks page: each company against a named group of peers. */

(() => {
  const { isNum, fmt } = Calc;
  const { swatch, term, COLORS } = Core;

  // Dots on a line: every peer in grey, this company in its color, the median as a tick.
  function strip(row, i) {
    const vals = row.values.map((v) => v.value);
    if (vals.length < 2) return "";
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const pos = (v) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 50);
    const dots = row.values.map((p) => `<i title="${esc(p.name)}: ${fmt(p.value, row.fmt)}" style="left:${pos(p.value).toFixed(1)}%"></i>`).join("");
    return `<div class="fq-strip" role="img" aria-label="Position among peers">${dots}
      ${isNum(row.median) ? `<u title="Peer median: ${fmt(row.median, row.fmt)}" style="left:${pos(row.median).toFixed(1)}%"></u>` : ""}
      ${isNum(row.value) ? `<i class="fq-me" title="This company" style="left:${pos(row.value).toFixed(1)}%;background:${COLORS[i]}"></i>` : ""}</div>`;
  }

  function card(c, i) {
    const b = Views.benchmark(c);
    if (!b) {
      return `<article class="fq-card"><h3>${swatch(i)}${esc(c.name)}</h3>
        <p>${esc(c.name)} (${esc(c.blurb.toLowerCase())}) is not in one of the four peer groups FinanceIQ tracks, so no benchmark is shown.
        Inventing a peer group from unrelated companies would produce numbers that look precise and mean nothing.</p></article>`;
    }
    const rows = b.rows.map((r) => `
      <tr><td>${term(r.term, r.label)}<span class="fq-hint">${r.high ? "Higher is better" : "Lower is better"}</span></td>
        <td><b>${fmt(r.value, r.fmt)}</b></td><td>${fmt(r.median, r.fmt)}</td>
        <td>${r.rank ? `${r.rank} of ${r.of}` : "n/a"}</td>
        <td class="fq-hide-sm" style="width:30%">${strip(r, i)}</td></tr>`).join("");
    return `
    <article class="fq-card">
      <h3>${swatch(i)}${esc(c.name)} <small class="fq-muted">${esc(c.group)} peer group</small></h3>
      <div class="fq-peers">${b.peers.map((p) => `<span class="${p.ticker === c.ticker ? "fq-me" : ""}" title="${esc(p.blurb)}">${esc(p.name)}</span>`).join("")}</div>
      <div class="fq-tablewrap"><table class="fq-table">
        <thead><tr><th>Measure (latest fiscal year)</th><th>${esc(c.name)}</th><th>${term("median", "Peer median")}</th><th>Rank</th><th class="fq-hide-sm">Low → high</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <p class="fq-small fq-muted">Rank 1 is the best of the group on that measure. In the chart column each grey dot is a peer, the colored dot is ${esc(c.name)} and the vertical line is the median. Hover a dot for the company.</p>
    </article>`;
  }

  Core.start({
    page: "benchmarks",
    usesPair: true,
    render(A, B) {
      const groups = [...new Set(Core.state.list.map((c) => c.group))].filter((g) => g !== "Other");
      $("#app").innerHTML = `
        <section class="fq-section">
          <div class="fq-grid">${card(A, 0)}${card(B, 1)}</div>
          ${A.group !== B.group ? `<p class="fq-note fq-note--warn">${esc(A.name)} and ${esc(B.name)} are in different peer groups, so each is ranked against different companies. Compare each one with its own peers, not the two ranks with each other.</p>` : ""}
        </section>
        <section class="fq-section fq-prose">
          <h2>Why compare within an industry?</h2>
          <p>Financial ratios are shaped by the kind of business as much as by how well it is run. A supermarket chain sells huge volumes at a thin margin and turns its stock over in weeks. A software company sells something that costs almost nothing to copy, so its margin is high, but it may need years of spending to build the product.</p>
          <p>Put those two side by side and the software company "wins" on margin every time, which tells you nothing about which business is better managed. Compared with other retailers, a 3% net margin can be excellent. The same is true of debt: steady businesses such as consumer staples can carry much more debt safely than a company whose sales swing with the economy.</p>
          <h2>What these benchmarks are, and are not</h2>
          <ul>
            <li>Each peer group is a short, fixed list of large US companies (${groups.map((g) => `${g}: ${Core.peers(g).length}`).join(", ")}). The median is the median of that list. It is not an average for the whole industry.</li>
            <li>With seven to nine companies, a rank such as "3 of 8" is more honest than a percentile, so that is what is shown.</li>
            <li>All figures are from each company's latest annual report. Fiscal years end in different months.</li>
            <li>Valuation multiples such as price-to-earnings are not included. They need a current share price, and FinanceIQ has no reliable free source for one.</li>
            <li>Banks, insurers and property trusts are left out of FinanceIQ entirely. Their balance sheets work differently and these measures would mislead.</li>
          </ul>
        </section>`;
    },
  });
})();
