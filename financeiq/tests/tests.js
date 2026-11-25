/* ============================================================
   FinanceIQ automated tests for js/calc.js, js/quant.js, js/ratings.js and js/screen.js.

   Run in a browser:   open tests/index.html (through a local web server)
   Run in a terminal:  see tests/run.sh  (uses the JavaScript engine built into macOS)

   Each test states an input and the answer worked out by hand.
   ============================================================ */

const Tests = (() => {
  const results = [];
  let group = "";

  const section = (name) => { group = name; };
  function test(name, fn) {
    try { fn(); results.push({ group, name, ok: true }); }
    catch (e) { results.push({ group, name, ok: false, error: String(e.message || e) }); }
  }
  const eq = (actual, expected) => {
    if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  };
  const near = (actual, expected, tolerance = 1e-9) => {
    if (typeof actual !== "number" || Math.abs(actual - expected) > tolerance) throw new Error(`expected about ${expected}, got ${actual}`);
  };
  const ok = (cond, msg) => { if (!cond) throw new Error(msg || "condition was false"); };

  // A small made-up company with round numbers, so every expected value can be checked by hand.
  function sample(overrides = {}) {
    const year = (fy, o = {}) => ({
      fy, end: `${fy}-12-31`, revenue: 1000, grossProfit: 400, operatingIncome: 200, pretaxIncome: 190, incomeTax: 38,
      netIncome: 152, interestExpense: 10, depreciation: 50, eps: 1.52, dilutedShares: 100,
      assets: 2000, currentAssets: 600, liabilities: 1200, currentLiabilities: 400, equity: 800, debt: 300, cash: 100,
      operatingCashFlow: 250, capex: 70, ...o,
    });
    const years = [
      year(2021, { revenue: 700, operatingIncome: 120, netIncome: 90, eps: 0.9 }),
      year(2022, { revenue: 800, operatingIncome: 150, netIncome: 110, eps: 1.1 }),
      year(2023, { revenue: 900, operatingIncome: 180, netIncome: 130, eps: 1.3 }),
      year(2024, { ...overrides }),
    ];
    return Calc.derive({ ticker: "TEST", name: "Test Co", group: "Other", years });
  }

  /* ---------------- helpers ---------------- */
  section("Basic helpers");
  test("div returns null instead of dividing by zero", () => { eq(Calc.div(5, 0), null); eq(Calc.div(null, 2), null); near(Calc.div(6, 4), 1.5); });
  test("growth: 100 -> 115 is 15%", () => near(Calc.growth(100, 115), 0.15));
  test("growth: a decline is negative", () => near(Calc.growth(200, 150), -0.25));
  test("growth from a zero or negative base is not meaningful", () => { eq(Calc.growth(0, 50), null); eq(Calc.growth(-10, 50), null); });
  test("CAGR: 100 -> 200 over 3 years is 26.0%", () => near(Calc.cagr(100, 200, 3), Math.pow(2, 1 / 3) - 1));
  test("CAGR: 100 -> 121 over 2 years is exactly 10%", () => near(Calc.cagr(100, 121, 2), 0.1));
  test("CAGR is null with a negative start, negative end or zero years", () => { eq(Calc.cagr(-5, 10, 3), null); eq(Calc.cagr(5, -10, 3), null); eq(Calc.cagr(5, 10, 0), null); });
  test("median of an odd and an even list", () => { eq(Calc.median([3, 1, 2]), 2); eq(Calc.median([4, 1, 3, 2]), 2.5); eq(Calc.median([]), null); });
  test("median ignores missing values", () => eq(Calc.median([1, null, 3, undefined]), 2));

  /* ---------------- ratios ---------------- */
  section("Financial ratios");
  const c = sample();
  test("gross, operating and net margin", () => { near(c.L.grossMargin, 0.4); near(c.L.opMargin, 0.2); near(c.L.netMargin, 0.152); });
  test("free cash flow = operating cash flow - capex = 250 - 70", () => eq(c.L.freeCashFlow, 180));
  test("free cash flow margin = 180 / 1000", () => near(c.L.fcfMargin, 0.18));
  test("cash conversion = FCF / net income = 180 / 152", () => near(c.L.fcfConversion, 180 / 152));
  test("tax rate = 38 / 190 = 20%", () => near(c.L.taxRate, 0.2));
  test("FCFF = FCF + interest x (1 - tax) = 180 + 10 x 0.8", () => near(c.L.fcff, 188));
  test("revenue growth 900 -> 1000 is 11.1%", () => near(c.L.growth, 1 / 9));
  test("3-year revenue CAGR 700 -> 1000", () => near(c.cagr3, Math.pow(1000 / 700, 1 / 3) - 1));
  test("net cash = cash - debt = -200; net debt = 200", () => { eq(c.L.netCash, -200); eq(c.L.netDebt, 200); });
  test("debt-to-equity = 300 / 800", () => near(c.L.debtToEquity, 0.375));
  test("current ratio = 600 / 400", () => near(c.L.currentRatio, 1.5));
  test("interest coverage = EBIT / interest = 200 / 10", () => near(c.L.interestCoverage, 20));
  test("EBITDA = EBIT + D&A = 250; net debt / EBITDA = 0.8", () => { eq(c.L.ebitda, 250); near(c.L.netDebtToEbitda, 0.8); });
  test("ROE = net income / average equity = 152 / 800", () => near(c.L.roe, 0.19));
  test("ROA = 152 / 2000; asset turnover = 1000 / 2000", () => { near(c.L.roa, 0.076); near(c.L.assetTurnover, 0.5); });
  test("ROIC = EBIT x (1 - tax) / (debt + equity) = 160 / 1100", () => { near(c.L.nopat, 160); near(c.L.roic, 160 / 1100); });
  test("ROIC uses the AVERAGE of opening and closing capital", () => {
    const d = sample({ debt: 500 });               // closing capital 1300, opening 1100, average 1200
    near(d.L.roic, 160 / 1200);
  });

  /* ---------------- awkward data ---------------- */
  section("Missing data, losses and negative equity");
  test("missing capex -> free cash flow is null, not zero", () => { const d = sample({ capex: null }); eq(d.L.freeCashFlow, null); eq(d.L.fcfMargin, null); });
  test("missing operating income is rebuilt as pre-tax income + interest and flagged", () => {
    const d = sample({ operatingIncome: null }); eq(d.L.ebit, 200); eq(d.L.ebitDerived, true);
  });
  test("missing interest expense -> no FCFF and no coverage ratio", () => { const d = sample({ interestExpense: null }); eq(d.L.fcff, null); eq(d.L.interestCoverage, null); });
  test("negative equity -> debt-to-equity is null (not a negative ratio)", () => eq(sample({ equity: -100 }).L.debtToEquity, null));
  test("a pre-tax loss -> statutory 21% tax rate is used and flagged", () => {
    const d = sample({ pretaxIncome: -50, incomeTax: -5 }); near(d.L.taxRate, 0.21); eq(d.L.taxRateAssumed, true);
  });
  test("an extreme tax rate is capped at 35%", () => near(sample({ incomeTax: 150 }).L.taxRate, 0.35));
  test("a net loss -> cash conversion is null", () => eq(sample({ netIncome: -20 }).L.fcfConversion, null));

  /* ---------------- scoring ---------------- */
  section("Score normalization");
  test("scale: lo scores 0, hi scores 100, midpoint 50", () => { eq(Calc.scale(0, 0, 0.3), 0); eq(Calc.scale(0.3, 0, 0.3), 100); near(Calc.scale(0.15, 0, 0.3), 50); });
  test("scale caps outliers at 0 and 100", () => { eq(Calc.scale(-5, 0, 0.3), 0); eq(Calc.scale(99, 0, 0.3), 100); });
  test("scale works for lower-is-better measures", () => { eq(Calc.scale(2, 2, 0), 0); eq(Calc.scale(0, 2, 0), 100); near(Calc.scale(0.5, 2, 0), 75); });
  test("scale of a missing value is null", () => eq(Calc.scale(null, 0, 1), null));
  test("every scoring measure has two different published levels", () => {
    Calc.SCORE_MODEL.forEach((cat) => cat.metrics.forEach((m) => ok(m.lo !== m.hi && typeof m.get === "function", m.id)));
  });
  test("default weights add up to 100 and there are 19 measures", () => {
    eq(Calc.SCORE_MODEL.reduce((s, cat) => s + cat.weight, 0), 100);
    eq(Calc.SCORE_MODEL.reduce((s, cat) => s + cat.metrics.length, 0), 19);
  });

  section("Weights");
  test("every preset adds up to 100", () => Object.values(Calc.PRESETS).forEach((w) => eq(Object.values(w).reduce((a, b) => a + b, 0), 100)));
  test("normalizeWeights rescales to 100", () => {
    const w = Calc.normalizeWeights({ growth: 50, profitability: 50, stability: 50, cashflow: 50, efficiency: 50 });
    near(w.growth, 20); near(Object.values(w).reduce((a, b) => a + b, 0), 100);
  });
  test("normalizeWeights: one category at 100, the rest at 0", () => { const w = Calc.normalizeWeights({ growth: 7 }); eq(w.growth, 100); eq(w.stability, 0); });
  test("normalizeWeights: all zero falls back to equal weights", () => near(Calc.normalizeWeights({}).growth, 20));
  test("normalizeWeights ignores negative and non-numeric weights", () => { const w = Calc.normalizeWeights({ growth: -5, profitability: "x", stability: 10 }); eq(w.stability, 100); eq(w.growth, 0); });
  test("overall score is the weighted average of category scores", () => {
    const r = Calc.scoreCompany(sample());
    const expected = r.categories.reduce((s, cat) => s + cat.score * cat.weight, 0) / 100;
    near(r.overall, expected, 1e-9);
  });
  test("putting all weight on one category makes overall = that category", () => {
    const r = Calc.scoreCompany(sample(), { stability: 100 });
    near(r.overall, r.categories.find((x) => x.id === "stability").score);
  });
  test("scores stay between 0 and 100", () => {
    const r = Calc.scoreCompany(sample({ revenue: 5000, netIncome: 4000, operatingIncome: 4500 }));
    r.categories.forEach((cat) => cat.metrics.forEach((m) => ok(m.score === null || (m.score >= 0 && m.score <= 100), m.id)));
  });

  section("Scoring with missing or unusual data");
  test("a missing measure is left out, not scored as zero", () => {
    const full = Calc.scoreCompany(sample()), part = Calc.scoreCompany(sample({ grossProfit: null }));
    const m = part.categories[1].metrics.find((x) => x.id === "grossMargin");
    eq(m.score, null); eq(part.coverage.used, full.coverage.used - 1);
    ok(part.categories[1].score !== null, "profitability should still be scored from the other measures");
  });
  test("negative equity: D/E and ROE are left out with a note, score still produced", () => {
    const r = Calc.scoreCompany(sample({ equity: -900 }));
    eq(r.categories[2].metrics.find((x) => x.id === "debtToEquity").score, null);
    eq(r.categories[1].metrics.find((x) => x.id === "roe").score, null);
    ok(r.notes.some((n) => n.includes("negative")), "expected a note about negative equity");
    ok(r.overall !== null);
  });
  test("a net loss scores 0 on net margin and EPS growth", () => {
    const r = Calc.scoreCompany(sample({ netIncome: -50, eps: -0.5 }));
    eq(r.categories[1].metrics.find((x) => x.id === "netMargin").score, 0);
    eq(r.categories[0].metrics.find((x) => x.id === "epsCagr3").score, 0);
  });
  test("no debt scores 100 on leverage measures", () => {
    const r = Calc.scoreCompany(sample({ debt: 0, interestExpense: 0 })), s = r.categories[2].metrics;
    eq(s.find((x) => x.id === "debtToEquity").score, 100); eq(s.find((x) => x.id === "interestCoverage").score, 100); eq(s.find((x) => x.id === "netDebtToEbitda").score, 100);
  });
  test("a category with fewer than two measures is not scored", () => {
    const r = Calc.scoreCompany(sample({ assets: null, debt: null }));   // removes ROA, turnover and ROIC
    eq(r.categories[4].score, null);
    ok(r.overall !== null, "overall still shown from the other four categories");
  });
  test("too little data -> no overall score, with an explanation", () => {
    const d = sample({ operatingCashFlow: null, capex: null, assets: null, debt: null, equity: null, currentAssets: null, interestExpense: null, cash: null });
    const r = Calc.scoreCompany(d);
    eq(r.overall, null); ok(r.notes.some((n) => n.includes("Overall score not shown")));
    eq(Calc.band(r.overall), "Not enough data");
  });
  test("rating bands", () => { eq(Calc.band(85), "Very strong"); eq(Calc.band(65), "Strong"); eq(Calc.band(50), "Mixed"); eq(Calc.band(35), "Weak"); eq(Calc.band(10), "Very weak"); });

  /* ---------------- DCF ---------------- */
  section("DCF projections and terminal value");
  const base = { fcf0: 100, growth: 0.10, years: 5, discount: 0.10, terminalGrowth: 0.02, cash: 50, debt: 200, shares: 10 };
  const r = Calc.dcf(base);
  test("year 1 cash flow = 100 x 1.10; year 5 = 100 x 1.10^5", () => { near(r.rows[0].fcf, 110); near(r.rows[4].fcf, 161.051, 1e-6); });
  test("discount factor in year 3 = 1 / 1.10^3", () => near(r.rows[2].factor, 1 / 1.331));
  test("when growth = discount rate, every year's present value equals the starting cash flow", () => {
    r.rows.forEach((row) => near(row.pv, 100, 1e-9)); near(r.sumPv, 500, 1e-9);
  });
  test("terminal value = 161.051 x 1.02 / (0.10 - 0.02) = 2053.40", () => near(r.terminalValue, 2053.40025, 1e-4));
  test("present value of terminal value = 2053.40 / 1.10^5 = 1275.00", () => near(r.pvTerminal, 1275, 1e-6));
  test("enterprise value = 500 + 1275 = 1775", () => near(r.enterpriseValue, 1775, 1e-6));
  section("Enterprise value to equity value");
  test("equity value = enterprise value - debt + cash = 1775 - 200 + 50", () => near(r.equityValue, 1625, 1e-6));
  test("value per share = 1625 / 10", () => near(r.perShare, 162.5, 1e-6));
  test("terminal value share of enterprise value = 1275 / 1775", () => near(r.terminalShare, 1275 / 1775, 1e-9));
  test("more debt lowers equity value dollar for dollar", () => near(Calc.dcf({ ...base, debt: 300 }).equityValue, 1525, 1e-6));
  test("a higher discount rate lowers the value", () => ok(Calc.dcf({ ...base, discount: 0.12 }).perShare < r.perShare));
  test("a higher terminal growth rate raises the value", () => ok(Calc.dcf({ ...base, terminalGrowth: 0.03 }).perShare > r.perShare));
  test("a 10-year projection has 10 rows", () => eq(Calc.dcf({ ...base, years: 10 }).rows.length, 10));
  test("upside: estimate 162.5 vs price 130 is +25%", () => near(Calc.upside(162.5, 130), 0.25));
  test("upside is null without a price", () => { eq(Calc.upside(162.5, null), null); eq(Calc.upside(162.5, 0), null); });

  section("DCF input validation");
  const bad = (o, word) => { const x = Calc.dcf({ ...base, ...o }); eq(x.valid, false); ok(x.errors.some((e) => e.toLowerCase().includes(word)), "expected an error mentioning " + word + ": " + x.errors.join("; ")); };
  test("discount rate equal to terminal growth is rejected", () => bad({ discount: 0.02 }, "terminal growth"));
  test("discount rate below terminal growth is rejected", () => bad({ discount: 0.01 }, "terminal growth"));
  test("projection shorter than 5 or longer than 10 years is rejected", () => { bad({ years: 4 }, "5 to 10"); bad({ years: 11 }, "5 to 10"); });
  test("a fractional number of years is rejected", () => bad({ years: 7.5 }, "whole number"));
  test("zero or negative shares are rejected", () => { bad({ shares: 0 }, "shares"); bad({ shares: -5 }, "shares"); });
  test("text or blank input is rejected", () => { bad({ fcf0: NaN }, "fcf0"); bad({ discount: "abc" }, "discount"); bad({ cash: undefined }, "cash"); });
  test("negative cash or debt is rejected", () => bad({ debt: -1 }, "negative"));
  test("growth of -100% or worse is rejected", () => bad({ growth: -1 }, "growth"));
  test("a zero discount rate is rejected", () => bad({ discount: 0, terminalGrowth: -0.01 }, "above 0"));

  section("Sensitivity analysis");
  const grid = Calc.sensitivity(base, [0.08, 0.10, 0.12], [0.03, 0.02, 0.01]);
  test("matrix has one row per terminal growth and one column per discount rate", () => { eq(grid.length, 3); eq(grid[0].length, 3); });
  test("the centre cell equals the base case", () => near(grid[1][1], r.perShare, 1e-9));
  test("values fall as the discount rate rises (left to right)", () => grid.forEach((row) => ok(row[0] > row[1] && row[1] > row[2])));
  test("values fall as terminal growth falls (top to bottom)", () => ok(grid[0][1] > grid[1][1] && grid[1][1] > grid[2][1]));
  test("an impossible cell (discount <= terminal growth) is null, not a number", () => eq(Calc.sensitivity(base, [0.02, 0.10], [0.03])[0][0], null));

  section("DCF defaults");
  test("defaults use FCFF, latest cash, debt and shares", () => {
    const d = Calc.dcfDefaults(c); near(d.fcf0, 188); eq(d.usesFcff, true); eq(d.cash, 100); eq(d.debt, 300); eq(d.shares, 100); eq(d.years, 5);
  });
  test("without interest expense the defaults fall back to plain free cash flow and say so", () => {
    const d = Calc.dcfDefaults(sample({ interestExpense: null })); eq(d.fcf0, 180); eq(d.usesFcff, false);
  });
  test("base growth is the 3-year revenue CAGR capped at 12%; bear and bull are 4 points either side", () => {
    const d = Calc.dcfDefaults(c);     // CAGR 700 -> 1000 is 12.6%, so it is capped
    near(d.scenarios.base.growth, 0.12); near(d.scenarios.bear.growth, 0.08); near(d.scenarios.bull.growth, 0.16);
  });
  test("every default scenario is a valid model", () => {
    const d = Calc.dcfDefaults(c);
    Object.values(d.scenarios).forEach((s) => eq(Calc.dcf({ fcf0: d.fcf0, years: d.years, cash: d.cash, debt: d.debt, shares: d.shares, ...s }).valid, true));
  });

  /* ---------------- peers ---------------- */
  section("Peer statistics");
  test("rank 1 is the best when higher is better", () => { const s = Calc.peerStats(9, [1, 3, 5, 7, 9]); eq(s.rank, 1); eq(s.of, 5); eq(s.median, 5); eq(s.percentile, 100); });
  test("rank 1 is the lowest when lower is better", () => eq(Calc.peerStats(1, [1, 3, 5, 7, 9], false).rank, 1));
  test("no rank with fewer than four peers", () => eq(Calc.peerStats(2, [1, 2, 3]).rank, null));
  test("no rank when the company's own value is missing", () => eq(Calc.peerStats(null, [1, 2, 3, 4, 5]).rank, null));

  /* ---------------- formatting ---------------- */
  section("Units and number formatting");
  test("dollars to billions", () => eq(Calc.money(478834000000), "$478.8B"));
  test("dollars to millions", () => eq(Calc.money(774000000), "$774M"));
  test("dollars to trillions", () => eq(Calc.money(2680000000000), "$2.68T"));
  test("negative amounts use a minus sign before the dollar sign", () => eq(Calc.money(-2722000000), "−$2.7B"));
  test("missing values show as n/a", () => { eq(Calc.money(null), "n/a"); eq(Calc.pct(undefined), "n/a"); eq(Calc.ratio(NaN), "n/a"); });
  test("fractions to percentages", () => { eq(Calc.pct(0.2761), "27.6%"); eq(Calc.pct(-0.005), "−0.5%"); eq(Calc.pct(0.5, 0), "50%"); });
  test("ratios, per-share amounts and share counts", () => { eq(Calc.ratio(0.714), "0.71×"); eq(Calc.perShare(8.98), "$8.98"); eq(Calc.shares(14720300000), "14.72B"); eq(Calc.shares(716000000), "716M"); });
  test("fmt picks the right formatter", () => { eq(Calc.fmt(0.1, "pct"), "10.0%"); eq(Calc.fmt(1e9, "money"), "$1.0B"); eq(Calc.fmt(2, "ratio"), "2.00×"); });

  const last = (arr) => arr[arr.length - 1];

  /* ================= version 3: quarterly data, ratings, market indicators ================= */

  // A made-up company with 13 quarters. Revenue is 100 for the first year and then grows by 10 each
  // quarter over the year before; EPS is 1.00 for a year, then 1.10, 1.21, 1.32, 1.50 ...
  function sampleQ(over = {}) {
    const c = sample();
    const rev = [100, 100, 100, 100, 110, 110, 110, 110, 120, 125, 130, 140, 150];
    const eps = [1, 1, 1, 1, 1.1, 1.1, 1.1, 1.1, 1.21, 1.32, 1.43, 1.65, 2.2];
    c.quarters = rev.map((r, i) => ({ end: `Q${i}`, revenue: r, operatingIncome: r * 0.2, netIncome: eps[i] * 10, eps: eps[i], grossProfit: r * 0.4, dilutedShares: 10 }));
    Object.assign(c.quarters[12], over);
    c.latest = { end: "Q12", debt: 300, cash: 100, equity: 800, assets: 2000, dilutedShares: 10, ttmOperatingCashFlow: 130, ttmCapex: 30 };
    Calc.deriveQuarters(c);
    return c;
  }

  section("Quarterly and trailing-twelve-month figures");
  const q = sampleQ();
  test("TTM revenue = sum of the last four quarters = 125 + 130 + 140 + 150", () => eq(q.ttm.revenue, 545));
  test("TTM EPS = 1.32 + 1.43 + 1.65 + 2.20", () => near(q.ttm.eps, 6.6, 1e-9));
  test("TTM free cash flow = TTM operating cash flow - TTM capex = 130 - 30", () => eq(q.ttm.freeCashFlow, 100));
  test("quarterly revenue growth compares with the same quarter a year earlier: 150 vs 120", () => near(q.Q.revenueGrowth, 0.25));
  test("TTM revenue growth: 545 vs 450 a year earlier (110 + 110 + 110 + 120)", () => near(q.ttm.revenueGrowth, 545 / 450 - 1));
  test("the first four quarters have no year-over-year growth (nothing to compare with)", () => eq(q.quarters[3].revenueGrowth, null));
  test("operating margin change is in percentage points and is zero when the margin is constant", () => near(q.Q.opMarginChange, 0, 1e-12));

  section("Earnings growth and acceleration");
  test("EPS growth latest quarter: 2.20 vs 1.21 = +81.8%", () => near(q.Q.epsGrowth, 2.2 / 1.21 - 1));
  test("EPS acceleration = this quarter's growth minus last quarter's: 81.8% - 50.0% = +31.8 points", () => near(q.momentum.epsAccel, (2.2 / 1.21 - 1) - (1.65 / 1.1 - 1)));
  test("revenue acceleration: 25.0% - 27.3% = -2.3 points (still growing, but more slowly)", () => { near(q.momentum.revenueAccel, 0.25 - (140 / 110 - 1)); ok(q.momentum.revenueAccel < 0 && q.Q.revenueGrowth > 0); });
  test("EPS higher than a year earlier in 8 of the last 8 quarters", () => { eq(q.momentum.epsUpCount, 8); eq(q.momentum.epsUpShare, 1); });
  test("a loss a year ago gives no growth percentage (not a misleading one)", () => {
    const c = sampleQ(); c.quarters[8].eps = -0.5; Calc.deriveQuarters(c);
    eq(c.Q.epsGrowth, null); eq(c.Q.epsUp, true);     // still counted as an improvement
    eq(c.momentum.epsAccel, null);
  });
  test("a loss this quarter after a profit is a decline, measured normally", () => near(sampleQ({ eps: -1.21 }).Q.epsGrowth, -2));
  test("with fewer than five quarters nothing is calculated and nothing crashes", () => {
    const c = sample(); c.quarters = [{ end: "Q0", revenue: 1, eps: 1, netIncome: 1, operatingIncome: 1 }]; c.latest = {}; Calc.deriveQuarters(c);
    eq(c.ttm.revenue, null); eq(c.momentum.epsAccel, null); eq(c.momentum.epsUpShare, null);
  });

  section("Quality measures");
  test("accruals = (net income - operating cash flow) / average assets = (152 - 250) / 2000", () => near(q.accruals, -0.049));
  test("cash conversion = operating cash flow / net income = 250 / 152", () => near(q.cashConversion, 250 / 152));
  test("share count unchanged over three years = 0% dilution", () => near(q.dilution, 0));
  test("a rising share count shows as positive dilution", () => { const c = sample(); c.years[0].dilutedShares = 80; Calc.deriveQuarters(Object.assign(c, { quarters: [], latest: {} })); ok(c.dilution > 0.07 && c.dilution < 0.08); });

  section("Valuation multiples");
  const val = Calc.valuation(q, 66);
  test("market value = price x shares = 66 x 10", () => eq(val.marketCap, 660));
  test("enterprise value = market value + debt - cash = 660 + 300 - 100", () => eq(val.enterpriseValue, 860));
  test("P/E = price / TTM EPS = 66 / 6.6 = 10; earnings yield is its inverse, 10%", () => { near(val.pe, 10); near(val.earningsYield, 0.1); });
  test("price-to-sales = 660 / 545; price-to-book = 660 / 800", () => { near(val.priceToSales, 660 / 545); near(val.priceToBook, 0.825); });
  test("free cash flow yield = 100 / 660", () => near(val.fcfYield, 100 / 660));
  test("EV/EBITDA uses TTM operating income + annual depreciation: 860 / (109 + 50)", () => near(val.evToEbitda, 860 / 159));
  test("negative earnings: P/E is not shown, but earnings yield is (and is negative)", () => {
    const c = sampleQ(); c.quarters.slice(-4).forEach((x) => { x.eps = -1; }); Calc.deriveQuarters(c);
    const x = Calc.valuation(c, 50); eq(x.pe, null); near(x.earningsYield, -0.08);
  });
  test("negative equity: price-to-book is not shown", () => { const c = sampleQ(); c.latest.equity = -50; eq(Calc.valuation(c, 50).priceToBook, null); });
  test("no price, or a zero price, gives no valuation at all", () => { eq(Calc.valuation(q, null), null); eq(Calc.valuation(q, 0), null); });

  section("Advanced DCF");
  test("fade: growth slides from 10% in year 1 to the terminal 2% in year 5", () => {
    const r2 = Calc.dcf({ ...base, fade: true });
    near(r2.rows[0].growth, 0.10); near(r2.rows[2].growth, 0.06); near(r2.rows[4].growth, 0.02);
    ok(r2.perShare < r.perShare, "fading growth must give a lower value than constant growth");
  });
  test("reverse DCF recovers the growth rate that was put in", () => {
    const { fcf0, years, discount, terminalGrowth, cash, debt, shares } = base;
    const found = Calc.reverseDcf({ fcf0, years, discount, terminalGrowth, cash, debt, shares }, r.perShare);
    near(found.growth, 0.10, 1e-6); eq(found.bounded, null);
  });
  test("reverse DCF: a higher price implies higher growth", () => ok(Calc.reverseDcf(base, 300).growth > Calc.reverseDcf(base, 100).growth));
  test("reverse DCF is not attempted with negative cash flow or no price", () => { eq(Calc.reverseDcf({ ...base, fcf0: -5 }, 100), null); eq(Calc.reverseDcf(base, 0), null); });
  test("reverse DCF reports when the price is outside the range it can explain", () => eq(Calc.reverseDcf(base, 1e9).bounded, "above"));
  test("WACC: 80% equity at 9.5% and 20% debt at 5% before 20% tax = 8.4%", () => {
    const w = Calc.wacc({ riskFree: 0.04, beta: 1.1, equityPremium: 0.05, costOfDebt: 0.05, taxRate: 0.2, equityValue: 800, debtValue: 200 });
    near(w.costOfEquity, 0.095); near(w.wacc, 0.8 * 0.095 + 0.2 * 0.05 * 0.8);
  });
  test("WACC with missing inputs is null", () => eq(Calc.wacc({ riskFree: 0.04 }), null));

  section("Percentiles");
  const ten = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  test("the highest of ten values is at the 95th percentile, the lowest at the 5th", () => { eq(Calc.percentile(10, ten), 95); eq(Calc.percentile(1, ten), 5); });
  test("for a lower-is-better measure the order is reversed", () => eq(Calc.percentile(1, ten, false), 95));
  test("tied values share the same percentile", () => eq(Calc.percentile(5, [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), 50));
  test("no percentile from fewer than ten companies, or for a missing value", () => { eq(Calc.percentile(3, [1, 2, 3, 4]), null); eq(Calc.percentile(null, ten), null); });
  test("missing values in the group are ignored, not ranked last", () => eq(Calc.percentile(10, [...ten, null, undefined]), 95));

  section("Moving averages and returns");
  const up = Array.from({ length: 300 }, (_, i) => 100 * Math.pow(1.001, i));       // +0.1% every day
  const flatVol = up.map(() => 1000);
  test("simple moving average of 1..5 over 3 days is 4", () => eq(Quant.sma([1, 2, 3, 4, 5], 3), 4));
  test("moving average needs enough history", () => eq(Quant.sma([1, 2], 3), null));
  test("21-day return on a steady +0.1% a day series = 1.001^21 - 1", () => near(Quant.periodReturn(up, 21), Math.pow(1.001, 21) - 1, 1e-12));
  test("12-minus-1 momentum skips the latest month: 1.001^231 - 1", () => near(Quant.momentum12m1(up), Math.pow(1.001, 231) - 1, 1e-12));
  test("a return over a period longer than the history is null", () => eq(Quant.periodReturn([1, 2, 3], 5), null));
  const mUp = Quant.metrics({ close: up, volume: flatVol }, { close: up.map((x) => x / 2) });
  test("a rising series is above its 50- and 200-day averages, with the 50 above the 200", () => ok(mUp.priceVs50 > 0 && mUp.priceVs200 > mUp.priceVs50 && mUp.ma50Vs200 > 0));
  test("a series at its high is 0% from its 52-week high and above its 50-day average every day", () => { near(mUp.fromHigh52, 0, 1e-12); eq(mUp.shareAbove50, 1); });

  section("Relative strength");
  test("a stock that moves exactly like the benchmark has zero relative strength", () => { near(mUp.relative3m, 0, 1e-12); near(mUp.relative6m, 0, 1e-12); near(mUp.relativeMomentum12m1, 0, 1e-12); });
  test("relative strength = stock return minus benchmark return", () => {
    const flat = up.map(() => 50), m = Quant.metrics({ close: up, volume: flatVol }, { close: flat });
    near(m.relative6m, Math.pow(1.001, 126) - 1, 1e-12);
  });
  test("with less than a year of prices the 12-month measures are null, the 3-month ones are not", () => {
    const m = Quant.metrics({ close: up.slice(0, 100), volume: flatVol.slice(0, 100) }, { close: up.slice(0, 100) });
    eq(m.return12m, null); eq(m.momentum12m1, null); eq(m.ma200, null); ok(m.return3m !== null);
  });

  section("Volume indicators");
  const zig = [10, 11, 10, 11, 10, 11], zigVol = [0, 100, 50, 100, 50, 100];
  test("On-Balance Volume adds volume on up days and subtracts it on down days", () => eq(Quant.obv(zig, zigVol).join(","), "0,100,50,150,100,200"));
  test("OBV ignores days when the price did not change", () => eq(Quant.obv([5, 5, 6], [9, 9, 9]).join(","), "0,0,9"));
  test("OBV trend on an always-rising series is +1 (every share traded on an up day)", () => near(mUp.obvTrend, 1, 1e-12));
  test("up/down volume ratio: 300 on up days, 100 on down days", () => eq(Quant.upDownVolume(zig, zigVol, 5), 3));
  test("up/down volume is null when there were no down days", () => eq(mUp.upDownVolume, null));
  test("Chaikin Money Flow is +1 when every close is at the day's high, -1 at the low", () => {
    eq(Quant.chaikinMoneyFlow([2, 2], [1, 1], [2, 2], [10, 10], 2), 1); eq(Quant.chaikinMoneyFlow([2, 2], [1, 1], [1, 1], [10, 10], 2), -1);
  });
  test("Chaikin Money Flow treats a day with no range as neutral instead of dividing by zero", () => eq(Quant.chaikinMoneyFlow([2, 3], [2, 1], [2, 2], [10, 10], 2), 0));
  test("relative volume: latest month at double the earlier average is 2.0", () => eq(Quant.relativeVolume([...Array(63).fill(100), ...Array(21).fill(200)]), 2));

  section("Risk measures");
  test("a perfectly steady series has zero volatility and no drawdown", () => { near(mUp.volatility, 0, 1e-9); eq(mUp.maxDrawdown, 0); });
  test("maximum drawdown: 100 -> 120 -> 90 -> 130 is a fall of 25% from the peak", () => near(Quant.maxDrawdown([100, 120, 90, 130], 3), -0.25));
  test("volatility = standard deviation of daily returns x sqrt(252)", () => {
    const c2 = [100, 110, 99, 108.9];                           // returns +10%, -10%, +10%
    near(Quant.volatility(c2, 3), Quant.stdev([0.1, -0.1, 0.1]) * Math.sqrt(252), 1e-9);
  });
  test("a stock that moves twice as much as the benchmark each day has a beta of 2", () => {
    const b = [100], s2 = [100];
    [0.01, -0.02, 0.015, -0.005, 0.02].forEach((x) => { b.push(last(b) * (1 + x)); s2.push(last(s2) * (1 + 2 * x)); });
    near(Quant.beta(s2, b, 5), 2, 1e-9);
  });
  test("downside volatility counts only falling days, so it is below total volatility here", () => {
    const c2 = [100, 110, 99, 108.9]; ok(Quant.downsideVolatility(c2, 3) < Quant.volatility(c2, 3) && Quant.downsideVolatility(c2, 3) > 0);
  });

  section("Stock rating: grades and weights");
  test("grade boundaries use the unrounded score: 79.99 is B, 80 is A", () => { eq(Ratings.grade(79.99), "B"); eq(Ratings.grade(80), "A"); eq(Ratings.grade(59.999), "C"); eq(Ratings.grade(60), "B"); });
  test("grade boundaries at 40 and 20, and the ends of the scale", () => { eq(Ratings.grade(40), "C"); eq(Ratings.grade(39.9), "D"); eq(Ratings.grade(20), "D"); eq(Ratings.grade(19.9), "F"); eq(Ratings.grade(0), "F"); eq(Ratings.grade(100), "A"); });
  test("no score means no grade", () => eq(Ratings.grade(null), null));
  test("default category weights are 25 / 25 / 20 / 15 / 15", () => eq(Ratings.MODEL.map((c) => c.weight).join("/"), "25/25/20/15/15"));
  test("all six presets add up to 100", () => Object.values(Ratings.PRESETS).forEach((w) => eq(Object.values(w).reduce((a, b) => a + b, 0), 100)));
  test("within the Quantitative category the four groups weigh 35 / 25 / 25 / 15", () => {
    const f = Ratings.MODEL.find((c) => c.id === "quant").factors, w = (ids) => ids.reduce((s2, id) => s2 + f.find((x) => x.id === id).w, 0);
    eq(w(["rel3m", "rel6m", "mom12m1"]), 35); eq(w(["vs200", "ma50v200", "fromHigh", "above50"]), 25); eq(w(["obv", "cmf", "updown"]), 25); eq(w(["retRisk", "drawdown"]), 15);
  });

  // A universe of twelve copies of the sample company with different growth, for ranking.
  const universe = Array.from({ length: 12 }, (_, i) => { const c = sampleQ(); c.ticker = "T" + i; c.name = "Co " + i; c.cagr3 = 0.02 * i; return c; });
  const rated = Ratings.rateAll(universe);
  section("Stock rating: scoring");
  test("without market data, Quantitative and Valuation are unavailable and say why", () => {
    const cats = Object.fromEntries(rated.T5.categories.map((c) => [c.id, c]));
    eq(cats.quant.available, false); eq(cats.valuation.available, false); ok(cats.quant.reason.includes("share prices"));
    eq(cats.quant.score, null); eq(cats.quant.grade, null);
  });
  test("a rating with a missing category is marked partial, and lists what is missing", () => { eq(rated.T5.complete, false); eq(rated.T5.missing.join(","), "Quantitative,Valuation"); });
  test("a partial score is the weighted average of the available categories only", () => {
    const r5 = rated.T5, a = r5.categories.filter((c) => c.available);
    near(r5.overall, a.reduce((s2, c) => s2 + c.score * c.weight, 0) / a.reduce((s2, c) => s2 + c.weight, 0), 1e-9);
    near(r5.weightCovered, 55);
  });
  test("category contributions add up to the overall score", () => near(rated.T5.categories.reduce((s2, c) => s2 + (c.contribution || 0), 0), rated.T5.overall, 1e-9));
  test("factor score = average of the absolute score and the percentile rank", () => {
    const f = rated.T11.categories[0].factors.find((x) => x.id === "rev3");
    near(f.absolute, 100); near(f.rank, (11 + 0.5) / 12 * 100); near(f.score, (f.absolute + f.rank) / 2);
  });
  test("a higher value of a higher-is-better factor never scores lower", () => {
    const s3 = universe.map((c) => rated[c.ticker].categories[0].factors.find((x) => x.id === "rev3").score);
    for (let i = 1; i < s3.length; i++) ok(s3[i] >= s3[i - 1]);
  });
  test("with fewer than ten companies only the absolute score is used", () => {
    const small = Ratings.rateAll(universe.slice(0, 5)), f = small.T4.categories[0].factors.find((x) => x.id === "rev3");
    eq(f.rank, null); near(f.score, f.absolute);
  });
  test("a missing factor is left out and lowers coverage, not the score", () => {
    const u2 = universe.map((c) => Object.assign(Object.create(Object.getPrototypeOf(c)), c)); u2[3] = { ...u2[3], cagr3: null, cagr5: null };
    const cat = Ratings.rateAll(u2).T3.categories[0];
    eq(cat.factors.find((x) => x.id === "rev3").score, null); ok(cat.coverage < 1 && cat.available);
  });
  test("a category below 70% coverage is not graded", () => {
    const u2 = [...universe]; const c = sampleQ(); c.ticker = "T3"; c.quarters = c.quarters.slice(-3); c.latest = {}; Calc.deriveQuarters(c); u2[3] = c;
    const cat = Ratings.rateAll(u2).T3.categories.find((x) => x.id === "earnings");
    eq(cat.available, false); eq(cat.grade, null); ok(cat.reason.includes("70%"));
  });
  test("with full market data all five categories are graded and the rating is complete", () => {
    const market = Object.fromEntries(universe.map((c, i) => [c.ticker, { q: Quant.metrics({ close: up.map((x, d) => x * (1 + 0.0002 * i * d)), high: up.map((x) => x * 1.01), low: up.map((x) => x * 0.99), volume: flatVol.map((x2, d) => x2 + (d % 7) * 10 * (i + 1)) }, { close: up }), v: Calc.valuation(c, 40 + i * 5) }]));
    const full = Ratings.rateAll(universe, market).T6;
    eq(full.complete, true); eq(full.missing.length, 0); ok(full.categories.every((c) => c.available && c.grade)); near(full.weightCovered, 100);
  });
  test("custom weights change the overall score but not the category scores", () => {
    const heavy = Ratings.rateAll(universe, null, { quality: 100 }).T5;
    near(heavy.overall, heavy.categories.find((c) => c.id === "quality").score); near(heavy.categories[0].score, rated.T5.categories[0].score);
  });
  test("the explanation names the best and worst category and says how many categories the rating covers", () => ok(/scores highest on/.test(rated.T5.explanation.summary) && /covers 3 of 5 categories/.test(rated.T5.explanation.summary)));
  test("scoring is reproducible: the same input gives the same output", () => eq(JSON.stringify(Ratings.rateAll(universe).T7), JSON.stringify(rated.T7)));

  section("Rating snapshots");
  test("a change between two snapshots is reported by category", () => {
    const ch = Ratings.changes({ overall: 58, categories: { fundamental: 70, quality: 40 } }, { overall: 62, categories: { fundamental: 70, quality: 50 } });
    eq(ch.delta, 4); eq(ch.fromGrade, "C"); eq(ch.toGrade, "B"); eq(ch.categories.find((c) => c.id === "quality").delta, 10); eq(ch.categories.find((c) => c.id === "fundamental").delta, 0);
  });
  test("with no earlier snapshot there is no change to report (none is invented)", () => eq(Ratings.changes(null, { overall: 62, categories: {} }), null));
  test("a category that was unavailable before has no numeric change", () => eq(Ratings.changes({ overall: 50, categories: { quant: null } }, { overall: 55, categories: { quant: 70 } }).categories[0].delta, null));

  section("Piotroski F-Score");
  test("the sample company passes 6 of the 9 tests", () => {
    // passes: positive ROA, positive cash flow, ROA up (152/2000 vs 130/2000), cash flow > profit, no new shares, turnover up
    // fails: leverage unchanged, current ratio unchanged, gross margin down (40.0% vs 44.4%)
    const f = Calc.piotroski(sample()); eq(f.score, 6); eq(f.available, 9);
    eq(f.tests.filter((t) => t.pass === false).map((t) => t.label).join(" | "), "Debt fell relative to assets | Current ratio improved | Gross margin improved");
  });
  test("a net loss fails the first test, and cash flow above a loss passes the cash-backing test", () => {
    const f = Calc.piotroski(sample({ netIncome: -50 })); eq(f.tests[0].pass, false); eq(f.tests[3].pass, true);
  });
  test("a share count rise above 0.5% fails the no-new-shares test; 0.4% does not", () => {
    eq(Calc.piotroski(sample({ dilutedShares: 101 })).tests[6].pass, false); eq(Calc.piotroski(sample({ dilutedShares: 100.4 })).tests[6].pass, true);
  });
  test("with two tests missing there is no score, rather than a score out of fewer tests", () => {
    const f = Calc.piotroski(sample({ grossProfit: null, currentAssets: null })); eq(f.score, null); eq(f.available, 7);
  });
  test("with one test missing the score is out of the 8 that could be calculated", () => {
    const f = Calc.piotroski(sample({ grossProfit: null })); eq(f.available, 8); near(f.share, f.score / 8);
  });
  test("fewer than three fiscal years gives no score", () => { const c = sample(); c.years = c.years.slice(-2); Calc.derive(c); eq(c.piotroski, null); });

  section("Rating measures added in methodology 1.1");
  test("methodology version is 1.1", () => eq(Ratings.VERSION, "1.1"));
  test("Fundamentals has 16 measures, Earnings 7, Quality 12", () => eq(Ratings.MODEL.map((c) => c.factors.length).join(","), "16,12,5,7,12"));
  test("TTM gross profit growth and net margin are calculated", () => { near(q.ttm.grossProfitGrowth, 545 / 450 - 1); near(q.ttm.netMargin, 66 / 545); });
  test("net income growth with a loss a year earlier is left out, with a reason", () => {
    const c = sampleQ(); c.quarters[8].netIncome = -5; Calc.deriveQuarters(c);
    const f = Ratings.rateAll([c]).TEST.categories[0].factors.find((x) => x.id === "niQ");
    eq(f.score, null); ok(/negative a year earlier/.test(f.note));
  });
  test("a loss this quarter scores 0 on net income growth", () => {
    const f = Ratings.rateAll([sampleQ({ netIncome: -5 })]).TEST.categories[0].factors.find((x) => x.id === "niQ"); eq(f.score, 0);
  });
  test("each measure shows the previous comparable value where one exists", () => {
    const cat = rated.T5.categories[0];
    near(cat.factors.find((x) => x.id === "revQ").previous, 140 / 110 - 1); eq(cat.factors.find((x) => x.id === "revQ").prevLabel, "previous quarter");
    near(rated.T5.categories[4].factors.find((x) => x.id === "roic").previous, universe[5].years[2].roic);
    eq(cat.factors.find((x) => x.id === "growthYears").previous, null);
  });
  test("previous EPS acceleration = last quarter's growth minus the quarter before's", () => {
    near(rated.T5.categories[3].factors.find((x) => x.id === "epsAccel").previous, (1.65 / 1.1 - 1) - (1.43 / 1.1 - 1));
  });

  section("Personal price connection: parsing");
  test("Twelve Data rows are read and put oldest first", () => {
    const r = Market.parseTwelveData({ values: [{ datetime: "2026-11-24", open: "2", high: "3", low: "1", close: "2.5", volume: "100" }, { datetime: "2026-11-21", open: "1", high: "2", low: "1", close: "1.5", volume: "50" }] });
    eq(r.rows.map((x) => x.date).join(","), "2026-11-21,2026-11-24"); eq(r.rows[1].close, 2.5); eq(r.rows[0].volume, 50);
  });
  test("a Twelve Data error is reported, and a rate-limit error is flagged as one", () => {
    eq(Market.parseTwelveData({ status: "error", code: 401, message: "bad key" }).error, "bad key");
    eq(Market.parseTwelveData({ status: "error", code: 429, message: "limit" }).limit, true);
  });
  test("Massive rows are read from millisecond timestamps", () => {
    const r = Market.parseMassive({ status: "OK", results: [{ t: Date.UTC(2026, 10, 24), o: 1, h: 2, l: 0.5, c: 1.5, v: 9 }] });
    eq(r.rows[0].date, "2026-11-24"); eq(r.rows[0].close, 1.5);
  });
  test("a CSV with an adjusted close column uses it in preference to close", () => {
    const r = Market.parseCsv("Date,Open,High,Low,Close,Adj Close,Volume\n2026-11-24,10,11,9,10.5,5.25,1000\n2026-11-21,9,10,8,9,4.5,900");
    eq(r.rows[0].date, "2026-11-21"); eq(r.rows[1].close, 5.25);
  });
  test("a CSV without a date or close column is refused with a reason", () => ok(/date/.test(Market.parseCsv("a,b\n1,2").error)));
  test("zero or negative prices are dropped", () => eq(Market.parseCsv("date,close\n2026-11-21,0\n2026-11-24,5").rows.length, 1));

  section("Personal price connection: alignment and checks");
  const dts = ["2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"];
  test("a company is put on the benchmark's calendar; one missing day in 60 repeats the last close with zero volume", () => {
    const d60 = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10));
    const rows = d60.filter((_, i) => i !== 30).map((d, i) => ({ date: d, high: i + 2, low: i, close: i + 1, volume: 10 }));
    const s = Market.align(d60, rows);
    eq(s.close.length, 60); eq(s.close[30], s.close[29]); eq(s.volume[30], 0); eq(s.close[31], 31);
  });
  test("a company with no dates in common is left out", () => eq(Market.align(dts, [{ date: "2020-01-01", close: 1 }]), null));
  test("a company whose prices stop before the latest date is left out, not padded with old prices", () =>
    eq(Market.align(dts, [{ date: "2026-11-17", close: 1 }, { date: "2026-11-18", close: 1 }]), null));
  test("more than 2% of days missing is left out", () => eq(Market.align(dts, [{ date: "2026-11-17", close: 1 }, { date: "2026-11-21", close: 1 }]), null));
  test("a one-day jump of more than 2.2x is caught as a likely unadjusted split", () => {
    eq(Market.suspiciousJump([{ date: "a", close: 100 }, { date: "b", close: 25 }]), "b");
    eq(Market.suspiciousJump([{ date: "a", close: 100 }, { date: "b", close: 80 }]), null);
  });
  test("build() needs the benchmark, and leaves out companies with too little history or bad jumps", () => {
    eq(Boolean(Market.build({ AAPL: [] }, "x", "t").error), true);
    const day = (i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10);
    const rows = (n, p = 100, jumpAt = -1) => Array.from({ length: n }, (_, i) => ({ date: day(i), high: p, low: p, close: i === jumpAt ? p * 3 : p, volume: 1 }));
    const f = Market.build({ SPY: rows(60), AAPL: rows(60), MSFT: rows(10), NVDA: rows(60, 100, 30) }, "Test", "2026-11-25T00:00:00Z");
    eq(Object.keys(f.series).sort().join(","), "AAPL,SPY"); eq(f.skipped.length, 2); eq(f.personal, true); eq(f.dates.length, 60);
  });

  test("today's unfinished bar is dropped, so only completed closes are used", () => {
    const day = (i) => new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10);
    const rows = Array.from({ length: 40 }, (_, i) => ({ date: day(i), high: 1, low: 1, close: 1, volume: 1 }));
    const f = Market.build({ SPY: rows, AAPL: rows }, "x", "t", day(39));
    eq(f.dates.length, 39); eq(f.dates[38], day(38));
  });
  test("the New York date is used for 'today' (4 a.m. UTC is still the previous day there)", () => eq(Market.newYorkDate(new Date("2026-11-25T04:00:00Z")), "2026-11-24"));

  section("Screener");
  const rows = universe.map((c) => Screen.row(c, rated[c.ticker], null));
  test("a row carries the grades and key figures, with market columns empty when there is no price data", () => { eq(rows[0].ticker, "T0"); ok(rows[0].fundamental > 0); eq(rows[0].price, null); eq(rows[0].quant, null); });
  test("sorting is highest-first by default and missing values go last", () => {
    const r2 = rows.map((x) => ({ ...x })); r2[4].roic = null;
    const sorted = Screen.sortRows(r2, "fundamental"); ok(sorted[0].fundamental >= sorted[1].fundamental);
    eq(Screen.sortRows(r2, "roic")[11].ticker, "T4"); eq(Screen.sortRows(r2, "roic", false)[11].ticker, "T4");
  });
  test("sorting by name is alphabetical", () => eq(Screen.sortRows(rows, "name", false)[0].name, "Co 0"));
  test("text filter matches ticker or name", () => { eq(Screen.applyFilters(rows, { text: "t11" }).length, 1); eq(Screen.applyFilters(rows, { text: "co 1" }).length, 3); });
  test("minimum-grade filter keeps only rows at or above the grade", () => Screen.applyFilters(rows, { minGrade: { fundamental: "B" } }).forEach((x) => ok(x.fundamental >= 60)));
  test("a filter on a missing value excludes the row: unknown is not a pass", () => { eq(Screen.applyFilters(rows, { minGrade: { quant: "D" } }).length, 0); eq(Screen.applyFilters(rows, { max: { pe: 100 } }).length, 0); });
  test("numeric minimum filter", () => eq(Screen.applyFilters(rows, { min: { roic: 99 } }).length, 0));
  test("every ready-made screen has a name, a reason and filters", () => Screen.PRESETS.forEach((p) => ok(p.name && p.why && p.filters && p.sort)));
  test("CSV export quotes commas and leaves missing values empty", () => {
    eq(Screen.toCsv([{ a: "x,y", b: null, c: 0.5 }], [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }]), 'A,B,C\n"x,y",,0.5');
  });

  section("Search and watchlist");
  const names = [{ ticker: "NVDA", name: "Nvidia" }, { ticker: "NFLX", name: "Netflix" }, { ticker: "NKE", name: "Nike" }, { ticker: "MSFT", name: "Microsoft" }, { ticker: "AMZN", name: "Amazon" }, { ticker: "KO", name: "Coca-Cola" }];
  test('typing "NV" finds Nvidia first', () => eq(Screen.search(names, "NV")[0].ticker, "NVDA"));
  test('typing "n" lists the tickers that start with N, in alphabetical order', () => eq(Screen.search(names, "n").slice(0, 3).map((c) => c.ticker).join(","), "NFLX,NKE,NVDA"));
  test("search works on company names and ignores case", () => { eq(Screen.search(names, "micro")[0].ticker, "MSFT"); eq(Screen.search(names, "COLA")[0].ticker, "KO"); });
  test("an exact ticker match comes before longer tickers that start the same way", () => eq(Screen.search([{ ticker: "KOF", name: "x" }, { ticker: "KO", name: "y" }], "ko")[0].ticker, "KO"));
  test("empty or unmatched text returns nothing", () => { eq(Screen.search(names, "").length, 0); eq(Screen.search(names, "zzz").length, 0); });
  test("watchlist: adding twice does not duplicate, and toggling removes", () => { eq(Screen.toggle(["A"], "B").join(","), "A,B"); eq(Screen.toggle(["A", "B"], "A").join(","), "B"); });

  return { results };
})();

// Terminal output (the jsc shell has print(); browsers use tests/index.html instead)
if (typeof document === "undefined") {
  const failed = Tests.results.filter((t) => !t.ok);
  let last = "";
  for (const t of Tests.results) {
    if (t.group !== last) { print("\n" + t.group); last = t.group; }
    print(`  ${t.ok ? "ok  " : "FAIL"} ${t.name}${t.ok ? "" : "\n         " + t.error}`);
  }
  print(`\n${Tests.results.length - failed.length} passed, ${failed.length} failed, ${Tests.results.length} total`);
  if (failed.length) throw new Error(failed.length + " test(s) failed");
}
