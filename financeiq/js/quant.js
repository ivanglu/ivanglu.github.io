/* ============================================================
   FinanceIQ market indicators.

   Pure functions on arrays of daily prices and volumes, oldest first.
   No browser code, so every function is unit-tested (tests/tests.js)
   and cross-checked against a separate Python implementation
   (tools/crosscheck_quant.py).

   Trading-day counts used throughout: 21 = one month, 63 = three months,
   126 = six months, 252 = one year.

   These indicators describe past price and volume behaviour. They are
   "participation and accumulation proxies". They cannot show who bought
   or sold, and they do not predict future prices.
   ============================================================ */

const Quant = (() => {
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const MONTH = 21, QUARTER = 63, HALF = 126, YEAR = 252;

  const last = (a, back = 0) => a[a.length - 1 - back];
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  // Standard deviation (sample, n - 1), the usual convention for volatility.
  const stdev = (a) => {
    if (a.length < 2) return null;
    const m = mean(a);
    return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
  };

  // Return over the last `n` trading days. Needs n + 1 prices.
  const periodReturn = (closes, n) => (closes.length > n ? last(closes) / last(closes, n) - 1 : null);

  // 12-minus-1 momentum: the return from 12 months ago to 1 month ago. The latest month is
  // skipped because very recent moves tend to reverse (a well-documented academic convention).
  const momentum12m1 = (closes) => (closes.length > YEAR ? last(closes, MONTH) / last(closes, YEAR) - 1 : null);

  // Simple moving average of the last n values.
  const sma = (a, n, back = 0) => (a.length >= n + back ? mean(a.slice(a.length - n - back, a.length - back)) : null);

  // One-day returns: (today / yesterday) - 1.
  const dailyReturns = (closes) => closes.slice(1).map((c, i) => c / closes[i] - 1);

  // Annualized volatility: standard deviation of daily returns x sqrt(252).
  function volatility(closes, n = YEAR) {
    if (closes.length <= n) return null;
    return stdev(dailyReturns(closes.slice(-n - 1))) * Math.sqrt(YEAR);
  }

  // Downside volatility: like volatility, but only days with a negative return count.
  function downsideVolatility(closes, n = YEAR) {
    if (closes.length <= n) return null;
    const r = dailyReturns(closes.slice(-n - 1));
    return Math.sqrt(r.reduce((s, v) => s + Math.min(v, 0) ** 2, 0) / r.length) * Math.sqrt(YEAR);
  }

  // Largest peak-to-trough fall over the last n days (a negative number, e.g. -0.32).
  function maxDrawdown(closes, n = YEAR) {
    if (closes.length <= n) return null;
    let peak = -Infinity, worst = 0;
    for (const c of closes.slice(-n - 1)) { peak = Math.max(peak, c); worst = Math.min(worst, c / peak - 1); }
    return worst;
  }

  // Beta: how much the stock moved for each 1% move in the benchmark.
  // covariance(stock, benchmark) / variance(benchmark), on daily returns.
  function beta(closes, bench, n = YEAR) {
    if (closes.length <= n || bench.length <= n) return null;
    const a = dailyReturns(closes.slice(-n - 1)), b = dailyReturns(bench.slice(-n - 1));
    const ma = mean(a), mb = mean(b);
    let cov = 0, varB = 0;
    for (let i = 0; i < a.length; i++) { cov += (a[i] - ma) * (b[i] - mb); varB += (b[i] - mb) ** 2; }
    return varB > 0 ? cov / varB : null;
  }

  // On-Balance Volume: add the day's volume when the price closes up, subtract it when it closes down.
  function obv(closes, volumes) {
    const out = [0];
    for (let i = 1; i < closes.length; i++) {
      out.push(out[i - 1] + (closes[i] > closes[i - 1] ? volumes[i] : closes[i] < closes[i - 1] ? -volumes[i] : 0));
    }
    return out;
  }

  // OBV trend: the change in OBV over n days as a share of all volume traded in those days.
  // +1 would mean every share traded on an up day; -1 every share on a down day.
  function obvTrend(closes, volumes, n = QUARTER) {
    if (closes.length <= n) return null;
    const o = obv(closes, volumes), total = volumes.slice(-n).reduce((s, v) => s + v, 0);
    return total > 0 ? (last(o) - last(o, n)) / total : null;
  }

  // Chaikin Money Flow over n days. For each day, the close's position in the day's range
  // (-1 at the low, +1 at the high) is weighted by volume. Needs high and low prices.
  function chaikinMoneyFlow(highs, lows, closes, volumes, n = MONTH) {
    if (closes.length < n) return null;
    let flow = 0, total = 0;
    for (let i = closes.length - n; i < closes.length; i++) {
      const range = highs[i] - lows[i];
      const position = range > 0 ? ((closes[i] - lows[i]) - (highs[i] - closes[i])) / range : 0;
      flow += position * volumes[i]; total += volumes[i];
    }
    return total > 0 ? flow / total : null;
  }

  // Volume on up days divided by volume on down days, over n days. Above 1 = more volume on up days.
  function upDownVolume(closes, volumes, n = QUARTER) {
    if (closes.length <= n) return null;
    let up = 0, down = 0;
    for (let i = closes.length - n; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) up += volumes[i]; else if (closes[i] < closes[i - 1]) down += volumes[i];
    }
    return down > 0 ? up / down : null;
  }

  // Latest month's average volume compared with the previous three months'.
  function relativeVolume(volumes) {
    if (volumes.length < MONTH + QUARTER) return null;
    const recent = mean(volumes.slice(-MONTH)), before = mean(volumes.slice(-MONTH - QUARTER, -MONTH));
    return before > 0 ? recent / before : null;
  }

  // Share of the last n days on which the close was above its own 50-day average.
  function shareAbove50(closes, n = QUARTER) {
    if (closes.length < 50 + n) return null;
    let above = 0;
    for (let back = 0; back < n; back++) if (last(closes, back) > sma(closes, 50, back)) above++;
    return above / n;
  }

  // Everything the Quantitative grade needs, for one stock against one benchmark.
  // stock = { close: [], high: [], low: [], volume: [] }, bench = { close: [] }, same dates, oldest first.
  // Prices must already be adjusted for splits. Returns null fields where history is too short.
  function metrics(stock, bench) {
    const c = stock.close, v = stock.volume || [], b = bench ? bench.close : [];
    const rel = (n) => { const s = periodReturn(c, n), m = periodReturn(b, n); return isNum(s) && isNum(m) ? s - m : null; };
    const ma50 = sma(c, 50), ma200 = sma(c, 200), ma50Before = sma(c, 50, MONTH);
    const ret12 = periodReturn(c, YEAR), vol = volatility(c);
    const mom = momentum12m1(c), benchMom = momentum12m1(b);
    const high52 = c.length >= YEAR ? Math.max(...c.slice(-YEAR)) : null;
    const hasRange = stock.high && stock.low && stock.high.length === c.length;
    return {
      days: c.length, price: last(c),
      return1m: periodReturn(c, MONTH), return3m: periodReturn(c, QUARTER), return6m: periodReturn(c, HALF), return12m: ret12,
      relative1m: rel(MONTH), relative3m: rel(QUARTER), relative6m: rel(HALF), relative12m: rel(YEAR),
      momentum12m1: mom, relativeMomentum12m1: isNum(mom) && isNum(benchMom) ? mom - benchMom : null,
      ma50, ma200,
      priceVs50: isNum(ma50) ? last(c) / ma50 - 1 : null,
      priceVs200: isNum(ma200) ? last(c) / ma200 - 1 : null,
      ma50Vs200: isNum(ma50) && isNum(ma200) ? ma50 / ma200 - 1 : null,
      ma50Slope: isNum(ma50) && isNum(ma50Before) ? ma50 / ma50Before - 1 : null,
      fromHigh52: isNum(high52) ? last(c) / high52 - 1 : null,
      shareAbove50: shareAbove50(c),
      obvTrend: v.length === c.length ? obvTrend(c, v) : null,
      chaikin: hasRange && v.length === c.length ? chaikinMoneyFlow(stock.high, stock.low, c, v) : null,
      upDownVolume: v.length === c.length ? upDownVolume(c, v) : null,
      relativeVolume: v.length === c.length ? relativeVolume(v) : null,
      volatility: vol, downsideVolatility: downsideVolatility(c), maxDrawdown: maxDrawdown(c),
      returnPerRisk: isNum(ret12) && vol > 0 ? ret12 / vol : null,
      beta: beta(c, b),
    };
  }

  return {
    MONTH, QUARTER, HALF, YEAR, mean, stdev, periodReturn, momentum12m1, sma, dailyReturns, volatility,
    downsideVolatility, maxDrawdown, beta, obv, obvTrend, chaikinMoneyFlow, upDownVolume, relativeVolume, shareAbove50, metrics,
  };
})();

if (typeof module !== "undefined") module.exports = Quant;
