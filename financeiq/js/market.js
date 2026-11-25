/* ============================================================
   FinanceIQ personal price connection ("bring your own key").

   FinanceIQ does not hold a licence to publish share prices, so it ships
   without any. A visitor can connect a price source with their OWN free
   key. Their browser then downloads daily prices straight from the
   provider, keeps them in this browser only, and FinanceIQ uses them to
   calculate the Quantitative and Valuation grades for that visitor.
   Nothing is sent to FinanceIQ or anyone else, and nothing is published.

   The parsing and alignment functions at the top are pure and unit-tested.
   The download code at the bottom runs only on prices.html.
   ============================================================ */

const Market = (() => {
  const isNum = (v) => typeof v === "number" && isFinite(v);
  const BENCHMARK = "SPY";          // S&P 500 ETF, the benchmark for relative strength
  const DAYS = 600;                 // trading days to keep: a little over two years
  const STORE_KEY = "fq.market";    // the downloaded prices
  const KEY_KEY = "fq.marketKey";   // the visitor's API key, if they chose to remember it

  const PROVIDERS = {
    twelvedata: {
      name: "Twelve Data", signup: "https://twelvedata.com/register", terms: "https://twelvedata.com/terms",
      perMinute: 8, note: "Free plan: 800 requests a day, 8 a minute. The first download takes about 5 minutes.",
      url: (t, key) => `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(t)}&interval=1day&outputsize=${DAYS}&adjust=splits&apikey=${encodeURIComponent(key)}`,
    },
    massive: {
      name: "Massive (formerly Polygon.io)", signup: "https://massive.com/dashboard/signup", terms: "https://massive.com/legal/individuals-terms-of-service",
      perMinute: 5, note: "Free plan: 5 requests a minute, two years of history. The first download takes about 8 minutes.",
      url: (t, key) => {
        const to = new Date(), from = new Date(to.getTime() - 900 * 864e5);
        const d = (x) => x.toISOString().slice(0, 10);
        return `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(t)}/range/1/day/${d(from)}/${d(to)}?adjusted=true&sort=asc&limit=50000&apiKey=${encodeURIComponent(key)}`;
      },
    },
  };

  /* ---------------- parsing (pure) ---------------- */

  // Each parser returns { rows: [{ date, open, high, low, close, volume }] oldest first } or { error }.
  function parseTwelveData(json) {
    if (!json || json.status === "error" || !Array.isArray(json.values)) {
      return { error: (json && (json.message || json.status)) || "Unexpected response", limit: json && json.code === 429 };
    }
    const rows = json.values.map((v) => ({
      date: String(v.datetime).slice(0, 10), open: +v.open, high: +v.high, low: +v.low, close: +v.close, volume: +v.volume || 0,
    })).filter((r) => isNum(r.close) && r.close > 0);
    return { rows: rows.sort((a, b) => a.date.localeCompare(b.date)) };
  }

  function parseMassive(json) {
    if (!json || json.status === "ERROR" || json.status === "NOT_AUTHORIZED" || !Array.isArray(json.results)) {
      return { error: (json && (json.error || json.message || json.status)) || "Unexpected response", limit: json && /exceeded|maximum requests/i.test(json.error || "") };
    }
    const rows = json.results.map((r) => ({
      date: new Date(r.t).toISOString().slice(0, 10), open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v || 0,
    })).filter((r) => isNum(r.close) && r.close > 0);
    return { rows: rows.sort((a, b) => a.date.localeCompare(b.date)) };
  }

  // A CSV file the visitor downloaded themselves: a header row with date and close at least.
  function parseCsv(text) {
    const lines = String(text).replace(/\r/g, "").split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { error: "The file is empty" };
    const head = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
    // names are in order of preference: an adjusted close beats a plain close
    const col = (names) => { for (const n of names) { const i = head.indexOf(n); if (i >= 0) return i; } return -1; };
    const iDate = col(["date", "datetime", "timestamp"]), iClose = col(["adjclose", "adjustedclose", "close"]);
    const iOpen = col(["open"]), iHigh = col(["high"]), iLow = col(["low"]), iVol = col(["volume"]);
    if (iDate < 0 || iClose < 0) return { error: "Needs at least a 'date' and a 'close' column" };
    const rows = lines.slice(1).map((l) => {
      const c = l.split(",");
      const close = +c[iClose];
      return { date: (c[iDate] || "").trim().slice(0, 10), close,
               open: iOpen >= 0 ? +c[iOpen] : close, high: iHigh >= 0 ? +c[iHigh] : close, low: iLow >= 0 ? +c[iLow] : close, volume: iVol >= 0 ? +c[iVol] || 0 : 0 };
    }).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date) && isNum(r.close) && r.close > 0);
    return rows.length ? { rows: rows.sort((a, b) => a.date.localeCompare(b.date)) } : { error: "No usable rows found" };
  }

  // A one-day move bigger than 2.2x or smaller than 0.45x is almost always an unadjusted stock split.
  function suspiciousJump(rows) {
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i].close / rows[i - 1].close;
      if (r > 2.2 || r < 0.45) return rows[i].date;
    }
    return null;
  }

  // Put every company on the benchmark's calendar, so day i means the same date for all of them.
  // The series runs from the company's first date to the benchmark's last date. An occasional missing day in
  // between repeats the last close with zero volume. A company whose prices stop before the benchmark's last
  // date, or that misses more than 2% of days, is left out rather than padded with made-up prices.
  function align(dates, rows) {
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const first = dates.findIndex((d) => byDate.has(d));
    if (first < 0 || !byDate.has(dates[dates.length - 1])) return null;
    const out = { high: [], low: [], close: [], volume: [] };
    let last = null, filled = 0;
    for (const d of dates.slice(first)) {
      let r = byDate.get(d);
      if (!r) { r = { high: last.close, low: last.close, close: last.close, volume: 0 }; filled++; }
      out.high.push(r.high); out.low.push(r.low); out.close.push(r.close); out.volume.push(r.volume); last = r;
    }
    return filled / out.close.length > 0.02 ? null : out;
  }

  // Today's date on the New York exchange calendar, as YYYY-MM-DD.
  const newYorkDate = (when = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(when);

  // Turn { TICKER: rows } into the same shape as data/prices.json.
  // Rows dated `today` or later are dropped: during trading hours providers return the day's
  // unfinished bar, whose close and volume are not final. Everything then uses completed closes.
  function build(rowsByTicker, provider, fetchedAt, today = null) {
    if (today) rowsByTicker = Object.fromEntries(Object.entries(rowsByTicker).map(([t, r]) => [t, r.filter((x) => x.date < today)]));
    const bench = rowsByTicker[BENCHMARK];
    if (!bench || bench.length < 30) return { error: "The benchmark (S&P 500 ETF) could not be downloaded" };
    const dates = bench.map((r) => r.date).slice(-DAYS);
    const series = {}, skipped = [];
    for (const [t, rows] of Object.entries(rowsByTicker)) {
      const jump = suspiciousJump(rows);
      if (jump) { skipped.push(`${t}: price jumps on ${jump}, which looks like an unadjusted split`); continue; }
      const s = align(dates, rows);
      if (s && s.close.length >= 30) series[t] = s; else skipped.push(`${t}: too little history, or prices missing for recent days`);
    }
    return { source: provider, benchmark: BENCHMARK, dates, fetchedAt, personal: true,
             license: { displayPrices: true, displayDerived: true, attribution: "" }, series, skipped };
  }

  /* ---------------- saved data (browser only) ---------------- */

  function load() {
    try { const v = localStorage.getItem(STORE_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function save(file) {
    // round to keep the saved copy small enough for the browser's storage
    const r = (a, p) => a.map((x) => Math.round(x * p) / p);
    const slim = { ...file, series: Object.fromEntries(Object.entries(file.series).map(([t, s]) =>
      [t, { high: r(s.high, 1e4), low: r(s.low, 1e4), close: r(s.close, 1e4), volume: r(s.volume, 1) }])) };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(slim)); return true; } catch (e) { return false; }
  }
  function forget() { try { localStorage.removeItem(STORE_KEY); localStorage.removeItem(KEY_KEY); } catch (e) { /* ignore */ } }
  const savedKey = () => { try { return JSON.parse(localStorage.getItem(KEY_KEY) || "null"); } catch (e) { return null; } };
  const rememberKey = (provider, key) => { try { localStorage.setItem(KEY_KEY, JSON.stringify({ provider, key })); } catch (e) { /* ignore */ } };
  const ageHours = (file) => (file && file.fetchedAt ? (Date.now() - Date.parse(file.fetchedAt)) / 36e5 : Infinity);

  /* ---------------- download (browser only) ---------------- */

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Download every ticker, respecting the provider's per-minute limit.
  // onProgress({ done, total, ticker, waitSeconds, errors }) is called as it goes.
  // Returns { file } or { error }. Stops early if the key is rejected.
  async function download(providerId, key, tickers, onProgress, signal) {
    const p = PROVIDERS[providerId];
    const parse = providerId === "twelvedata" ? parseTwelveData : parseMassive;
    const all = [BENCHMARK, ...tickers.filter((t) => t !== BENCHMARK)];
    const rows = {}, errors = [];
    const gap = Math.ceil(60000 / p.perMinute) + 250;   // even spacing keeps us inside the limit
    for (let i = 0; i < all.length; i++) {
      if (signal && signal.aborted) return { error: "Stopped" };
      const t = all[i];
      onProgress({ done: i, total: all.length, ticker: t, errors });
      const started = Date.now();
      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch(p.url(t, key), { cache: "no-store" });
          const json = await res.json().catch(() => null);
          if (res.status === 401 || res.status === 403) return { error: "The provider rejected the key. Check that it was copied in full." };
          result = parse(json);
          if (result.limit || res.status === 429) {                       // rate limit: wait a minute and try again
            for (let s = 61; s > 0; s--) { if (signal && signal.aborted) return { error: "Stopped" }; onProgress({ done: i, total: all.length, ticker: t, waitSeconds: s, errors }); await sleep(1000); }
            continue;
          }
          break;
        } catch (e) { result = { error: "Network error" }; await sleep(2000); }
      }
      if (result && result.rows) rows[t] = result.rows;
      else { errors.push(`${t}: ${result ? result.error : "no response"}`); if (t === BENCHMARK) return { error: "The benchmark could not be downloaded: " + (result ? result.error : "no response") }; }
      if (i < all.length - 1) await sleep(Math.max(0, gap - (Date.now() - started)));
    }
    onProgress({ done: all.length, total: all.length, errors });
    const file = build(rows, p.name, new Date().toISOString(), newYorkDate());
    if (file.error) return file;
    file.skipped = [...errors, ...file.skipped];
    return { file };
  }

  return { BENCHMARK, DAYS, PROVIDERS, newYorkDate, parseTwelveData, parseMassive, parseCsv, suspiciousJump, align, build, load, save, forget, savedKey, rememberKey, ageHours, download };
})();

if (typeof module !== "undefined") module.exports = Market;
