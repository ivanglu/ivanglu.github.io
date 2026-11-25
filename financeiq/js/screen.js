/* ============================================================
   FinanceIQ screener logic: rows, filters, sorting, saved screens,
   CSV export, search and watchlist helpers.
   Pure functions, no browser code, so they can be unit-tested.
   ============================================================ */

const Screen = (() => {
  const { isNum } = Calc;
  const GRADE_ORDER = { A: 5, B: 4, C: 3, D: 2, F: 1 };

  // One flat row per company: everything the screener table can show or filter on.
  function row(company, rating, market) {
    const cat = Object.fromEntries(rating.categories.map((c) => [c.id, c]));
    const m = market ? market[company.ticker] : null;
    return {
      ticker: company.ticker, name: company.name, group: company.group, blurb: company.blurb,
      overall: rating.overall, overallGrade: rating.grade, complete: rating.complete, coverage: rating.coverage,
      fundamental: cat.fundamental.score, quant: cat.quant.score, valuation: cat.valuation.score,
      earnings: cat.earnings.score, quality: cat.quality.score,
      revenueGrowth: company.ttm.revenueGrowth, epsGrowth: company.ttm.epsGrowth,
      opMargin: isNum(company.ttm.opMargin) ? company.ttm.opMargin : company.L.opMargin,
      roic: company.L.roic, fcfMargin: company.L.fcfMargin, revenue: company.ttm.revenue || company.L.revenue,
      price: m ? m.v.price : null, marketCap: m ? m.v.marketCap : null, pe: m ? m.v.pe : null,
      fcfYield: m ? m.v.fcfYield : null, relative6m: m ? m.q.relative6m : null,
      asOf: company.latest.end,
    };
  }

  // filters: { text, group, minGrade: {fundamental: "B", ...}, min: {roic: 0.15}, max: {pe: 25} }
  // A row with a missing value fails any filter on that value: unknown is not a pass.
  function applyFilters(rows, filters = {}) {
    const text = (filters.text || "").trim().toLowerCase();
    return rows.filter((r) => {
      if (text && !(r.ticker.toLowerCase().includes(text) || r.name.toLowerCase().includes(text))) return false;
      if (filters.group && r.group !== filters.group) return false;
      for (const [key, g] of Object.entries(filters.minGrade || {})) {
        if (!g) continue;
        const have = Ratings.grade(r[key]);
        if (!have || GRADE_ORDER[have] < GRADE_ORDER[g]) return false;
      }
      for (const [key, g] of Object.entries(filters.maxGrade || {})) {
        if (!g) continue;
        const have = Ratings.grade(r[key]);
        if (!have || GRADE_ORDER[have] > GRADE_ORDER[g]) return false;
      }
      for (const [key, lo] of Object.entries(filters.min || {})) if (isNum(lo) && !(isNum(r[key]) && r[key] >= lo)) return false;
      for (const [key, hi] of Object.entries(filters.max || {})) if (isNum(hi) && !(isNum(r[key]) && r[key] <= hi)) return false;
      return true;
    });
  }

  // Sort by any column. Missing values always go last, whichever direction is chosen.
  function sortRows(rows, key, descending = true) {
    return [...rows].sort((a, b) => {
      const x = a[key], y = b[key];
      const xMissing = x === null || x === undefined, yMissing = y === null || y === undefined;
      if (xMissing || yMissing) return xMissing === yMissing ? a.ticker.localeCompare(b.ticker) : xMissing ? 1 : -1;
      const d = typeof x === "string" ? x.localeCompare(y) : x - y;
      return d === 0 ? a.ticker.localeCompare(b.ticker) : descending ? -d : d;
    });
  }

  // Ready-made screens. `market: true` means the screen needs price data.
  const PRESETS = [
    { id: "quality", name: "High-quality companies", why: "Financial quality graded A or B and return on invested capital of at least 15%.",
      filters: { minGrade: { quality: "B" }, min: { roic: 0.15 } }, sort: "quality" },
    { id: "improving", name: "Improving earnings momentum", why: "Earnings momentum graded A or B: profit growth is speeding up or consistently positive.",
      filters: { minGrade: { earnings: "B" } }, sort: "earnings" },
    { id: "growth", name: "Fast growers", why: "Fundamental performance graded A or B and trailing-12-month revenue growth of at least 10%.",
      filters: { minGrade: { fundamental: "B" }, min: { revenueGrowth: 0.10 } }, sort: "revenueGrowth" },
    { id: "strongBoth", name: "Strong fundamentals and strong momentum", market: true, why: "Fundamentals and Quantitative momentum both graded A or B.",
      filters: { minGrade: { fundamental: "B", quant: "B" } }, sort: "overall" },
    { id: "garp", name: "Growth at a reasonable price", market: true, why: "Fundamentals graded A or B and Valuation graded C or better.",
      filters: { minGrade: { fundamental: "B", valuation: "C" } }, sort: "valuation" },
    { id: "undervalued", name: "Lower-priced relative to results", market: true, why: "Valuation graded A or B and Financial quality graded C or better, to avoid companies that are cheap because they are in trouble.",
      filters: { minGrade: { valuation: "B", quality: "C" } }, sort: "valuation" },
    { id: "strongWeak", name: "Strong companies with weak market momentum", market: true, why: "Fundamentals and Quality graded A or B, but Quantitative momentum graded D or F.",
      filters: { minGrade: { fundamental: "B", quality: "B" }, maxGrade: { quant: "D" } }, sort: "fundamental" },
    { id: "expensiveGrowth", name: "Fast growers with demanding valuations", market: true, why: "Fundamentals graded A or B, but Valuation graded D or F.",
      filters: { minGrade: { fundamental: "B" }, maxGrade: { valuation: "D" } }, sort: "fundamental" },
  ];

  // CSV text for the given rows and columns [{ key, label, fmt }]. Raw numbers, not formatted strings.
  function toCsv(rows, columns) {
    const cell = (v) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "number" ? String(+v.toFixed(6)) : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    return [columns.map((c) => cell(c.label)).join(","), ...rows.map((r) => columns.map((c) => cell(r[c.key])).join(","))].join("\n");
  }

  // Search as you type. Ticker matches come first (those starting with the text, then containing it),
  // then companies whose name has a word starting with the text, then any other name match.
  function search(companies, text, limit = 8) {
    const q = (text || "").trim().toLowerCase();
    if (!q) return [];
    const rank = (c) => {
      const t = c.ticker.toLowerCase(), n = c.name.toLowerCase();
      if (t === q) return 0;
      if (t.startsWith(q)) return 1;
      if (n.startsWith(q)) return 2;
      if (n.split(/[\s(&-]+/).some((w) => w.startsWith(q))) return 3;
      if (t.includes(q)) return 4;
      if (n.includes(q) || (c.legalName || "").toLowerCase().includes(q)) return 5;
      return -1;
    };
    return companies.map((c) => ({ c, r: rank(c) })).filter((x) => x.r >= 0)
      .sort((a, b) => a.r - b.r || a.c.ticker.localeCompare(b.c.ticker)).slice(0, limit).map((x) => x.c);
  }

  // Watchlist: an ordered list of tickers with no duplicates.
  const toggle = (list, ticker) => (list.includes(ticker) ? list.filter((t) => t !== ticker) : [...list, ticker]);

  return { GRADE_ORDER, row, applyFilters, sortRows, PRESETS, toCsv, search, toggle };
})();

if (typeof module !== "undefined") module.exports = Screen;
