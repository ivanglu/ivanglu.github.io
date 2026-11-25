/* ============================================================
   FinanceIQ Stock Rating: five categories, one composite.

     Fundamental performance   is the business growing and profitable?      (SEC filings)
     Quantitative momentum     how has the share price behaved?             (needs daily prices)
     Valuation                 is the price reasonable for the results?     (needs a share price)
     Earnings momentum         is profit growth speeding up or slowing?     (SEC filings)
     Financial quality         balance sheet strength and earnings quality  (SEC filings)

   HOW A FACTOR IS SCORED (methodology version below)
     1. Absolute score: a straight line between two published levels, 0 to 100, capped.
     2. Rank score: the factor's percentile among the supported companies (not the whole market).
     3. Factor score = average of the two. If fewer than 10 companies have the factor,
        only the absolute score is used.
   A category is the weighted average of its factors and is only published when factors
   carrying at least 70% of its weight are available. The composite needs all five
   categories and 80% coverage; otherwise a clearly labelled partial score is shown.

   Nothing here is a forecast or a recommendation. An "A" is not a buy signal.
   No browser code in this file.
   ============================================================ */

const Ratings = (() => {
  const { isNum, scale, percentile, median } = Calc;
  const VERSION = "1.1";
  const MIN_CATEGORY_COVERAGE = 0.7;
  const MIN_OVERALL_COVERAGE = 0.8;
  const NO_MARKET = "Needs daily share prices, which FinanceIQ does not have yet";

  const v = (value, note) => ({ value: isNum(value) ? value : null, note });
  const yb = (c, n) => Calc.yearBack(c, n) || {};
  const growth = Calc.growth;
  // Labels for the "previous" column
  const PQ = "previous quarter", PY = "previous fiscal year", PY3 = "a year earlier";
  // Growth of a profit line, with losses handled: a loss now scores 0, a loss in the base year has no growth rate.
  const profitGrowth = (value, now, before, word) => (isNum(value) ? v(value)
    : isNum(now) && now <= 0 ? { value: null, score: 0, note: `${word} is negative` }
    : isNum(before) && before <= 0 ? v(null, `${word} was negative a year earlier, so a growth rate is not meaningful`) : v(null));

  // Each factor: lo scores 0 and hi scores 100 on the absolute scale (lo > hi means lower is better).
  // get(c, m) returns { value, score?, note? }. c = company, m = market data for it (or null).
  const MODEL = [
    {
      id: "fundamental", label: "Fundamental performance", short: "Fundamentals", weight: 25, source: "SEC filings",
      about: "Growth in sales, profit and cash flow, and how profitable the business is.",
      factors: [
        { id: "revQ", label: "Revenue growth, latest quarter", fmt: "pct", lo: -0.05, hi: 0.25, why: "Sales compared with the same quarter a year earlier.",
          get: (c) => v(c.Q.revenueGrowth), prev: (c) => c.prevQ.revenueGrowth, prevLabel: PQ },
        { id: "revTtm", label: "Revenue growth, trailing 12 months", fmt: "pct", lo: -0.05, hi: 0.25, why: "The last four quarters against the four before.",
          get: (c) => v(c.ttm.revenueGrowth), prev: (c) => c.prevQ.ttmRevenueGrowth, prevLabel: PQ },
        { id: "rev3", label: "Revenue growth per year, 3 years", fmt: "pct", lo: -0.02, hi: 0.20, why: "Compound annual growth over three fiscal years.",
          get: (c) => v(c.cagr3), prev: (c) => Calc.cagr(yb(c, 4).revenue, yb(c, 1).revenue, 3), prevLabel: PY },
        { id: "rev5", label: "Revenue growth per year, 5 years", fmt: "pct", lo: -0.02, hi: 0.20, why: "Compound annual growth over five fiscal years.",
          get: (c) => v(c.cagr5), prev: (c) => Calc.cagr(yb(c, 6).revenue, yb(c, 1).revenue, 5), prevLabel: PY },
        { id: "growthYears", label: "Years with rising revenue (last 5)", fmt: "pct0", lo: 0.4, hi: 1, why: "How consistent growth has been.", get: (c) => v(c.growthYears) },
        { id: "gpTtm", label: "Gross profit growth, trailing 12 months", fmt: "pct", lo: -0.05, hi: 0.25, why: "Whether profit after the direct cost of the product is growing.",
          get: (c) => profitGrowth(c.ttm.grossProfitGrowth, c.ttm.grossProfit, null, "Trailing gross profit"), prev: (c) => c.prevQ.ttmGrossProfitGrowth, prevLabel: PQ },
        { id: "opTtm", label: "Operating income growth, trailing 12 months", fmt: "pct", lo: -0.10, hi: 0.30, why: "Profit from the core business.",
          get: (c) => profitGrowth(c.ttm.opIncomeGrowth, c.ttm.opIncome, null, "Trailing operating income"), prev: (c) => c.prevQ.ttmOpIncomeGrowth, prevLabel: PQ },
        { id: "niQ", label: "Net income growth, latest quarter", fmt: "pct", lo: -0.10, hi: 0.30, why: "Bottom-line profit against the same quarter a year earlier.",
          get: (c) => profitGrowth(c.Q.netIncomeGrowth, c.Q.netIncome, (c.quarters[c.quarters.length - 5] || {}).netIncome, "Net income"), prev: (c) => c.prevQ.netIncomeGrowth, prevLabel: PQ },
        { id: "epsTtm", label: "EPS growth, trailing 12 months", fmt: "pct", lo: -0.10, hi: 0.30, why: "Profit per share, last four quarters against the four before.",
          get: (c) => profitGrowth(c.ttm.epsGrowth, c.ttm.eps, null, "Trailing EPS"), prev: (c) => c.prevQ.ttmEpsGrowth, prevLabel: PQ },
        { id: "grossMargin", label: "Gross margin", fmt: "pct", lo: 0.15, hi: 0.60, why: "Share of sales left after the direct cost of the product.",
          get: (c) => v(c.L.grossMargin), prev: (c) => yb(c, 1).grossMargin, prevLabel: PY },
        { id: "opMargin", label: "Operating margin, trailing 12 months", fmt: "pct", lo: 0, hi: 0.30, why: "Share of sales left as operating profit.",
          get: (c) => v(isNum(c.ttm.opMargin) ? c.ttm.opMargin : c.L.opMargin), prev: (c) => c.prevQ.ttmOpMargin, prevLabel: PQ },
        { id: "netMargin", label: "Net profit margin, trailing 12 months", fmt: "pct", lo: 0, hi: 0.25, why: "Share of sales kept as profit after every cost.",
          get: (c) => v(isNum(c.ttm.netMargin) ? c.ttm.netMargin : c.L.netMargin), prev: (c) => c.prevQ.ttmNetMargin, prevLabel: PQ },
        { id: "opMarginChange", label: "Operating margin change, year over year", fmt: "pts", lo: -0.03, hi: 0.03, why: "Whether profitability is widening or narrowing.",
          get: (c) => v(c.ttm.opMarginChange), prev: (c) => c.prevQ.ttmOpMarginChange, prevLabel: PQ },
        { id: "fcfMargin", label: "Free cash flow margin", fmt: "pct", lo: 0, hi: 0.25, why: "Spare cash produced per dollar of sales.",
          get: (c) => v(c.ttm.revenue > 0 && isNum(c.ttm.freeCashFlow) ? c.ttm.freeCashFlow / c.ttm.revenue : c.L.fcfMargin), prev: (c) => yb(c, 1).fcfMargin, prevLabel: PY },
        { id: "ocfGrowth", label: "Operating cash flow growth, latest year", fmt: "pct", lo: -0.10, hi: 0.25, why: "Whether the cash coming in from operations is growing.",
          get: (c) => profitGrowth(c.ocfGrowth, c.L.operatingCashFlow, yb(c, 1).operatingCashFlow, "Operating cash flow"),
          prev: (c) => growth(yb(c, 2).operatingCashFlow, yb(c, 1).operatingCashFlow), prevLabel: PY },
        { id: "fcfGrowth", label: "Free cash flow growth, latest year", fmt: "pct", lo: -0.15, hi: 0.25, why: "Whether spare cash is growing after investment.",
          get: (c) => profitGrowth(c.fcfGrowth, c.L.freeCashFlow, yb(c, 1).freeCashFlow, "Free cash flow"),
          prev: (c) => growth(yb(c, 2).freeCashFlow, yb(c, 1).freeCashFlow), prevLabel: PY },
      ],
    },
    {
      id: "quant", label: "Quantitative momentum", short: "Quantitative", weight: 25, source: "Daily prices", market: true,
      about: "How the share price and trading volume have behaved against a benchmark. Describes the past; it does not show who is buying.",
      factors: [
        // A. relative strength (35%)
        { id: "rel3m", label: "3-month return minus benchmark", fmt: "pts", lo: -0.15, hi: 0.15, w: 10, why: "Recent performance against the market.", get: (c, m) => v(m && m.q.relative3m, m ? null : NO_MARKET) },
        { id: "rel6m", label: "6-month return minus benchmark", fmt: "pts", lo: -0.20, hi: 0.20, w: 12, why: "Medium-term performance against the market.", get: (c, m) => v(m && m.q.relative6m, m ? null : NO_MARKET) },
        { id: "mom12m1", label: "12-minus-1-month momentum minus benchmark", fmt: "pts", lo: -0.30, hi: 0.30, w: 13, why: "The classic momentum measure, skipping the latest month.", get: (c, m) => v(m && m.q.relativeMomentum12m1, m ? null : NO_MARKET) },
        // B. trend (25%)
        { id: "vs200", label: "Price against its 200-day average", fmt: "pct", lo: -0.15, hi: 0.15, w: 9, why: "Whether the long-term trend is up or down.", get: (c, m) => v(m && m.q.priceVs200, m ? null : NO_MARKET) },
        { id: "ma50v200", label: "50-day average against 200-day average", fmt: "pct", lo: -0.10, hi: 0.10, w: 6, why: "Whether the medium-term trend is above the long-term one.", get: (c, m) => v(m && m.q.ma50Vs200, m ? null : NO_MARKET) },
        { id: "fromHigh", label: "Distance from 52-week high", fmt: "pct", lo: -0.35, hi: 0, w: 5, why: "How far the price has fallen from its best level of the year.", get: (c, m) => v(m && m.q.fromHigh52, m ? null : NO_MARKET) },
        { id: "above50", label: "Days above the 50-day average (last 63)", fmt: "pct0", lo: 0.2, hi: 0.9, w: 5, why: "How persistent the trend has been.", get: (c, m) => v(m && m.q.shareAbove50, m ? null : NO_MARKET) },
        // C. volume (25%)
        { id: "obv", label: "On-Balance Volume trend (63 days)", fmt: "ratio2", lo: -0.15, hi: 0.15, w: 9, why: "Whether more shares traded on up days than down days.", get: (c, m) => v(m && m.q.obvTrend, m ? null : NO_MARKET) },
        { id: "cmf", label: "Chaikin Money Flow (21 days)", fmt: "ratio2", lo: -0.15, hi: 0.15, w: 8, why: "Whether closes were near the day's high on heavy volume.", get: (c, m) => v(m && m.q.chaikin, m ? null : NO_MARKET) },
        { id: "updown", label: "Up-day volume ÷ down-day volume (63 days)", fmt: "ratio", lo: 0.7, hi: 1.5, w: 8, why: "A simple accumulation proxy.", get: (c, m) => v(m && m.q.upDownVolume, m ? null : NO_MARKET) },
        // D. risk-adjusted (15%)
        { id: "retRisk", label: "12-month return ÷ volatility", fmt: "ratio", lo: -0.5, hi: 2, w: 8, why: "Return earned per unit of price swings.", get: (c, m) => v(m && m.q.returnPerRisk, m ? null : NO_MARKET) },
        { id: "drawdown", label: "Largest fall in 12 months", fmt: "pct", lo: -0.45, hi: -0.08, w: 7, why: "The worst peak-to-trough drop a holder sat through.", get: (c, m) => v(m && m.q.maxDrawdown, m ? null : NO_MARKET) },
      ],
    },
    {
      id: "valuation", label: "Valuation", short: "Valuation", weight: 20, source: "Share price and SEC filings", market: true,
      about: "How the share price compares with sales, profit, cash flow and book value. Uses yields so that loss-making companies are still measurable.",
      factors: [
        { id: "earningsYield", label: "Earnings yield (EPS ÷ price)", fmt: "pct", lo: 0, hi: 0.08, w: 25, why: "The inverse of the P/E ratio. Higher means cheaper.", get: (c, m) => v(m && m.v.earningsYield, m ? null : NO_MARKET) },
        { id: "fcfYield", label: "Free cash flow yield", fmt: "pct", lo: 0, hi: 0.07, w: 25, why: "Free cash flow as a share of the company's market value.", get: (c, m) => v(m && m.v.fcfYield, m ? null : NO_MARKET) },
        { id: "ebitdaYield", label: "EBITDA ÷ enterprise value", fmt: "pct", lo: 0.02, hi: 0.12, w: 20, why: "The inverse of EV/EBITDA, which also counts debt.", get: (c, m) => v(m && m.v.ebitdaYield, m ? null : NO_MARKET) },
        { id: "priceToSales", label: "Price-to-sales", fmt: "ratio", lo: 12, hi: 1, w: 15, why: "Market value per dollar of sales. Lower is cheaper.", get: (c, m) => v(m && m.v.priceToSales, m ? null : NO_MARKET) },
        { id: "priceToBook", label: "Price-to-book", fmt: "ratio", lo: 15, hi: 1.5, w: 15, why: "Market value per dollar of shareholders' equity.",
          get: (c, m) => (!m ? v(null, NO_MARKET) : c.latest.equity <= 0 ? v(null, "Shareholder equity is negative, so price-to-book is not meaningful") : v(m.v.priceToBook)) },
      ],
    },
    {
      id: "earnings", label: "Earnings momentum", short: "Earnings", weight: 15, source: "SEC filings (quarterly)",
      about: "Whether profit growth is speeding up or slowing down. A company can still be growing while its growth rate falls.",
      factors: [
        { id: "epsQ", label: "EPS growth, latest quarter", fmt: "pct", lo: -0.10, hi: 0.30, prev: (c) => c.prevQ.epsGrowth, prevLabel: PQ, why: "Profit per share against the same quarter a year earlier.",
          get: (c) => (isNum(c.Q.epsGrowth) ? v(c.Q.epsGrowth) : isNum(c.Q.eps) && c.Q.eps <= 0 ? { value: null, score: 0, note: "The latest quarter was a loss" } : v(null, "The year-ago quarter was a loss, so a growth rate is not meaningful")) },
        { id: "epsAccel", label: "EPS growth acceleration", fmt: "pts", lo: -0.15, hi: 0.15, prev: (c) => (isNum(c.prevQ.epsGrowth) && isNum(c.prevQ2.epsGrowth) ? c.prevQ.epsGrowth - c.prevQ2.epsGrowth : null), prevLabel: PQ, why: "This quarter's EPS growth rate minus last quarter's.", get: (c) => v(c.momentum.epsAccel) },
        { id: "revAccel", label: "Revenue growth acceleration", fmt: "pts", lo: -0.05, hi: 0.05, prev: (c) => (isNum(c.prevQ.revenueGrowth) && isNum(c.prevQ2.revenueGrowth) ? c.prevQ.revenueGrowth - c.prevQ2.revenueGrowth : null), prevLabel: PQ, why: "This quarter's revenue growth rate minus last quarter's.", get: (c) => v(c.momentum.revenueAccel) },
        { id: "opAccel", label: "Operating income growth acceleration", fmt: "pts", lo: -0.15, hi: 0.15, prev: (c) => (isNum(c.prevQ.opIncomeGrowth) && isNum(c.prevQ2.opIncomeGrowth) ? c.prevQ.opIncomeGrowth - c.prevQ2.opIncomeGrowth : null), prevLabel: PQ, why: "This quarter's operating income growth rate minus last quarter's.", get: (c) => v(c.momentum.opIncomeAccel) },
        { id: "ttmEpsAccel", label: "Trailing-12-month EPS growth acceleration", fmt: "pts", lo: -0.10, hi: 0.10, prev: (c) => (isNum(c.prevQ.ttmEpsGrowth) && isNum(c.prevQ2.ttmEpsGrowth) ? c.prevQ.ttmEpsGrowth - c.prevQ2.ttmEpsGrowth : null), prevLabel: PQ, why: "A smoother version that is less affected by one unusual quarter.", get: (c) => v(c.momentum.ttmEpsAccel) },
        { id: "improving", label: "Quarters with a wider margin than a year earlier (last 4)", fmt: "pct0", lo: 0, hi: 1, why: "How many recent quarters showed improving profitability.", get: (c) => v(c.momentum.improvingQuarters) },
        { id: "epsUp", label: "Quarters with higher EPS than a year earlier (last 8)", fmt: "pct0", lo: 0.25, hi: 1, why: "Consistency of earnings improvement. Works for loss-making companies too.", get: (c) => v(c.momentum.epsUpShare) },
      ],
    },
    {
      id: "quality", label: "Financial quality", short: "Quality", weight: 15, source: "SEC filings",
      about: "Returns on capital, balance-sheet strength and whether reported profit is backed by cash.",
      factors: [
        { id: "roic", label: "Return on invested capital", fmt: "pct", lo: 0.05, hi: 0.25, prev: (c) => yb(c, 1).roic, prevLabel: PY, why: "Profit earned on all the capital in the business.", get: (c) => v(c.L.roic) },
        { id: "roa", label: "Return on assets", fmt: "pct", lo: 0, hi: 0.15, prev: (c) => yb(c, 1).roa, prevLabel: PY, why: "Profit earned on everything the company controls.", get: (c) => v(c.L.roa) },
        { id: "netDebtToEbitda", label: "Net debt ÷ EBITDA", fmt: "ratio", lo: 4, hi: 0, prev: (c) => yb(c, 1).netDebtToEbitda, prevLabel: PY, why: "Years of operating profit needed to clear net debt.",
          get: (c) => (!isNum(c.L.netDebt) ? v(null) : c.L.netDebt <= 0 ? { value: null, score: 100, note: "Holds more cash than debt" }
            : !isNum(c.L.ebitda) ? v(null) : c.L.ebitda <= 0 ? { value: null, score: 0, note: "EBITDA is negative while the company has net debt" } : v(c.L.netDebtToEbitda)) },
        { id: "interestCoverage", label: "Interest coverage", fmt: "ratio", lo: 1.5, hi: 12, prev: (c) => yb(c, 1).interestCoverage, prevLabel: PY, why: "How many times operating profit covers interest.",
          get: (c) => (c.L.debt === 0 || c.L.interestExpense === 0 ? { value: null, score: 100, note: "No debt or no interest expense" }
            : !isNum(c.L.interestExpense) || !isNum(c.L.ebit) ? v(null) : c.L.ebit <= 0 ? { value: c.L.interestCoverage, score: 0, note: "Operating profit is negative" } : v(c.L.interestCoverage)) },
        { id: "currentRatio", label: "Current ratio", fmt: "ratio", lo: 0.5, hi: 2, prev: (c) => yb(c, 1).currentRatio, prevLabel: PY, why: "Short-term assets against bills due within a year.", get: (c) => v(c.L.currentRatio) },
        { id: "debtToEquity", label: "Debt-to-equity", fmt: "ratio", lo: 2, hi: 0, prev: (c) => yb(c, 1).debtToEquity, prevLabel: PY, why: "Reliance on borrowed money.",
          get: (c) => (c.L.debt === 0 ? v(0) : isNum(c.L.equity) && c.L.equity <= 0 ? v(null, "Shareholder equity is negative, so debt-to-equity is not meaningful") : v(c.L.debtToEquity)) },
        { id: "fcfConsistency", label: "Years with positive free cash flow (last 5)", fmt: "pct0", lo: 0.4, hi: 1, why: "Dependability of cash generation.", get: (c) => v(c.fcfYears >= 3 ? c.fcfPositiveShare : null) },
        { id: "cashConversion", label: "Operating cash flow ÷ net income", fmt: "ratio", lo: 0.6, hi: 1.3, why: "Whether reported profit arrives as cash.", get: (c) => v(c.cashConversion, c.L.netIncome <= 0 ? "Net income is negative" : null) },
        { id: "accruals", label: "Accruals ÷ assets", fmt: "pct", lo: 0.10, hi: -0.05, why: "Profit not yet received in cash, relative to assets. Lower is better.", get: (c) => v(c.accruals) },
        { id: "dilution", label: "Share count change per year (3 years)", fmt: "pct", lo: 0.03, hi: -0.03, why: "Rising share counts dilute each owner's stake. Buybacks do the opposite.", get: (c) => v(c.dilution) },
        { id: "piotroski", label: "Piotroski F-Score (share of 9 tests passed)", fmt: "pct0", lo: 0.33, hi: 0.89,
          why: "Nine yes/no tests of profitability, balance sheet and efficiency. 8 or 9 of 9 is strong, 3 or fewer weak. Full list on the Financials tab.",
          get: (c) => (c.piotroski && isNum(c.piotroski.score) ? v(c.piotroski.share) : v(null, c.piotroski ? `Only ${c.piotroski.available} of the 9 tests can be calculated` : "Needs three fiscal years")) },
        { id: "marginStability", label: "Operating margin variability (5 years)", fmt: "pts", lo: 0.08, hi: 0.01, why: "How much the margin swings from year to year. Lower is steadier.", get: (c) => v(c.marginVolatility) },
      ],
    },
  ];

  const PRESETS = {
    Balanced: { fundamental: 25, quant: 25, valuation: 20, earnings: 15, quality: 15 },
    "Growth Investor": { fundamental: 35, quant: 20, valuation: 5, earnings: 30, quality: 10 },
    "Value Investor": { fundamental: 15, quant: 5, valuation: 45, earnings: 10, quality: 25 },
    "Quality Investor": { fundamental: 25, quant: 5, valuation: 15, earnings: 10, quality: 45 },
    "Momentum Investor": { fundamental: 10, quant: 50, valuation: 5, earnings: 30, quality: 5 },
    "Conservative Investor": { fundamental: 15, quant: 10, valuation: 25, earnings: 5, quality: 45 },
  };

  // Use the UNROUNDED score for grade boundaries.
  function grade(score) {
    if (!isNum(score)) return null;
    return score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : score >= 20 ? "D" : "F";
  }
  const GRADE_WORDS = { A: "Very strong", B: "Strong", C: "Neutral", D: "Weak", F: "Very weak" };

  function normalizeWeights(weights) {
    const ids = MODEL.map((c) => c.id);
    const clean = Object.fromEntries(ids.map((id) => [id, isNum(weights[id]) && weights[id] > 0 ? weights[id] : 0]));
    const total = ids.reduce((s, id) => s + clean[id], 0);
    return Object.fromEntries(ids.map((id) => [id, total ? (clean[id] / total) * 100 : 100 / ids.length]));
  }

  // Step 1: raw factor values for every company (needed for percentile ranks).
  function collect(companies, market) {
    const raw = {};
    for (const c of companies) {
      const m = market ? market[c.ticker] || null : null;
      raw[c.ticker] = {};
      for (const cat of MODEL) for (const f of cat.factors) raw[c.ticker][f.id] = f.get(c, m);
    }
    return raw;
  }

  // Step 2: score one company against the universe.
  function rateOne(company, raw, universe, weights, market) {
    const w = normalizeWeights(weights);
    const peers = universe.filter((c) => c.group === company.group && c.group !== "Other");
    const categories = MODEL.map((cat) => {
      const equal = 100 / cat.factors.length;
      const totalWeight = cat.factors.reduce((s, f) => s + (f.w || equal), 0);
      let covered = 0, sum = 0;
      const factors = cat.factors.map((f) => {
        const r = raw[company.ticker][f.id];
        const higher = f.hi > f.lo;
        const all = universe.map((c) => raw[c.ticker][f.id].value);
        const absolute = scale(r.value, f.lo, f.hi);
        const rank = percentile(r.value, all, higher);
        const score = isNum(r.score) ? r.score : !isNum(absolute) ? null : isNum(rank) ? (absolute + rank) / 2 : absolute;
        const fw = (f.w || equal) / totalWeight;
        if (isNum(score)) { covered += fw; sum += score * fw; }
        return {
          id: f.id, label: f.label, fmt: f.fmt, why: f.why, lo: f.lo, hi: f.hi, higher, weight: fw,
          previous: f.prev ? (isNum(f.prev(company, market ? market[company.ticker] || null : null)) ? f.prev(company, market ? market[company.ticker] || null : null) : null) : null,
          prevLabel: f.prevLabel || null,
          value: r.value, note: r.note || null, absolute, rank, score, grade: grade(score),
          peerMedian: peers.length >= 4 ? median(peers.map((p) => raw[p.ticker][f.id].value)) : null,
          universeMedian: median(all), sample: all.filter(isNum).length,
        };
      });
      const available = covered >= MIN_CATEGORY_COVERAGE;
      const score = available ? sum / covered : null;
      const reason = available ? null
        : cat.market && factors.every((f) => f.note === NO_MARKET) ? NO_MARKET + "."
        : `Only ${Math.round(covered * 100)}% of this category's measures could be calculated (70% needed).`;
      return { id: cat.id, label: cat.label, short: cat.short, about: cat.about, source: cat.source, weight: w[cat.id],
               coverage: covered, available, reason, score, grade: grade(score), factors };
    });

    const have = categories.filter((c) => c.available && c.weight > 0);
    const haveWeight = have.reduce((s, c) => s + c.weight, 0);
    const coverage = categories.reduce((s, c) => s + (c.weight / 100) * c.coverage, 0);
    const complete = categories.every((c) => c.available) && coverage >= MIN_OVERALL_COVERAGE;
    const overall = haveWeight > 0 ? have.reduce((s, c) => s + c.score * c.weight, 0) / haveWeight : null;
    // Each category's contribution to the overall score, in points.
    categories.forEach((c) => { c.contribution = c.available && haveWeight > 0 ? (c.score * c.weight) / haveWeight : null; });
    const result = {
      ticker: company.ticker, version: VERSION, overall, grade: grade(overall), complete, coverage,
      weightCovered: haveWeight, missing: categories.filter((c) => !c.available).map((c) => c.short), categories,
    };
    result.explanation = explain(company, result);
    return result;
  }

  // Deterministic, template-based explanation: the strongest and weakest factors, in words.
  function explain(company, result) {
    const all = result.categories.filter((c) => c.available).flatMap((c) => c.factors.filter((f) => isNum(f.score)).map((f) => ({ ...f, category: c.short })));
    const say = (f) => `${f.label}${isNum(f.value) ? " (" + format(f.value, f.fmt) + ")" : f.note ? " (" + f.note.toLowerCase() + ")" : ""}`;
    const positives = all.filter((f) => f.score >= 70).sort((a, b) => b.score - a.score).slice(0, 3);
    const negatives = all.filter((f) => f.score <= 35).sort((a, b) => a.score - b.score).slice(0, 3);
    const cats = result.categories.filter((c) => c.available).sort((a, b) => b.score - a.score);
    let summary = "";
    if (cats.length) {
      const best = cats[0], worst = cats[cats.length - 1];
      summary = `${company.name} scores highest on ${best.label.toLowerCase()} (${best.grade})`;
      summary += cats.length > 1 && worst.grade !== best.grade ? ` and lowest on ${worst.label.toLowerCase()} (${worst.grade}).` : ".";
      if (!result.complete) summary += ` This is a partial rating: ${result.missing.join(" and ")} ${result.missing.length > 1 ? "are" : "is"} not available.`;
    }
    return { summary, positives: positives.map(say), negatives: negatives.map(say) };
  }

  function format(value, kind) {
    if (kind === "pts") return (value >= 0 ? "+" : "−") + Math.abs(value * 100).toFixed(1) + " pts";
    if (kind === "ratio2") return (value < 0 ? "−" : "") + Math.abs(value).toFixed(2);
    return Calc.fmt(value, kind);
  }

  // Rate every company. market = { TICKER: { q: Quant.metrics(...), v: Calc.valuation(...) } } or null.
  function rateAll(companies, market = null, weights = PRESETS.Balanced) {
    const raw = collect(companies, market);
    const out = {};
    for (const c of companies) out[c.ticker] = rateOne(c, raw, companies, weights, market);
    return out;
  }

  // Compare two snapshots of one company: which categories moved, and by how much.
  function changes(previous, current) {
    if (!previous || !current) return null;
    const cats = Object.keys(current.categories || {}).map((id) => {
      const a = previous.categories ? previous.categories[id] : null, b = current.categories[id];
      return { id, from: a, to: b, delta: isNum(a) && isNum(b) ? b - a : null };
    });
    return { from: previous.overall, to: current.overall, delta: isNum(previous.overall) && isNum(current.overall) ? current.overall - previous.overall : null,
             fromGrade: grade(previous.overall), toGrade: grade(current.overall), categories: cats };
  }

  return { VERSION, MODEL, PRESETS, GRADE_WORDS, MIN_CATEGORY_COVERAGE, MIN_OVERALL_COVERAGE, NO_MARKET, grade, normalizeWeights, rateAll, changes, format };
})();

if (typeof module !== "undefined") module.exports = Ratings;
