/* ============================================================
   FinanceIQ shared page code: loading data, navigation, the company
   picker, glossary tooltips, saved settings and the guided tour.

   Every page calls  Core.start({ page, usesPair, render })  once.
   `render(A, B)` is called again whenever the selected companies change.
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
// Escape text before putting it into HTML.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const Core = (() => {
  const SITE_URL = "https://ivanglushchenko.com/financeiq/";
  const DEFAULT_PAIR = ["AAPL", "MSFT"];
  const COLORS = ["var(--series-a)", "var(--series-b)"];

  const PAGES = [
    { id: "overview", file: "index.html", label: "Overview" },
    { id: "compare", file: "compare.html", label: "Comparison" },
    { id: "health", file: "health.html", label: "Financial Health" },
    { id: "valuation", file: "valuation.html", label: "Valuation" },
    { id: "trends", file: "trends.html", label: "Trends" },
    { id: "benchmarks", file: "benchmarks.html", label: "Benchmarks" },
    { id: "research", file: "research.html", label: "Research" },
    { id: "methodology", file: "methodology.html", label: "Methodology" },
    { id: "about", file: "about.html", label: "About" },
  ];

  // Plain-English definitions, shown when a term is hovered or focused.
  const GLOSSARY = {
    revenue: "All the money a company takes in from selling its products and services, before any costs.",
    grossMargin: "Gross profit ÷ revenue. What is left of each sales dollar after the direct cost of making the product.",
    opMargin: "Operating income ÷ revenue. Profit from the core business, before interest and tax, per dollar of sales.",
    netMargin: "Net income ÷ revenue. Profit after every cost, including interest and tax, per dollar of sales.",
    netIncome: "The bottom line: profit after all costs, interest and taxes.",
    ebit: "Earnings before interest and tax. Usually the same as operating income.",
    ebitda: "Operating income with depreciation and amortization added back. A rough measure of operating cash profit.",
    eps: "Earnings per share: net income ÷ number of shares. Shown diluted and adjusted for stock splits.",
    roe: "Return on equity: net income ÷ average shareholders' equity.",
    roic: "Return on invested capital: after-tax operating profit ÷ (debt + equity). Shows how well a company turns the money invested in it into profit.",
    roa: "Return on assets: net income ÷ average total assets.",
    assetTurnover: "Revenue ÷ average total assets. How many dollars of sales each dollar of assets produces.",
    debt: "Money borrowed from lenders: bonds, loans and commercial paper. Lease obligations are not included.",
    cash: "Cash plus short-term investments that can be sold quickly.",
    netCash: "Cash and short-term investments minus debt. Positive means the company could repay every lender today.",
    debtToEquity: "Total debt ÷ shareholders' equity. How much the company relies on borrowed money.",
    currentRatio: "Current assets ÷ current liabilities. Above 1 means short-term assets cover the bills due within a year.",
    interestCoverage: "Operating income ÷ interest expense. How many times over the company can pay its interest.",
    netDebtToEbitda: "(Debt − cash) ÷ EBITDA. Roughly how many years of operating profit it would take to repay net debt.",
    ocf: "Operating cash flow: cash brought in by day-to-day operations.",
    capex: "Capital expenditure: cash spent on buildings, equipment and other long-lived assets.",
    fcf: "Free cash flow: operating cash flow minus capital spending. Cash left after running and maintaining the business.",
    fcfMargin: "Free cash flow ÷ revenue.",
    ocfMargin: "Operating cash flow ÷ revenue.",
    fcfConversion: "Free cash flow ÷ net income. Close to 1 or above means reported profit is backed by cash.",
    fcff: "Free cash flow to the firm: cash available to both lenders and shareholders, before interest is paid.",
    fcfe: "Free cash flow to equity: cash left for shareholders after interest and debt repayments.",
    cagr: "Compound annual growth rate: the steady yearly growth rate that would turn the starting value into the ending value.",
    dcf: "Discounted cash flow: a valuation method that adds up a company's expected future cash flows, each reduced to its value today.",
    discountRate: "The yearly return investors require. Future cash is divided by (1 + rate) for every year you wait for it.",
    terminalGrowth: "The growth rate assumed forever after the projection period. It should not be higher than long-run economic growth.",
    terminalValue: "The value today of all cash flows after the projection period, from the Gordon growth formula.",
    enterpriseValue: "The value of the whole business, belonging to lenders and shareholders together.",
    equityValue: "Enterprise value minus debt plus cash: the part that belongs to shareholders.",
    median: "The middle value when the group is sorted. Half the companies are above it and half below.",
    tenK: "Form 10-K: the audited annual report every US public company files with the SEC.",
  };

  const state = { data: null, summaries: null, byTicker: {}, list: [], a: null, b: null, cfg: null };

  /* ---------------- small helpers ---------------- */

  // A word with a tooltip definition. Focusable so it works from the keyboard.
  const term = (key, label) => (GLOSSARY[key]
    ? `<span class="fq-term" tabindex="0" data-tip="${esc(GLOSSARY[key])}">${esc(label)}</span>` : esc(label));

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem("fq." + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem("fq." + key, JSON.stringify(value)); } catch (e) { /* private mode: ignore */ } },
    remove(key) { try { localStorage.removeItem("fq." + key); } catch (e) { /* ignore */ } },
  };

  async function getJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + " returned " + res.status);
    return res.json();
  }
  const getText = (url) => fetch(url).then((r) => (r.ok ? r.text() : "")).catch(() => "");

  // Apple -> Apple's, Starbucks -> Starbucks', McDonald's -> McDonald's
  const poss = (name) => (name.endsWith("'s") ? name : name.endsWith("s") ? name + "'" : name + "'s");

  const swatch = (i) => `<i class="fq-swatch" style="background:${COLORS[i]}"></i>`;

  /* ---------------- Ivan's text files ---------------- */

  // Tiny Markdown: paragraphs, "- " bullets, **bold**, *italic*, [link](https://...)
  function md(text) {
    const inline = (s) => esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    let html = "", para = [], list = [];
    const flush = () => {
      if (para.length) html += `<p>${inline(para.join(" "))}</p>`;
      if (list.length) html += `<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`;
      para = []; list = [];
    };
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line) flush();
      else if (/^[-*]\s+/.test(line)) { if (para.length) flush(); list.push(line.replace(/^[-*]\s+/, "")); }
      else { if (list.length) flush(); para.push(line); }
    }
    flush();
    return html;
  }

  // Ivan's files look like this:
  //     published: January 2027          <- optional "key: value" lines first
  //
  //     ## Initial hypothesis            <- one "## heading" per section
  //     text...
  // Anything inside <!-- --> is ignored. Returns { meta, sections: { "initial hypothesis": html } }.
  function parseDoc(text) {
    const lines = text.replace(/<!--[\s\S]*?-->/g, "").replace(/\r/g, "").split("\n");
    const meta = {}, sections = {};
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && /^[a-z ]+:/i.test(lines[0]) && !lines[0].startsWith("#")) {
      const [k, ...rest] = lines.shift().split(":");
      meta[k.trim().toLowerCase()] = rest.join(":").trim();
    }
    let key = null, buf = [];
    const close = () => { if (key && buf.join("").trim()) sections[key] = md(buf.join("\n")); buf = []; };
    for (const line of lines) {
      if (/^##\s+/.test(line)) { close(); key = line.replace(/^##\s+/, "").trim().toLowerCase(); }
      else buf.push(line);
    }
    close();
    return { meta, sections };
  }

  /* ---------------- selected companies ---------------- */

  const known = (t) => Boolean(state.byTicker[t]);

  // The pair lives in the URL (#AAPL-MSFT) so any view can be shared as a link.
  function pairFromHash() {
    const m = location.hash.match(/^#([A-Z]+)-([A-Z]+)$/);
    return m && known(m[1]) && known(m[2]) && m[1] !== m[2] ? [m[1], m[2]] : null;
  }

  function setPair(a, b, updateHash = true) {
    state.a = a; state.b = b;
    store.set("pair", [a, b]);
    if (updateHash) history.replaceState(null, "", location.pathname + location.search + `#${a}-${b}`);
    $$("a[data-nav]").forEach((el) => { el.href = el.dataset.nav + `#${a}-${b}`; });
    if (state.cfg.usesPair) renderPicker();
    return rerender();
  }

  function rerender() {
    const A = state.byTicker[state.a], B = state.byTicker[state.b];
    document.body.classList.remove("fq-is-loading");
    return state.cfg.render(A, B);
  }

  function renderPicker() {
    const host = $("#fq-picker");
    if (!host) return;
    const groups = [...new Set(state.list.map((c) => c.group))];
    const options = (selected, other) => groups.map((g) => `<optgroup label="${esc(g === "Other" ? "Other industries" : g)}">${
      state.list.filter((c) => c.group === g).map((c) =>
        `<option value="${c.ticker}" ${c.ticker === selected ? "selected" : ""} ${c.ticker === other ? "disabled" : ""}>${esc(c.name)} (${c.ticker})</option>`).join("")
    }</optgroup>`).join("");
    host.innerHTML = `
      <form class="fq-picker" aria-label="Choose two companies">
        <label class="fq-pick"><span class="fq-pick__label">${swatch(0)}Company A</span><select id="selA">${options(state.a, state.b)}</select></label>
        <button type="button" id="swap" class="fq-swap" title="Swap companies" aria-label="Swap companies">⇄</button>
        <label class="fq-pick"><span class="fq-pick__label">${swatch(1)}Company B</span><select id="selB">${options(state.b, state.a)}</select></label>
      </form>`;
    $("#selA").addEventListener("change", (e) => setPair(e.target.value, state.b));
    $("#selB").addEventListener("change", (e) => setPair(state.a, e.target.value));
    $("#swap").addEventListener("click", () => setPair(state.b, state.a));
  }

  /* ---------------- page furniture ---------------- */

  function renderNav(page) {
    const links = PAGES.map((p) =>
      `<a data-nav="${p.file}" href="${p.file}" ${p.id === page ? 'aria-current="page"' : ""}>${p.label}</a>`).join("");
    $("#fq-nav").innerHTML = `
      <div class="fq-top__bar">
        <a class="fq-brand" data-nav="index.html" href="index.html"><span class="fq-brand__mark">F</span>FinanceIQ</a>
        <a class="fq-home" href="../">ivanglushchenko.com</a>
      </div>
      <nav class="fq-nav" aria-label="FinanceIQ sections">${links}</nav>`;
    const current = $(".fq-nav [aria-current]");
    if (current && current.scrollIntoView) current.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function renderFooter() {
    const d = state.data;
    $("#fq-footer").innerHTML = `
      <p><strong>Data:</strong> ${esc(d.source)}. Last successful update ${esc(d.generated)}.
        Annual figures in US dollars, shown as first reported. <a data-nav="methodology.html" href="methodology.html">Methodology</a></p>
      <p><strong>Educational project, not investment advice.</strong> Scores and valuations here are learning tools built on stated
        assumptions. They do not predict share prices and are not recommendations to buy or sell anything.</p>
      <p>Built by Ivan Glushchenko. <a data-nav="about.html" href="about.html">About this project</a> · <a href="../">ivanglushchenko.com</a></p>`;
  }

  /* ---------------- guided tour ---------------- */

  const TOUR = [
    { page: "overview", text: "<strong>Pick two companies.</strong> Use the two menus to choose any pair. Every page then updates for that pair. Apple and Microsoft are loaded to start." },
    { page: "health", text: "<strong>Financial Health Score.</strong> Each company gets a score from 0 to 100, built from 19 measures in five categories. The bars show where each one is strong or weak." },
    { page: "health", focus: "#weights", text: "<strong>Change what matters.</strong> Click the Conservative preset, or drag a slider. The weights always re-balance to 100% and both scores update at once." },
    { page: "valuation", text: "<strong>DCF valuation.</strong> Drag the growth or discount-rate slider and watch the value per share move. The table at the bottom shows how much the answer depends on just two assumptions." },
    { page: "research", text: "<strong>Ivan's Financial Research.</strong> Each case study starts from a question, tests it against the filings and ends with Ivan's own conclusion." },
  ];

  function tourGo(step) {
    if (step < 0 || step >= TOUR.length) { sessionStorage.removeItem("fq.tour"); renderTour(); return; }
    sessionStorage.setItem("fq.tour", String(step));
    const target = PAGES.find((p) => p.id === TOUR[step].page);
    if (target.id === state.cfg.page) renderTour();
    else location.href = target.file + `#${state.a}-${state.b}`;
  }

  function renderTour() {
    let host = $("#fq-tour");
    const raw = sessionStorage.getItem("fq.tour");
    const step = raw === null ? -1 : Number(raw);
    if (step < 0 || !TOUR[step] || TOUR[step].page !== state.cfg.page) { if (host) host.remove(); return; }
    if (!host) { host = document.createElement("aside"); host.id = "fq-tour"; host.className = "fq-tour"; host.setAttribute("aria-label", "Guided tour"); document.body.appendChild(host); }
    const s = TOUR[step], last = step === TOUR.length - 1;
    host.innerHTML = `
      <div class="fq-tour__text"><span class="fq-tour__step">Tour · step ${step + 1} of ${TOUR.length}</span>${s.text}</div>
      <div class="fq-tour__btns">
        ${step > 0 ? `<button type="button" data-tour="${step - 1}">Back</button>` : ""}
        <button type="button" data-tour="-1">${last ? "Finish" : "End tour"}</button>
        ${last ? "" : `<button type="button" class="fq-btn--primary" data-tour="${step + 1}">Next</button>`}
      </div>`;
    $$("[data-tour]", host).forEach((b) => b.addEventListener("click", () => tourGo(Number(b.dataset.tour))));
    if (s.focus && $(s.focus)) $(s.focus).scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* ---------------- saved settings ---------------- */

  const getWeights = () => store.get("weights", { ...Calc.PRESETS.Default });
  const score = (company) => Calc.scoreCompany(company, getWeights());

  // DCF assumptions for one company: the saved ones if the user changed them, else the defaults.
  function dcfInputs(company) {
    const defaults = Calc.dcfDefaults(company);
    const saved = store.get("dcf." + company.ticker, null);
    // saved assumptions are only reused if they were made for the same fiscal year
    return saved && saved.fy === company.L.fy ? { ...defaults, ...saved.inputs, custom: true } : { ...defaults, custom: false };
  }
  const saveDcf = (company, inputs) => store.set("dcf." + company.ticker, { fy: company.L.fy, inputs });
  const resetDcf = (company) => store.remove("dcf." + company.ticker);

  /* ---------------- start ---------------- */

  async function start(cfg) {
    state.cfg = cfg;
    renderNav(cfg.page);
    try {
      const [data, summaries] = await Promise.all([getJSON("data/financials.json"), getJSON("data/summaries.json")]);
      state.data = data; state.summaries = summaries;
      data.companies.forEach((c) => { Calc.derive(c); state.byTicker[c.ticker] = c; });
      state.list = data.companies;
      renderFooter();
      const saved = store.get("pair", null);
      const pair = pairFromHash() || (saved && known(saved[0]) && known(saved[1]) && saved[0] !== saved[1] ? saved : DEFAULT_PAIR);
      window.addEventListener("hashchange", () => { const p = pairFromHash(); if (p && (p[0] !== state.a || p[1] !== state.b)) setPair(p[0], p[1], false); });
      await setPair(pair[0], pair[1], Boolean(cfg.usesPair));
      // index.html?tour=1 starts the guided tour (used by the link on the main site)
      if (new URLSearchParams(location.search).get("tour") === "1") {
        sessionStorage.setItem("fq.tour", "0");
        history.replaceState(null, "", location.pathname + location.hash);
      }
      renderTour();
    } catch (err) {
      console.error(err);
      document.body.classList.remove("fq-is-loading");
      $("#app").innerHTML = `<div class="fq-card fq-error" role="alert"><strong>The financial data could not be loaded.</strong>
        <p>Check your connection and refresh the page. If you opened this file directly from your computer, start a local web server instead (see the README).</p></div>`;
    }
  }

  // Redraw charts when the window width changes.
  function onResize(fn) {
    let timer, width = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      clearTimeout(timer); timer = setTimeout(fn, 150);
    });
  }

  return {
    SITE_URL, COLORS, PAGES, GLOSSARY, state, term, store, getText, poss, swatch, md, parseDoc,
    setPair, rerender, start, onResize, tourGo, getWeights, score, dcfInputs, saveDcf, resetDcf,
    company: (t) => state.byTicker[t],
    peers: (group) => state.list.filter((c) => c.group === group),
  };
})();
