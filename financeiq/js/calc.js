/* ============================================================
   FinanceIQ calculation engine.

   Every financial formula in the app lives in this file. It has no
   browser code in it, so each function can be unit-tested
   (see tests/tests.js) and explained on its own.

   Sections
     1. helpers            safe division, averages, growth, CAGR
     2. derive()           turns reported figures into ratios, year by year
     3. scoring            the 0-100 Financial Health Score
     4. DCF                discounted cash flow valuation
     5. peer statistics    medians and ranks for industry benchmarks
     6. number formatting
   ============================================================ */

const Calc = (() => {
  /* ---------------- 1. helpers ---------------- */

  const isNum = (v) => typeof v === "number" && isFinite(v);

  // Division that returns null instead of Infinity or NaN.
  const div = (a, b) => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // Average of this year's and last year's balance. Falls back to this year's alone.
  const avg = (now, before) => (isNum(now) && isNum(before) ? (now + before) / 2 : isNum(now) ? now : null);

  // Year-over-year growth. Not meaningful when the starting value is zero or negative.
  const growth = (before, now) => (isNum(before) && isNum(now) && before > 0 ? (now - before) / before : null);

  // Compound annual growth rate: (end / start)^(1 / years) - 1.
  // Only defined when both values are positive.
  function cagr(start, end, years) {
    if (!isNum(start) || !isNum(end) || !(years > 0) || start <= 0 || end <= 0) return null;
    return Math.pow(end / start, 1 / years) - 1;
  }

  function median(values) {
    const v = values.filter(isNum).sort((a, b) => a - b);
    if (!v.length) return null;
    const mid = Math.floor(v.length / 2);
    return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  }

  /* ---------------- 2. derive ---------------- */

  const STATUTORY_TAX_RATE = 0.21; // US federal rate, used only when a company's own rate can't be calculated

  // Adds calculated fields to every fiscal year of one company, plus
  // company-level summaries (c.L = latest year, growth rates, ...).
  function derive(company) {
    const ys = company.years;
    ys.forEach((y, i) => {
      const p = ys[i - 1] || {};

      // --- profit measures
      // EBIT: operating income as reported. A few companies (Nike, IBM, TJX) do not report
      // that line, so it is rebuilt as pre-tax income + interest expense and flagged.
      y.ebitDerived = !isNum(y.operatingIncome) && isNum(y.pretaxIncome) && isNum(y.interestExpense);
      y.ebit = isNum(y.operatingIncome) ? y.operatingIncome : y.ebitDerived ? y.pretaxIncome + y.interestExpense : null;
      y.ebitda = isNum(y.ebit) && isNum(y.depreciation) ? y.ebit + y.depreciation : null;

      // Effective tax rate, kept between 0% and 35% so one unusual year can't distort ROIC.
      const rawRate = isNum(y.incomeTax) && y.pretaxIncome > 0 ? y.incomeTax / y.pretaxIncome : null;
      y.taxRateAssumed = !isNum(rawRate);
      y.taxRate = isNum(rawRate) ? clamp(rawRate, 0, 0.35) : STATUTORY_TAX_RATE;
      y.nopat = isNum(y.ebit) ? y.ebit * (1 - y.taxRate) : null; // net operating profit after tax

      // --- margins (share of each sales dollar)
      y.grossMargin = div(y.grossProfit, y.revenue);
      y.opMargin = div(y.ebit, y.revenue);
      y.netMargin = div(y.netIncome, y.revenue);

      // --- cash flow
      y.freeCashFlow = isNum(y.operatingCashFlow) && isNum(y.capex) ? y.operatingCashFlow - y.capex : null;
      y.ocfMargin = div(y.operatingCashFlow, y.revenue);
      y.fcfMargin = div(y.freeCashFlow, y.revenue);
      y.fcfConversion = y.netIncome > 0 ? div(y.freeCashFlow, y.netIncome) : null;
      // Free cash flow to the firm: add back after-tax interest, because FCFF is
      // the cash available to lenders AND shareholders, before interest is paid.
      y.fcff = isNum(y.freeCashFlow) && isNum(y.interestExpense)
        ? y.freeCashFlow + y.interestExpense * (1 - y.taxRate) : null;

      // --- growth
      y.growth = growth(p.revenue, y.revenue);

      // --- balance sheet strength
      y.netCash = isNum(y.cash) && isNum(y.debt) ? y.cash - y.debt : null;
      y.netDebt = isNum(y.netCash) ? -y.netCash : null;
      y.debtToEquity = y.equity > 0 ? div(y.debt, y.equity) : null;       // undefined when equity is negative
      y.currentRatio = div(y.currentAssets, y.currentLiabilities);
      y.interestCoverage = y.interestExpense > 0 ? div(y.ebit, y.interestExpense) : null;
      y.netDebtToEbitda = y.ebitda > 0 ? div(y.netDebt, y.ebitda) : null;

      // --- returns (profit compared with the money tied up in the business).
      // Balance-sheet figures are averaged over the year.
      y.investedCapital = isNum(y.debt) && isNum(y.equity) ? y.debt + y.equity : null;
      const avgCapital = avg(y.investedCapital, isNum(p.debt) && isNum(p.equity) ? p.debt + p.equity : null);
      const avgEquity = avg(y.equity, p.equity);
      const avgAssets = avg(y.assets, p.assets);
      y.roic = avgCapital > 0 ? div(y.nopat, avgCapital) : null;
      y.roe = avgEquity > 0 ? div(y.netIncome, avgEquity) : null;
      y.roa = div(y.netIncome, avgAssets);
      y.assetTurnover = div(y.revenue, avgAssets);
    });

    const n = ys.length;
    company.L = ys[n - 1];                         // latest fiscal year
    company.P = ys[Math.max(0, n - 6)];            // five years earlier
    company.span = company.L.fy - company.P.fy;
    company.cagr = cagr(company.P.revenue, company.L.revenue, company.span);
    company.cagr3 = cagrOf(company, "revenue", 3);
    company.ebitCagr3 = cagrOf(company, "ebit", 3);
    company.epsCagr3 = cagrOf(company, "eps", 3);
    const recent = ys.slice(-5).map((y) => y.freeCashFlow).filter(isNum);
    company.fcfYears = recent.length;
    company.fcfPositiveShare = recent.length ? recent.filter((v) => v > 0).length / recent.length : null;
    return company;
  }

  // The year `back` fiscal years before the latest one (null if not available).
  function yearBack(company, back) {
    const latest = company.years[company.years.length - 1];
    return company.years.find((y) => y.fy === latest.fy - back) || null;
  }

  // CAGR of any yearly field over the last `back` years.
  function cagrOf(company, key, back) {
    const start = yearBack(company, back), end = company.years[company.years.length - 1];
    return start ? cagr(start[key], end[key], back) : null;
  }

  /* ---------------- 3. Financial Health Score ---------------- */

  // Linear scale: `lo` scores 0, `hi` scores 100, values outside are capped.
  // Works for "lower is better" metrics too (then lo > hi).
  function scale(value, lo, hi) {
    if (!isNum(value)) return null;
    return clamp((value - lo) / (hi - lo), 0, 1) * 100;
  }

  // Growth of a profit figure over three years, with the awkward cases handled explicitly.
  function profitGrowthRule(company, key, word) {
    const start = yearBack(company, 3), end = company.L;
    if (!start || !isNum(start[key]) || !isNum(end[key])) return { value: null };
    if (end[key] <= 0) return { value: null, score: 0, note: `${word} is negative in the latest year` };
    if (start[key] <= 0) return { value: null, note: `${word} was negative three years ago, so a growth rate is not meaningful` };
    return { value: cagr(start[key], end[key], 3) };
  }

  const THIN_EQUITY = 0.10;

  // Each metric: lo -> 0 points, hi -> 100 points. `get` returns { value, score?, note? }.
  // If `score` is given it overrides the scale (used for special cases).
  // If value is null and no score is given, the metric is left out, not counted as zero.
  const SCORE_MODEL = [
    {
      id: "growth", label: "Growth", weight: 25,
      about: "Is the business getting bigger, and are profits growing with it?",
      metrics: [
        { id: "revenueGrowth", label: "Revenue growth (latest year)", fmt: "pct", lo: -0.05, hi: 0.20,
          good: "sales grew quickly last year", bad: "sales barely grew or shrank last year",
          get: (c) => ({ value: c.L.growth }) },
        { id: "revenueCagr3", label: "Revenue growth per year (3 years)", fmt: "pct", lo: -0.02, hi: 0.20,
          good: "sales have compounded quickly for three years", bad: "sales have been flat or falling for three years",
          get: (c) => ({ value: c.cagr3 }) },
        { id: "ebitCagr3", label: "Operating income growth per year (3 years)", fmt: "pct", lo: -0.05, hi: 0.20,
          good: "operating profit is growing fast", bad: "operating profit is shrinking",
          get: (c) => profitGrowthRule(c, "ebit", "Operating income") },
        { id: "epsCagr3", label: "EPS growth per year (3 years)", fmt: "pct", lo: -0.05, hi: 0.20,
          good: "profit per share is growing fast", bad: "profit per share is shrinking",
          get: (c) => profitGrowthRule(c, "eps", "EPS") },
      ],
    },
    {
      id: "profitability", label: "Profitability", weight: 25,
      about: "How much of each sales dollar becomes profit?",
      metrics: [
        { id: "grossMargin", label: "Gross margin", fmt: "pct", lo: 0.15, hi: 0.60,
          good: "products cost little to make compared with their price", bad: "most of the sale price goes on making the product",
          get: (c) => ({ value: c.L.grossMargin }) },
        { id: "opMargin", label: "Operating margin", fmt: "pct", lo: 0, hi: 0.30,
          good: "the core business is very profitable", bad: "the core business earns little on each sale",
          get: (c) => ({ value: c.L.opMargin }) },
        { id: "netMargin", label: "Net profit margin", fmt: "pct", lo: 0, hi: 0.25,
          good: "keeps a large share of sales as profit", bad: "keeps little of its sales as profit",
          get: (c) => ({ value: c.L.netMargin }) },
        { id: "roe", label: "Return on equity", fmt: "pct", lo: 0, hi: 0.25,
          good: "earns a high return on shareholders' money", bad: "earns a low return on shareholders' money",
          get: (c) => {
            const equity = avg(c.L.equity, (yearBack(c, 1) || {}).equity);
            if (!isNum(equity)) return { value: null };
            if (equity <= 0) return { value: null, note: "Shareholder equity is negative, so return on equity is not meaningful" };
            // Heavy share buybacks can shrink equity to almost nothing, which makes ROE look enormous.
            if (equity < THIN_EQUITY * c.L.assets) return { value: null, note: "Shareholder equity is under 10% of assets, which distorts return on equity, so it is left out" };
            return { value: c.L.roe };
          } },
      ],
    },
    {
      id: "stability", label: "Financial stability", weight: 20,
      about: "Could the company cope with a bad year without trouble from its lenders?",
      metrics: [
        { id: "debtToEquity", label: "Debt-to-equity", fmt: "ratio", lo: 2.0, hi: 0,
          good: "uses little debt compared with shareholders' money", bad: "relies heavily on borrowed money",
          get: (c) => (c.L.debt === 0 ? { value: 0 }
            : isNum(c.L.equity) && c.L.equity <= 0 ? { value: null, note: "Shareholder equity is negative, so debt-to-equity is not meaningful" }
            : { value: c.L.debtToEquity }) },
        { id: "currentRatio", label: "Current ratio", fmt: "ratio", lo: 0.5, hi: 2.0,
          good: "short-term assets comfortably cover short-term bills", bad: "short-term bills are larger than short-term assets",
          get: (c) => ({ value: c.L.currentRatio }) },
        { id: "interestCoverage", label: "Interest coverage", fmt: "ratio", lo: 1.5, hi: 12,
          good: "operating profit covers interest payments many times over", bad: "interest payments take a large share of operating profit",
          get: (c) => (c.L.debt === 0 || c.L.interestExpense === 0 ? { value: null, score: 100, note: "No debt or no interest expense" }
            : !isNum(c.L.interestExpense) || !isNum(c.L.ebit) ? { value: null }
            : c.L.ebit <= 0 ? { value: c.L.interestCoverage, score: 0, note: "Operating profit is negative" }
            : { value: c.L.interestCoverage }) },
        { id: "netDebtToEbitda", label: "Net debt ÷ EBITDA", fmt: "ratio", lo: 4, hi: 0,
          good: "could repay its net debt quickly out of operating profit", bad: "net debt is many years of operating profit",
          get: (c) => (!isNum(c.L.netDebt) ? { value: null }
            : c.L.netDebt <= 0 ? { value: null, score: 100, note: "Holds more cash than debt" }
            : !isNum(c.L.ebitda) ? { value: null }
            : c.L.ebitda <= 0 ? { value: null, score: 0, note: "EBITDA is negative while the company has net debt" }
            : { value: c.L.netDebtToEbitda }) },
      ],
    },
    {
      id: "cashflow", label: "Cash flow", weight: 20,
      about: "Does profit turn into real cash, year after year?",
      metrics: [
        { id: "ocfMargin", label: "Operating cash flow margin", fmt: "pct", lo: 0, hi: 0.30,
          good: "day-to-day operations bring in a lot of cash", bad: "day-to-day operations bring in little cash",
          get: (c) => ({ value: c.L.ocfMargin }) },
        { id: "fcfMargin", label: "Free cash flow margin", fmt: "pct", lo: 0, hi: 0.25,
          good: "has plenty of cash left after investing in the business", bad: "has little cash left after investing in the business",
          get: (c) => ({ value: c.L.fcfMargin }) },
        { id: "fcfConversion", label: "Free cash flow ÷ net income", fmt: "ratio", lo: 0.3, hi: 1.0,
          good: "reported profit is backed by cash", bad: "reported profit is not turning into cash",
          get: (c) => (isNum(c.L.netIncome) && c.L.netIncome <= 0 ? { value: null, note: "Net income is negative, so cash conversion is not meaningful" }
            : { value: c.L.fcfConversion }) },
        { id: "fcfConsistency", label: "Years with positive free cash flow (last 5)", fmt: "pct0", lo: 0.4, hi: 1.0,
          good: "free cash flow has been positive every year", bad: "free cash flow has been negative in some recent years",
          get: (c) => (c.fcfYears >= 3 ? { value: c.fcfPositiveShare } : { value: null, note: "Fewer than three years of cash flow data" }) },
      ],
    },
    {
      id: "efficiency", label: "Capital efficiency", weight: 10,
      about: "How much profit does the company earn on the money tied up in it?",
      metrics: [
        { id: "roic", label: "Return on invested capital", fmt: "pct", lo: 0.05, hi: 0.25,
          good: "earns a high return on the capital invested in it", bad: "earns a low return on the capital invested in it",
          get: (c) => ({ value: c.L.roic }) },
        { id: "roa", label: "Return on assets", fmt: "pct", lo: 0, hi: 0.15,
          good: "earns a lot of profit from its assets", bad: "earns little profit from its assets",
          get: (c) => ({ value: c.L.roa }) },
        { id: "assetTurnover", label: "Asset turnover", fmt: "ratio", lo: 0.3, hi: 1.5,
          good: "generates a lot of sales from its assets", bad: "needs a lot of assets to generate its sales",
          get: (c) => ({ value: c.L.assetTurnover }) },
      ],
    },
  ];

  const PRESETS = {
    Default: { growth: 25, profitability: 25, stability: 20, cashflow: 20, efficiency: 10 },
    Growth: { growth: 40, profitability: 20, stability: 10, cashflow: 20, efficiency: 10 },
    Profitability: { growth: 15, profitability: 40, stability: 15, cashflow: 20, efficiency: 10 },
    Conservative: { growth: 10, profitability: 20, stability: 40, cashflow: 25, efficiency: 5 },
  };

  const MIN_METRICS_PER_CATEGORY = 2;
  const MIN_CATEGORIES = 3;

  // Make any set of non-negative weights add up to 100.
  function normalizeWeights(weights) {
    const ids = SCORE_MODEL.map((c) => c.id);
    const clean = Object.fromEntries(ids.map((id) => [id, isNum(weights[id]) && weights[id] > 0 ? weights[id] : 0]));
    const total = ids.reduce((s, id) => s + clean[id], 0);
    if (total === 0) return Object.fromEntries(ids.map((id) => [id, 100 / ids.length]));
    return Object.fromEntries(ids.map((id) => [id, (clean[id] / total) * 100]));
  }

  function scoreCompany(company, weights = PRESETS.Default) {
    const w = normalizeWeights(weights);
    const notes = [];
    const categories = SCORE_MODEL.map((cat) => {
      const metrics = cat.metrics.map((m) => {
        const r = m.get(company);
        const score = isNum(r.score) ? r.score : scale(r.value, m.lo, m.hi);
        if (r.note) notes.push(`${m.label}: ${r.note}.`);
        return { id: m.id, label: m.label, fmt: m.fmt, lo: m.lo, hi: m.hi, good: m.good, bad: m.bad,
                 value: isNum(r.value) ? r.value : null, score, note: r.note || null };
      });
      const scored = metrics.filter((m) => isNum(m.score));
      const enough = scored.length >= MIN_METRICS_PER_CATEGORY;
      if (!enough) notes.push(`${cat.label}: not enough data to score (${scored.length} of ${metrics.length} measures available).`);
      return {
        id: cat.id, label: cat.label, about: cat.about, weight: w[cat.id], metrics,
        used: scored.length, total: metrics.length,
        score: enough ? scored.reduce((s, m) => s + m.score, 0) / scored.length : null,
      };
    });

    // Overall score: weighted average of the categories that could be scored.
    // A category with no score is left out and the remaining weights are rescaled,
    // so missing data is never treated as a bad result.
    const usable = categories.filter((c) => isNum(c.score) && c.weight > 0);
    const weightSum = usable.reduce((s, c) => s + c.weight, 0);
    const scoredCats = categories.filter((c) => isNum(c.score)).length;
    const overall = scoredCats >= MIN_CATEGORIES && weightSum > 0
      ? usable.reduce((s, c) => s + c.score * c.weight, 0) / weightSum : null;
    if (overall === null) notes.push("Overall score not shown: fewer than three categories could be scored.");
    const used = categories.reduce((s, c) => s + c.used, 0), total = categories.reduce((s, c) => s + c.total, 0);
    return { overall, categories, notes, weights: w, coverage: { used, total } };
  }

  function band(score) {
    if (!isNum(score)) return "Not enough data";
    return score >= 80 ? "Very strong" : score >= 65 ? "Strong" : score >= 50 ? "Mixed" : score >= 35 ? "Weak" : "Very weak";
  }

  // The best- and worst-scoring measures, as plain sentences.
  function highlights(result, count = 3) {
    const all = result.categories.flatMap((c) => c.metrics.filter((m) => isNum(m.score)).map((m) => ({ ...m, category: c.label })));
    const text = (m, phrase) => `${m.label}${isNum(m.value) ? " of " + fmt(m.value, m.fmt) : ""}: ${phrase}.`;
    return {
      strengths: all.filter((m) => m.score >= 75).sort((a, b) => b.score - a.score).slice(0, count).map((m) => text(m, m.good)),
      weaknesses: all.filter((m) => m.score <= 35).sort((a, b) => a.score - b.score).slice(0, count).map((m) => text(m, m.bad)),
    };
  }

  /* ---------------- 4. DCF valuation ---------------- */

  // Enterprise-value DCF.
  //   fcf0            latest free cash flow to the firm (the starting point; year 0)
  //   growth          yearly growth of that cash flow during the projection, e.g. 0.06
  //   years           length of the projection, 5 to 10
  //   discount        discount rate (required return / cost of capital), e.g. 0.09
  //   terminalGrowth  growth assumed forever after the projection, e.g. 0.025
  //   cash, debt      latest balance sheet
  //   shares          diluted shares outstanding
  function dcf(a) {
    const errors = [];
    const need = ["fcf0", "growth", "years", "discount", "terminalGrowth", "cash", "debt", "shares"];
    for (const k of need) if (!isNum(a[k])) errors.push(`${k} must be a number`);
    if (!errors.length) {
      if (!Number.isInteger(a.years) || a.years < 5 || a.years > 10) errors.push("Projection period must be a whole number of years from 5 to 10");
      if (a.discount <= 0) errors.push("Discount rate must be above 0%");
      if (a.discount <= a.terminalGrowth) errors.push("Discount rate must be higher than terminal growth, otherwise the terminal value is infinite");
      if (a.growth <= -1) errors.push("Growth cannot be -100% or lower");
      if (a.shares <= 0) errors.push("Shares outstanding must be above 0");
      if (a.cash < 0 || a.debt < 0) errors.push("Cash and debt cannot be negative");
    }
    if (errors.length) return { valid: false, errors };

    const rows = [];
    let sumPv = 0, fcf = a.fcf0;
    for (let t = 1; t <= a.years; t++) {
      fcf *= 1 + a.growth;
      const factor = 1 / Math.pow(1 + a.discount, t);   // what $1 received in year t is worth today
      rows.push({ year: t, fcf, factor, pv: fcf * factor });
      sumPv += fcf * factor;
    }
    // Gordon growth formula: value at the end of the projection of all cash flows after it
    const terminalValue = (fcf * (1 + a.terminalGrowth)) / (a.discount - a.terminalGrowth);
    const pvTerminal = terminalValue / Math.pow(1 + a.discount, a.years);
    const enterpriseValue = sumPv + pvTerminal;          // value of the whole business
    const equityValue = enterpriseValue - a.debt + a.cash; // what is left for shareholders
    return {
      valid: true, errors: [], rows, sumPv, terminalValue, pvTerminal, enterpriseValue, equityValue,
      perShare: equityValue / a.shares,
      terminalShare: enterpriseValue !== 0 ? pvTerminal / enterpriseValue : null,
    };
  }

  // Value per share for every combination of discount rate and terminal growth.
  // Cells where the model is invalid (discount <= terminal growth) are null.
  function sensitivity(assumptions, discountRates, terminalGrowths) {
    return terminalGrowths.map((g) => discountRates.map((r) => {
      const res = dcf({ ...assumptions, discount: r, terminalGrowth: g });
      return res.valid ? res.perShare : null;
    }));
  }

  // Upside (+) or downside (-) of the estimate compared with a market price.
  const upside = (perShare, price) => (isNum(perShare) && price > 0 ? perShare / price - 1 : null);

  // Neutral starting assumptions. They are documented rules, not forecasts.
  function dcfDefaults(company) {
    const L = company.L;
    const usesFcff = isNum(L.fcff);
    const base = isNum(company.cagr3) ? clamp(company.cagr3, 0.02, 0.12) : 0.04;
    const round = (v) => Math.round(v * 1000) / 1000;
    return {
      fcf0: usesFcff ? L.fcff : L.freeCashFlow, usesFcff,
      years: 5, cash: L.cash, debt: L.debt, shares: L.dilutedShares,
      scenarios: {
        bear: { growth: round(Math.max(0, base - 0.04)), discount: 0.105, terminalGrowth: 0.02 },
        base: { growth: round(base), discount: 0.09, terminalGrowth: 0.025 },
        bull: { growth: round(base + 0.04), discount: 0.08, terminalGrowth: 0.03 },
      },
    };
  }

  /* ---------------- 5. peer statistics ---------------- */

  // Where one company stands among its peers. Rank 1 is best.
  function peerStats(value, peerValues, higherIsBetter = true) {
    const vals = peerValues.filter(isNum);
    if (!isNum(value) || vals.length < 4) return { median: median(vals), rank: null, of: vals.length, percentile: null };
    const better = vals.filter((v) => (higherIsBetter ? v > value : v < value)).length;
    const worse = vals.filter((v) => (higherIsBetter ? v < value : v > value)).length;
    return {
      median: median(vals), rank: better + 1, of: vals.length,
      percentile: vals.length > 1 ? (worse / (vals.length - 1)) * 100 : null,
    };
  }

  /* ---------------- 6. number formatting ---------------- */

  const MINUS = "−";

  // 478834000000 -> "$478.8B", 774000000 -> "$774M", -2722000000 -> "−$2.7B"
  function money(v) {
    if (!isNum(v)) return "n/a";
    const abs = Math.abs(v);
    const text = abs >= 1e12 ? (abs / 1e12).toFixed(2) + "T" : abs >= 1e9 ? (abs / 1e9).toFixed(1) + "B"
      : abs >= 1e6 ? Math.round(abs / 1e6) + "M" : Math.round(abs).toLocaleString("en-US");
    return (v < 0 ? MINUS + "$" : "$") + text;
  }
  const pct = (v, digits = 1) => (isNum(v) ? (v < 0 ? MINUS : "") + Math.abs(v * 100).toFixed(digits) + "%" : "n/a");
  const ratio = (v) => (isNum(v) ? (v < 0 ? MINUS : "") + Math.abs(v).toFixed(2) + "×" : "n/a");
  const perShare = (v) => (isNum(v) ? (v < 0 ? MINUS + "$" : "$") + Math.abs(v).toFixed(2) : "n/a");
  // 15204137000 -> "15.20B"
  const shares = (v) => (isNum(v) ? (v >= 1e9 ? (v / 1e9).toFixed(2) + "B" : (v / 1e6).toFixed(0) + "M") : "n/a");

  function fmt(v, kind) {
    switch (kind) {
      case "money": return money(v);
      case "pct": return pct(v);
      case "pct0": return pct(v, 0);
      case "ratio": return ratio(v);
      case "perShare": return perShare(v);
      case "shares": return shares(v);
      default: return isNum(v) ? String(v) : "n/a";
    }
  }

  return {
    isNum, div, clamp, avg, growth, cagr, median, derive, yearBack, cagrOf,
    scale, SCORE_MODEL, PRESETS, normalizeWeights, scoreCompany, band, highlights,
    dcf, sensitivity, upside, dcfDefaults, peerStats,
    money, pct, ratio, perShare, shares, fmt, STATUTORY_TAX_RATE,
  };
})();

if (typeof module !== "undefined") module.exports = Calc;
