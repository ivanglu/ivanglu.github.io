/* Prices page: connect a free price source with your own key, or import CSV files.
   The download logic is in js/market.js. Nothing here sends data anywhere except
   to the provider the visitor chose, and the results stay in this browser. */

(() => {
  let provider = (Market.savedKey() || {}).provider || "twelvedata";
  let job = null;   // the running download, so it can be stopped

  const fmtDate = (iso) => new Date(iso).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  function status() {
    const f = Market.load(), info = Core.state.marketInfo, key = Market.savedKey();
    if (Core.state.marketInfo && !Core.state.marketInfo.personal) {
      return `<div class="fq-card"><h3>Prices are provided by the site</h3><p>${esc(info.source)}, to ${esc(info.asOf)}. Nothing to connect.</p></div>`;
    }
    if (!f) return "";
    const stale = Market.ageHours(f) > 20;
    return `<div class="fq-card fq-connected">
      <h3><span class="fq-dot fq-dot--on" aria-hidden="true"></span>Connected: ${esc(f.source)}</h3>
      <p>Daily prices for ${Object.keys(f.series).length - 1} companies and the S&amp;P 500 benchmark (${esc(f.benchmark)}), from ${esc(f.dates[0])} to <strong>${esc(f.dates[f.dates.length - 1])}</strong>.
        Downloaded ${esc(fmtDate(f.fetchedAt))}${stale ? `, <strong>over a day ago</strong>` : ""}.</p>
      ${f.skipped && f.skipped.length ? `<details class="fq-small"><summary>${f.skipped.length} left out</summary><ul>${f.skipped.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></details>` : ""}
      <div class="fq-cta">
        <a class="fq-btn fq-btn--primary" href="index.html">See the full ratings</a>
        ${key && key.provider !== "csv" ? `<button type="button" class="fq-btn" id="refresh">Update prices now</button>` : ""}
        <button type="button" class="fq-btn" id="forget">Disconnect and delete the prices</button>
      </div></div>`;
  }

  function form() {
    const p = Market.PROVIDERS[provider], key = Market.savedKey();
    return `
      <div class="fq-card">
        <h3>${Market.load() ? "Connect again, or switch provider" : "Connect in three steps"}</h3>
        <div class="fq-providers" role="radiogroup" aria-label="Price provider">
          ${Object.entries(Market.PROVIDERS).map(([id, x]) => `
            <label class="fq-provider ${id === provider ? "is-on" : ""}"><input type="radio" name="prov" value="${id}" ${id === provider ? "checked" : ""}>
              <strong>${esc(x.name)}${id === "twelvedata" ? ' <span class="fq-badge">Quicker</span>' : ""}</strong><span>${esc(x.note)}</span></label>`).join("")}
        </div>
        <ol class="fq-steps">
          <li><strong>Get a free key.</strong> <a href="${p.signup}" target="_blank" rel="noopener">Sign up at ${esc(p.name)} ↗</a> and copy the API key from your dashboard. FinanceIQ never sees your sign-up.</li>
          <li><strong>Paste it here.</strong>
            <span class="fq-keyrow"><input id="key" type="password" autocomplete="off" spellcheck="false" placeholder="Your ${esc(p.name)} API key" value="${key && key.provider === provider ? esc(key.key) : ""}" aria-label="API key">
            <button type="button" class="fq-btn" id="show" aria-pressed="false">Show</button></span>
            <label class="fq-check"><input type="checkbox" id="remember" ${!key || key.provider !== "csv" ? "checked" : ""}> Remember the key in this browser, so prices can be updated with one click</label></li>
          <li><strong>Download.</strong> Your browser fetches daily prices for all ${Core.state.list.length} companies and the S&amp;P 500 directly from ${esc(p.name)}. Keep this tab open until it finishes.
            <div class="fq-cta"><button type="button" class="fq-btn fq-btn--primary" id="go">Download prices</button></div></li>
        </ol>
        <div id="progress" hidden></div>
      </div>`;
  }

  const explain = () => `
    <section class="fq-section fq-prose">
      <h2>What happens to your key and the prices</h2>
      <ul>
        <li><strong>They stay in this browser.</strong> The key and the prices are saved in this browser's storage. FinanceIQ has no server: nothing is sent to it, to Ivan, or to anyone other than the provider you choose.</li>
        <li><strong>Only you see them.</strong> The grades and charts that use the prices appear for you, in this browser. Other visitors see the site without them.</li>
        <li><strong>Your agreement is with the provider.</strong> Free plans are for personal use. Using them here, for your own research, is that.</li>
        <li><strong>Prices are adjusted for stock splits</strong> and are end-of-day. Returns are price returns: dividends are not included.</li>
        <li><strong>To remove everything</strong>, use "Disconnect and delete the prices" above, or clear this site's data in your browser settings.</li>
      </ul>
      <h2>Why FinanceIQ doesn't just load prices from Yahoo</h2>
      <p>Yahoo Finance's terms forbid automated collection and republishing, and no free price service found allows a public website to show its prices to everyone. Paid licences that do start at about $125 a month. Connecting your own free key keeps everything within the rules. The details are in the <a href="methodology.html#market">methodology</a>.</p>
      <h2>Or import files you downloaded yourself</h2>
      <p>Choose one CSV file per company, named by ticker (for example <code>AAPL.csv</code>), including <code>SPY.csv</code> for the benchmark. Each needs a header row with at least <code>date</code> and <code>close</code> (an <code>adj close</code> column is used if present), and ideally <code>open</code>, <code>high</code>, <code>low</code> and <code>volume</code>.</p>
      <p><label class="fq-btn" for="csv">Choose CSV files</label><input id="csv" type="file" accept=".csv,text/csv" multiple class="fq-sr"></p>
      <p id="csv-out" class="fq-small"></p>
    </section>`;

  function draw() {
    $("#app").innerHTML = `<section class="fq-section" style="padding-top:8px"><div class="fq-grid">${status()}${form()}</div></section>${explain()}`;
  }

  function progress(p) {
    const box = $("#progress");
    if (!box) return;
    box.hidden = false;
    const gap = 60 / Market.PROVIDERS[provider].perMinute;
    const left = Math.max(0, Math.round(((p.total - p.done) * gap) / 60));
    box.innerHTML = `
      <div class="fq-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${p.total}" aria-valuenow="${p.done}"><span style="width:${(p.done / p.total) * 100}%"></span></div>
      <p class="fq-small">${p.done < p.total ? `${p.done} of ${p.total} downloaded${p.ticker ? `, now ${esc(p.ticker)}` : ""}. ${p.waitSeconds ? `Provider's per-minute limit reached: waiting ${p.waitSeconds} s.` : `About ${left || "under 1"} minute${left === 1 ? "" : "s"} left.`}` : "Finished. Calculating grades…"}
        ${p.errors && p.errors.length ? `<br>Problems so far: ${p.errors.map(esc).join("; ")}` : ""}</p>
      ${p.done < p.total ? `<button type="button" class="fq-btn" id="stop">Stop</button>` : ""}`;
  }

  async function run(key) {
    job = new AbortController();
    $("#go").disabled = true;
    const tickers = Core.state.list.map((c) => c.ticker);
    const out = await Market.download(provider, key, tickers, progress, job.signal);
    job = null;
    if (out.error) {
      $("#progress").innerHTML = `<p class="fq-note fq-note--warn" role="alert"><strong>Download stopped.</strong> ${esc(out.error)}</p>`;
      $("#go").disabled = false;
      return;
    }
    if (!Market.save(out.file)) {
      $("#progress").innerHTML = `<p class="fq-note fq-note--warn" role="alert">The prices downloaded, but this browser would not save them (storage full or private browsing).</p>`;
      return;
    }
    location.reload();   // reload so every grade is recalculated with the prices
  }

  Core.start({ page: "prices", mode: "none", render: draw });

  document.addEventListener("change", async (e) => {
    const t = e.target;
    if (t.name === "prov") { provider = t.value; draw(); }
    else if (t.id === "csv") {
      const files = [...t.files], rows = {}, problems = [];
      for (const f of files) {
        const ticker = f.name.replace(/\.csv$/i, "").toUpperCase().replace(/[^A-Z.]/g, "");
        const r = Market.parseCsv(await f.text());
        if (r.rows) rows[ticker] = r.rows; else problems.push(`${f.name}: ${r.error}`);
      }
      const known = Object.keys(rows).filter((x) => x === Market.BENCHMARK || Core.company(x));
      const file = Market.build(Object.fromEntries(known.map((k) => [k, rows[k]])), "Your CSV files", new Date().toISOString(), Market.newYorkDate());
      if (file.error) { $("#csv-out").innerHTML = `<span class="fq-down">${esc(file.error)}. Include ${Market.BENCHMARK}.csv.</span> ${problems.map(esc).join("; ")}`; return; }
      Market.save(file); Market.rememberKey("csv", null);
      location.reload();
    }
  });
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.closest("#go")) {
      const key = $("#key").value.trim();
      if (!key) { $("#key").focus(); $("#key").setAttribute("aria-invalid", "true"); return; }
      if ($("#remember").checked) Market.rememberKey(provider, key);
      run(key);
    } else if (t.closest("#refresh")) {
      const k = Market.savedKey(); provider = k.provider; draw(); progress({ done: 0, total: Core.state.list.length + 1 }); run(k.key);
    } else if (t.closest("#stop") && job) job.abort();
    else if (t.closest("#forget")) { Market.forget(); location.reload(); }
    else if (t.closest("#show")) { const k = $("#key"), b = t.closest("#show"); const on = k.type === "password"; k.type = on ? "text" : "password"; b.textContent = on ? "Hide" : "Show"; b.setAttribute("aria-pressed", on); }
  });
  window.addEventListener("beforeunload", (e) => { if (job) { e.preventDefault(); e.returnValue = ""; } });
})();
