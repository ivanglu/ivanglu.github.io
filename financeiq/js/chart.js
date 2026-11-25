/* ============================================================
   FinanceIQ charts. One small SVG line chart, used on every page.
   No libraries.

   Chart.line(host, {
     xs:      [2021, 2022, ...]              x positions, in order
     series:  [{ name, short, color, values: { 2021: 12.3, ... } }]
     fmt:     (v) => "$12.3B"                tooltip format
     axisFmt: (v) => "$12B"                  axis label format (optional)
     xTitle:  (x) => "Fiscal 2021"           tooltip heading (optional)
     height:  300                            (optional)
   })
   ============================================================ */

const Chart = (() => {
  const isNum = Calc.isNum;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Pick round axis values (0, 50, 100, ...) that cover lo..hi.
  function niceTicks(lo, hi, count = 5) {
    if (lo === hi) hi = lo + 1;
    const rough = (hi - lo) / count;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough);
    const ticks = [];
    for (let v = Math.floor(lo / step) * step; v < hi + step * 0.999; v += step) ticks.push(+v.toPrecision(12));
    return ticks;
  }

  function line(host, cfg) {
    const W = Math.max(260, host.clientWidth || 600);
    const H = cfg.height || (W < 480 ? 230 : 290);
    const m = { top: 14, right: 54, bottom: 26, left: 54 };
    const xs = cfg.xs;
    const axisFmt = cfg.axisFmt || cfg.fmt;
    const values = cfg.series.flatMap((s) => xs.map((x) => s.values[x])).filter(isNum);
    if (!values.length) {
      host.innerHTML = `<p class="fq-empty">Not reported by ${cfg.series.length > 1 ? "either company" : "this company"} in a standard way.</p>`;
      return;
    }
    const base = isNum(cfg.baseline) ? cfg.baseline : 0;
    const ticks = niceTicks(Math.min(base, ...values), Math.max(base, ...values), H < 200 ? 3 : 5);
    const lo = ticks[0], hi = ticks[ticks.length - 1];
    const x = (v) => m.left + (xs.indexOf(v) / Math.max(1, xs.length - 1)) * (W - m.left - m.right);
    const y = (v) => m.top + (1 - (v - lo) / (hi - lo)) * (H - m.top - m.bottom);

    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" tabindex="0" aria-label="${esc((cfg.label || "Chart") + ". Use the left and right arrow keys to read each year.")}">`;
    for (const t of ticks) {
      svg += `<line class="${t === 0 && lo < 0 ? "fq-zero" : "fq-gridline"}" x1="${m.left}" x2="${W - m.right}" y1="${y(t)}" y2="${y(t)}"/>`;
      svg += `<text x="${m.left - 8}" y="${y(t) + 4}" text-anchor="end">${esc(axisFmt(t))}</text>`;
    }
    // x labels: skip some so they never collide (wider labels need more room)
    const xLabel = cfg.xLabel || ((v) => v);
    const widest = Math.max(...xs.map((v) => String(xLabel(v)).length)) * 7 + 12;
    const skip = Math.ceil(widest / ((W - m.left - m.right) / Math.max(1, xs.length - 1)));
    xs.forEach((v, i) => {
      if ((xs.length - 1 - i) % skip === 0) svg += `<text x="${x(v)}" y="${H - 6}" text-anchor="middle">${esc(xLabel(v))}</text>`;
    });

    // lines + dots; a missing year breaks the line instead of drawing through it
    const ends = [];
    for (const s of cfg.series) {
      let d = "", pen = false, last = null;
      for (const v of xs) {
        const val = s.values[v];
        if (!isNum(val)) { pen = false; continue; }
        d += `${pen ? "L" : "M"}${x(v).toFixed(1)},${y(val).toFixed(1)}`;
        pen = true; last = { x: v, val };
      }
      svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      // dots only when there are few enough points to tell apart (yearly data, not daily prices)
      if (xs.length <= 40) for (const v of xs) {
        if (isNum(s.values[v])) svg += `<circle cx="${x(v)}" cy="${y(s.values[v])}" r="3" fill="${s.color}" stroke="var(--surface)" stroke-width="1.5"/>`;
      }
      if (last && s.endLabel !== false) ends.push({ s, px: x(last.x), py: y(last.val) });
    }
    // label each line at its right end; nudge apart if they would overlap
    if (ends.length === 2 && Math.abs(ends[0].py - ends[1].py) < 14) {
      const [top, bottom] = ends[0].py <= ends[1].py ? ends : [ends[1], ends[0]];
      const mid = (top.py + bottom.py) / 2;
      top.py = mid - 7; bottom.py = mid + 7;
    }
    for (const e of ends) svg += `<text class="fq-endlabel" x="${e.px + 8}" y="${e.py + 4}">${esc(e.s.short || e.s.name)}</text>`;

    // hover layer
    svg += `<line class="fq-cross" y1="${m.top}" y2="${H - m.bottom}" visibility="hidden"/>`;
    cfg.series.forEach((s) => { svg += `<circle class="fq-hot" r="5" fill="${s.color}" stroke="var(--surface)" stroke-width="2" visibility="hidden"/>`; });
    svg += `<rect class="fq-hit" x="${m.left - 10}" y="0" width="${W - m.left - m.right + 20}" height="${H}" fill="transparent"/></svg>`;
    host.innerHTML = svg + `<div class="fq-tip" role="status" aria-live="polite" hidden></div>`;

    const tip = host.querySelector(".fq-tip"), cross = host.querySelector(".fq-cross");
    const hots = [...host.querySelectorAll(".fq-hot")], hit = host.querySelector(".fq-hit");
    const hide = () => {
      tip.hidden = true;
      cross.setAttribute("visibility", "hidden");
      hots.forEach((h) => h.setAttribute("visibility", "hidden"));
    };
    // Show the crosshair and tooltip for one x value.
    const show = (at) => {
      current = xs.indexOf(at);
      cross.setAttribute("x1", x(at)); cross.setAttribute("x2", x(at));
      cross.setAttribute("visibility", "visible");
      let html = `<b>${esc(cfg.xTitle ? cfg.xTitle(at) : at)}</b>`;
      cfg.series.forEach((s, i) => {
        const v = s.values[at];
        if (isNum(v)) { hots[i].setAttribute("cx", x(at)); hots[i].setAttribute("cy", y(v)); hots[i].setAttribute("visibility", "visible"); }
        else hots[i].setAttribute("visibility", "hidden");
        html += `<div><i class="fq-swatch" style="background:${s.color}"></i>${esc(s.name)}<em>${isNum(v) ? esc(cfg.fmt(v)) : "—"}</em></div>`;
      });
      tip.innerHTML = html;
      tip.hidden = false;
      const left = x(at) + 14 + tip.offsetWidth > W ? x(at) - 14 - tip.offsetWidth : x(at) + 14;
      tip.style.left = Math.max(0, left) + "px";
    };
    let current = xs.length - 1;
    hit.addEventListener("pointermove", (ev) => {
      const px = ev.clientX - host.getBoundingClientRect().left;
      show(xs.reduce((best, v) => (Math.abs(x(v) - px) < Math.abs(x(best) - px) ? v : best), xs[0]));
    });
    // Keyboard: Tab to the chart, then left and right arrows step through the years.
    const svgEl = host.querySelector("svg");
    svgEl.addEventListener("focus", () => show(xs[current]));
    svgEl.addEventListener("blur", hide);
    svgEl.addEventListener("keydown", (ev) => {
      const step = { ArrowLeft: -1, ArrowRight: 1, Home: -xs.length, End: xs.length }[ev.key];
      if (ev.key === "Escape") { hide(); return; }
      if (!step) return;
      ev.preventDefault();
      show(xs[Math.min(xs.length - 1, Math.max(0, current + step))]);
    });
    hit.addEventListener("pointerleave", hide);
  }

  // Shorter number formats for chart axes: $100B, 20%, 1.5×
  const axis = {
    money(v) {
      const abs = Math.abs(v);
      const text = abs >= 1e12 ? +(abs / 1e12).toFixed(2) + "T" : abs >= 1e9 ? +(abs / 1e9).toFixed(1) + "B" : abs >= 1e6 ? Math.round(abs / 1e6) + "M" : "0";
      return (v < 0 ? "−$" : "$") + text;
    },
    pct: (v) => Calc.pct(v, 0),
    ratio: (v) => +v.toFixed(2) + "×",
    perShare: (v) => (v < 0 ? "−$" : "$") + +Math.abs(v).toFixed(2),
    shares: (v) => (Math.abs(v) >= 1e9 ? +(v / 1e9).toFixed(2) + "B" : Math.round(v / 1e6) + "M"),
    index: (v) => String(Math.round(v)),
  };

  return { line, niceTicks, axis };
})();
