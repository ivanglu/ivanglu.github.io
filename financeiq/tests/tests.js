/* ============================================================
   FinanceIQ automated tests for js/calc.js.

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
