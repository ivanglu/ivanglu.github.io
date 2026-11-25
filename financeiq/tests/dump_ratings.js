/* Prints today's ratings for every company as JSON, for tools/snapshot_ratings.py.
   Uses market data only if data/prices.json contains any. */
const data = JSON.parse(readFile("data/financials.json"));
const prices = JSON.parse(readFile("data/prices.json"));
data.companies.forEach((c) => Calc.derive(c));
let market = null;
if (prices.series) {
  market = {};
  const bench = prices.series[prices.benchmark] || null;
  for (const c of data.companies) {
    const s = prices.series[c.ticker];
    if (s && s.close && s.close.length >= 30) market[c.ticker] = { q: Quant.metrics(s, bench), v: Calc.valuation(c, s.close[s.close.length - 1]) || {} };
  }
}
const rated = Ratings.rateAll(data.companies, market);
const out = {};
for (const c of data.companies) {
  const r = rated[c.ticker];
  out[c.ticker] = { overall: r.overall === null ? null : +r.overall.toFixed(2), complete: r.complete, coverage: +r.coverage.toFixed(3),
    categories: Object.fromEntries(r.categories.map((k) => [k.id, k.score === null ? null : +k.score.toFixed(2)])) };
}
print(JSON.stringify({ version: Ratings.VERSION, dataGenerated: data.generated, market: Boolean(market), ratings: out }));
