/* Prints the calculated ratios for chosen companies as JSON, for tools/crosscheck.py.
   Usage (see crosscheck.py):  jsc js/calc.js tests/dump.js -- AAPL MSFT            */
const data = JSON.parse(readFile("data/financials.json"));
const want = typeof arguments !== "undefined" && arguments.length ? arguments : ["AAPL", "MSFT"];
const out = {};
for (const c of data.companies) {
  if (!want.includes(c.ticker)) continue;
  Calc.derive(c);
  const L = c.L, d = Calc.dcfDefaults(c), s = d.scenarios.base;
  const v = Calc.dcf({ fcf0: d.fcf0, years: d.years, cash: d.cash, debt: d.debt, shares: d.shares, ...s });
  out[c.ticker] = {
    grossMargin: L.grossMargin, opMargin: L.opMargin, netMargin: L.netMargin, growth: L.growth, cagr3: c.cagr3,
    freeCashFlow: L.freeCashFlow, fcfMargin: L.fcfMargin, debtToEquity: L.debtToEquity, currentRatio: L.currentRatio,
    netCash: L.netCash, roe: L.roe, roa: L.roa, assetTurnover: L.assetTurnover, taxRate: L.taxRate, roic: L.roic, fcff: L.fcff,
    dcfGrowth: s.growth, dcfEnterpriseValue: v.valid ? v.enterpriseValue : null, dcfPerShare: v.valid ? v.perShare : null,
  };
}
print(JSON.stringify(out));
