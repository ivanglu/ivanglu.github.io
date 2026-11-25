/* ============================================================
   FinanceIQ shared page code: loading data, navigation, search,
   company selection, themes, saved settings and the guided tour.

   Every page calls  Core.start({ page, mode, render })  once.
     mode "single"  one company, address ends in  #NVDA       render(company)
     mode "pair"    two companies, address ends in #NVDA-MSFT  render(A, B)
     mode "none"    no company selected                        render()
   `render` is called again whenever the selection changes.
   ============================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
// Escape text before putting it into HTML.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const Core = (() => {
  const SITE_URL = "https://ivanglushchenko.com/financeiq/";
  const DEFAULT_PAIR = ["AAPL", "MSFT"];
  // One color per company slot, in a fixed order: A blue, B orange, C green, D amber. Checked for colorblind separation.
  const COLORS = ["var(--series-a)", "var(--series-b)", "var(--series-c)", "var(--series-d)"];
  const MAX_COMPARE = 4;

  // Main navigation. `section` groups the comparison pages under one entry.
  const NAV = [
    { id: "dashboard", file: "index.html", label: "Dashboard" },
    { id: "screener", file: "screener.html", label: "Screener" },
    { id: "compare", file: "compare.html", label: "Compare" },
    { id: "watchlist", file: "watchlist.html", label: "Watchlist" },
    { id: "research", file: "research.html", label: "Research" },
    { id: "methodology", file: "methodology.html", label: "Methodology" },
  ];
  const COMPARE_PAGES = [
    { id: "compare", file: "compare.html", label: "Summary" },
    { id: "health", file: "health.html", label: "Financial Health" },
    { id: "valuation", file: "valuation.html", label: "DCF valuation" },
    { id: "trends", file: "trends.html", label: "Trends" },
    { id: "benchmarks", file: "benchmarks.html", label: "Benchmarks" },
    { id: "report", file: "report.html", label: "PDF report" },
  ];
  const SINGLE_FILES = ["company.html"];

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
    enterpriseValue: "The value of the whole business, belonging to lenders and shareholders together: market value + debt − cash.",
    equityValue: "Enterprise value minus debt plus cash: the part that belongs to shareholders.",
    median: "The middle value when the group is sorted. Half the companies are above it and half below.",
    tenK: "Form 10-K: the audited annual report every US public company files with the SEC.",
    tenQ: "Form 10-Q: the quarterly report filed with the SEC for the first three quarters of each fiscal year.",
    ttm: "Trailing twelve months: the last four quarters added together, so the figure is always a full year and always recent.",
    yoy: "Year over year: compared with the same period one year earlier, which removes seasonal effects.",
    acceleration: "The change in a growth rate. Growth of 20% after 30% is still growth, but it is decelerating by 10 points.",
    pe: "Price-to-earnings: share price ÷ earnings per share over the last twelve months. Not meaningful when earnings are negative.",
    marketCap: "Market capitalization: share price × number of shares. What the stock market says the equity is worth.",
    wacc: "Weighted average cost of capital: the blended return that lenders and shareholders require, used as the discount rate.",
    percentile: "Position within a group, from 0 (lowest) to 100 (highest). Here the group is the companies FinanceIQ tracks, not the whole market.",
    momentum: "The tendency of shares that have done well recently to keep doing well for a while, and the reverse. Measured from past prices.",
    relativeStrength: "A share's return minus the return of a benchmark over the same period.",
  };

  const state = { data: null, summaries: null, byTicker: {}, list: [], a: null, b: null, extra: [], cfg: null, market: null, marketInfo: null, ratings: {}, history: [] };

  /* ---------------- small helpers ---------------- */

  // A word with a tooltip definition. Focusable so it works from the keyboard.
  const term = (key, label) => (GLOSSARY[key]
    ? `<span class="fq-term" tabindex="0" data-tip="${esc(GLOSSARY[key])}">${esc(label)}</span>` : esc(label));

  const store = {
    get(key, fallback) { try { const v = localStorage.getItem("fq." + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem("fq." + key, JSON.stringify(value)); } catch (e) { /* private mode: ignore */ } },
    remove(key) { try { localStorage.removeItem("fq." + key); } catch (e) { /* ignore */ } },
  };

  async function getJSON(url, optional = false) {
    // "no-cache" makes the browser check with the server every time, so a data update is never
    // hidden behind an old cached copy. (Scripts and styles carry a ?v= version number for the same reason.)
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) { if (optional) return null; throw new Error(url + " returned " + res.status); }
    return res.json();
  }
  const getText = (url) => fetch(url, { cache: "no-cache" }).then((r) => (r.ok ? r.text() : "")).catch(() => "");

  // Apple -> Apple's, Starbucks -> Starbucks', McDonald's -> McDonald's
  const poss = (name) => (name.endsWith("'s") ? name : name.endsWith("s") ? name + "'" : name + "'s");
  const swatch = (i) => `<i class="fq-swatch" style="background:${COLORS[i]}"></i>`;
  const known = (t) => Boolean(state.byTicker[t]);

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

  // Ivan's files: optional "key: value" lines, then one "## heading" per section.
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

  /* ---------------- search box with suggestions ---------------- */

  // Turns an <input> into a combobox: type to filter, arrow keys to move, Enter to choose.
  //   onSelect(ticker)   called when a company is chosen
  //   exclude()          ticker to leave out (the other company on a comparison page)
  //   emptyList()        companies to show before anything is typed (recent ones, or all)
  function combo(input, { onSelect, exclude = () => null, emptyList = () => [], keepValue = false }) {
    const list = document.createElement("ul");
    const id = "fq-list-" + Math.random().toString(36).slice(2, 8);
    list.className = "fq-combo__list"; list.id = id; list.setAttribute("role", "listbox"); list.hidden = true;
    input.parentElement.appendChild(list);
    input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", id); input.setAttribute("aria-expanded", "false"); input.setAttribute("autocomplete", "off");
    let items = [], active = -1;

    const close = () => { list.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); active = -1; };
    const highlight = () => {
      $$("li", list).forEach((li, i) => li.setAttribute("aria-selected", i === active));
      if (active >= 0) { input.setAttribute("aria-activedescendant", `${id}-${active}`); $$("li", list)[active].scrollIntoView({ block: "nearest" }); }
    };
    const open = () => {
      const text = input.value.trim();
      const skip = [].concat(exclude() || []);
      items = (text ? Screen.search(state.list, text, 10) : emptyList()).filter((c) => !skip.includes(c.ticker));
      if (!items.length) {
        list.innerHTML = `<li class="fq-combo__none" role="option" aria-disabled="true">${text ? `No supported company matches "${esc(text)}". FinanceIQ tracks ${state.list.length} companies.` : "Type a ticker or company name"}</li>`;
      } else {
        list.innerHTML = (text ? "" : `<li class="fq-combo__head" role="presentation">${input.dataset.emptyLabel || "Companies"}</li>`) + items.map((c, i) => {
          const r = state.ratings[c.ticker];
          return `<li role="option" id="${id}-${i}" data-i="${i}"><b>${esc(c.ticker)}</b><span>${esc(c.name)}</span><small>${esc(c.group === "Other" ? c.blurb : c.group)}</small>${r && r.grade ? `<i class="fq-grade fq-grade--${r.grade} fq-grade--sm">${r.grade}</i>` : ""}</li>`;
        }).join("");
      }
      active = text && items.length ? 0 : -1;
      list.hidden = false; input.setAttribute("aria-expanded", "true"); highlight();
    };
    const choose = (c) => { if (!c) return; input.value = keepValue ? `${c.name} (${c.ticker})` : ""; close(); onSelect(c.ticker); };

    input.addEventListener("input", open);
    input.addEventListener("focus", () => { if (keepValue) input.select(); open(); });
    input.addEventListener("blur", () => setTimeout(() => { close(); if (keepValue && input.dataset.current) input.value = input.dataset.current; }, 150));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (list.hidden) { open(); return; }
        if (!items.length) return;
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; highlight();
      } else if (e.key === "Enter") {
        if (!list.hidden && items.length) { e.preventDefault(); choose(items[Math.max(0, active)]); }
      } else if (e.key === "Escape") { close(); }
    });
    list.addEventListener("mousedown", (e) => { const li = e.target.closest("li[data-i]"); if (li) { e.preventDefault(); choose(items[Number(li.dataset.i)]); } });
    return { open, close };
  }

  const recent = () => store.get("recent", []).map((t) => state.byTicker[t]).filter(Boolean);
  function remember(ticker) { store.set("recent", [ticker, ...store.get("recent", []).filter((t) => t !== ticker)].slice(0, 6)); }
  const byGroup = () => [...state.list].sort((x, y) => (x.group === "Other") - (y.group === "Other") || x.group.localeCompare(y.group) || x.name.localeCompare(y.name));

  /* ---------------- selection ---------------- */

  // #NVDA -> ["NVDA"], #NVDA-MSFT -> ["NVDA", "MSFT"], #NVDA-MSFT-AMD-INTC -> up to four. Unknown or repeated tickers are dropped.
  function fromHash() {
    if (!/^#[A-Z]+(-[A-Z]+){0,3}$/.test(location.hash)) return null;
    const list = [...new Set(location.hash.slice(1).split("-"))].filter(known);
    return list.length ? list : null;
  }

  // A sensible second company: a peer from the same group, else the default.
  function partnerFor(a) {
    const saved = store.get("pair", null);
    if (saved && saved[0] === a && known(saved[1])) return saved[1];
    const c = state.byTicker[a];
    const peer = state.list.find((p) => p.group === c.group && p.ticker !== a && c.group !== "Other");
    return peer ? peer.ticker : DEFAULT_PAIR.find((t) => t !== a);
  }

  const hashFor = (file) => (SINGLE_FILES.includes(file) ? `#${state.a}` : `#${state.a}-${state.b}`);

  // extra: the third and fourth companies. Only the Compare summary page uses them.
  function select(a, b, updateHash = true, extra = state.extra) {
    state.a = a; state.b = b || partnerFor(a);
    state.extra = state.cfg.multi ? (extra || []).filter((t) => known(t) && t !== state.a && t !== state.b).slice(0, MAX_COMPARE - 2) : [];
    store.set("pair", [state.a, state.b]);
    const single = state.cfg.mode === "single";
    if (single) remember(a);
    const all = [state.a, state.b, ...state.extra].join("-");
    if (updateHash) history.replaceState(null, "", location.pathname + location.search + (single ? `#${a}` : `#${all}`));
    $$("a[data-nav]").forEach((el) => { el.href = el.dataset.nav + (state.a ? hashFor(el.dataset.nav) : ""); });
    if (state.cfg.mode === "pair") renderPicker();
    return rerender();
  }
  const setPair = (a, b, updateHash = true) => select(a, b, updateHash);

  function rerender() {
    document.body.classList.remove("fq-is-loading");
    const A = state.byTicker[state.a], B = state.byTicker[state.b];
    if (state.cfg.mode === "single") return state.cfg.render(A);
    if (state.cfg.mode === "pair") return state.cfg.render(A, B, state.extra.map((t) => state.byTicker[t]));
    return state.cfg.render();
  }

  // Search boxes for the comparison pages. Type to filter, or focus to see every company.
  // The Compare summary page (cfg.multi) can hold up to four companies; the other comparison pages use two.
  function renderPicker() {
    const host = $("#fq-picker");
    if (!host) return;
    const label = (t) => `${state.byTicker[t].name} (${t})`;
    const chosen = () => [state.a, state.b, ...state.extra];
    const box = (id, t, i, name) => `
      <label class="fq-pick"><span class="fq-pick__label">${swatch(i)}${name}${i >= 2 ? ` <button type="button" class="fq-linkbtn" data-drop="${t}" aria-label="Take ${esc(state.byTicker[t].name)} out of the comparison">take out</button>` : ""}</span>
        <span class="fq-combo"><input id="${id}" type="text" value="${esc(label(t))}" data-current="${esc(label(t))}" data-empty-label="All companies" aria-label="${name}: type a ticker or name"></span></label>`;
    const canAdd = state.cfg.multi && chosen().length < MAX_COMPARE;
    host.innerHTML = `
      <form class="fq-picker" aria-label="Choose companies to compare">
        ${box("pickA", state.a, 0, "Company A")}
        <button type="button" id="swap" class="fq-swap" title="Swap A and B" aria-label="Swap companies A and B">⇄</button>
        ${box("pickB", state.b, 1, "Company B")}
        ${state.extra.map((t, i) => box("pick" + i, t, i + 2, "Company " + "CD"[i])).join("")}
        ${canAdd ? `<label class="fq-pick fq-pick--add"><span class="fq-pick__label">Add a company (up to ${MAX_COMPARE})</span>
          <span class="fq-combo"><input id="pickAdd" type="text" placeholder="+ Type a ticker or name" aria-label="Add another company to compare"></span></label>` : ""}
      </form>
      ${state.cfg.multi ? "" : `<p class="fq-small fq-muted" style="margin:8px 0 0">This page compares two companies. To compare up to four, use the <a href="compare.html#${chosen().join("-")}">Summary</a> page.</p>`}`;
    const notIn = (me) => { const o = chosen().filter((t) => t !== me); return () => o; };
    combo($("#pickA"), { keepValue: true, exclude: notIn(state.a), emptyList: byGroup, onSelect: (t) => select(t, state.b) });
    combo($("#pickB"), { keepValue: true, exclude: notIn(state.b), emptyList: byGroup, onSelect: (t) => select(state.a, t) });
    state.extra.forEach((t, i) => combo($("#pick" + i), { keepValue: true, exclude: notIn(t), emptyList: byGroup,
      onSelect: (n) => select(state.a, state.b, true, state.extra.map((x, k) => (k === i ? n : x))) }));
    if (canAdd) combo($("#pickAdd"), { exclude: () => chosen(), emptyList: byGroup, onSelect: (n) => select(state.a, state.b, true, [...state.extra, n]) });
    $("#swap").addEventListener("click", () => select(state.b, state.a));
    $$("[data-drop]", host).forEach((btn) => btn.addEventListener("click", (e) => {
      e.preventDefault(); select(state.a, state.b, true, state.extra.filter((x) => x !== btn.dataset.drop));
    }));
    $(".fq-picker", host).addEventListener("submit", (e) => e.preventDefault());
  }

  /* ---------------- page furniture ---------------- */

  // The theme is shared with the main site (../theme.js): saved choice, else the device setting.
  const applyTheme = () => {
    if (document.body.dataset.fixedTheme || !window.SiteTheme) return;
    document.documentElement.setAttribute("data-theme", window.SiteTheme.current());
  };

  function renderNav(page) {
    const host = $("#fq-nav");
    if (!host || host.hidden) return;
    const section = COMPARE_PAGES.some((p) => p.id === page) ? "compare" : page;
    const links = NAV.map((p) => `<a data-nav="${p.file}" href="${p.file}" ${p.id === section ? 'aria-current="page"' : ""}>${p.label}</a>`).join("");
    const sub = section === "compare" ? `<nav class="fq-subnav" aria-label="Comparison pages">${COMPARE_PAGES.map((p) =>
      `<a data-nav="${p.file}" href="${p.file}" ${p.id === page ? 'aria-current="page"' : ""}>${p.label}</a>`).join("")}</nav>` : "";
    host.innerHTML = `
      <div class="fq-top__bar">
        <a class="fq-brand" href="index.html"><span class="fq-brand__mark">F</span>FinanceIQ</a>
        <span class="fq-combo fq-search"><input id="fq-search" type="search" placeholder="Search ticker or company" aria-label="Search for a company by ticker or name" data-empty-label="Recently viewed"></span>
        <span class="fq-top__right">
          <button type="button" class="fq-iconbtn" id="fq-theme" aria-label="Switch between light and dark theme" title="Light / dark">◐</button>
          <a class="fq-home" href="about.html">About</a>
          <a class="fq-home fq-hide-sm" href="../">ivanglushchenko.com</a>
        </span>
      </div>
      <nav class="fq-nav" aria-label="FinanceIQ sections">${links}</nav>${sub}`;
    $("#fq-theme").addEventListener("click", () => { if (window.SiteTheme) window.SiteTheme.toggle(); applyTheme(); window.dispatchEvent(new Event("fq-theme")); });
  }

  function wireSearch() {
    const input = $("#fq-search");
    if (!input) return;
    combo(input, {
      emptyList: () => (recent().length ? recent() : byGroup().slice(0, 8)),
      onSelect: (t) => { location.href = `company.html#${t}`; if (location.pathname.endsWith("company.html")) select(t); },
    });
    if (!recent().length) input.dataset.emptyLabel = "Companies";
    // "/" jumps to the search box, like most research sites
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); input.focus(); }
    });
  }

  function renderFooter() {
    const host = $("#fq-footer");
    if (!host || host.hidden) return;
    const d = state.data, m = state.marketInfo;
    host.innerHTML = `
      <p><strong>Financial data:</strong> ${esc(d.source)}. Last successful update ${esc(d.generated)}. Dollar figures are shown as first reported.
        <strong>Market data:</strong> ${m ? `${esc(m.source)}, prices to ${esc(m.asOf)}.` : "none. FinanceIQ has no licensed price feed yet, so the Quantitative and Valuation grades are not shown."}
        <a href="methodology.html">Methodology</a></p>
      <p><strong>Educational project, not investment advice.</strong> Grades, scores and valuations are built from published rules and stated assumptions.
        They describe the past. They do not predict share prices, and an A is not a recommendation to buy.</p>
      <p>Built by Ivan Glushchenko. <a href="about.html">About this project</a> · <a href="tests/">Tests</a> · <a href="../">ivanglushchenko.com</a></p>`;
  }

  /* ---------------- guided tour ---------------- */

  const TOUR = [
    { page: "dashboard", text: "<strong>Search for a company.</strong> Type a ticker or name in the search box (try NV) and pick one. The dashboard below shows the highest-graded companies in each category." },
    { page: "company", text: "<strong>One company, five grades.</strong> Each stock is graded on fundamentals, earnings momentum and financial quality from SEC filings. Open any grade to see every measure behind it." },
    { page: "screener", text: "<strong>Screen all companies.</strong> Sort by any column, filter by grade or sector, or start from a ready-made screen. Tick two rows to compare them." },
    { page: "valuation", text: "<strong>DCF valuation.</strong> Drag the growth or discount-rate slider and watch the value per share move. The sensitivity table shows how much the answer depends on two assumptions." },
    { page: "research", text: "<strong>Ivan's Financial Research.</strong> Each case study starts from a question, tests it against the filings and ends with Ivan's own conclusion." },
  ];
  const TOUR_FILES = { dashboard: "index.html", company: "company.html", screener: "screener.html", valuation: "valuation.html", research: "research.html" };

  function tourGo(step) {
    if (step < 0 || step >= TOUR.length) { sessionStorage.removeItem("fq.tour"); renderTour(); return; }
    sessionStorage.setItem("fq.tour", String(step));
    const target = TOUR[step].page;
    if (target === state.cfg.page) { renderTour(); return; }
    const a = state.a || DEFAULT_PAIR[0], b = state.b || partnerFor(a);
    location.href = TOUR_FILES[target] + (target === "company" ? `#${a}` : target === "valuation" ? `#${a}-${b}` : "");
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
  }

  /* ---------------- saved settings ---------------- */

  const getWeights = () => store.get("weights", { ...Calc.PRESETS.Default });
  const score = (company) => Calc.scoreCompany(company, getWeights());
  const ratingWeights = () => store.get("ratingWeights", { ...Ratings.PRESETS.Balanced });
  function setRatingWeights(w) { store.set("ratingWeights", w); state.ratings = Ratings.rateAll(state.list, state.market, w); }

  // DCF assumptions for one company: the saved ones if the user changed them, else the defaults.
  function dcfInputs(company) {
    const defaults = Calc.dcfDefaults(company);
    const m = state.market && state.market[company.ticker];
    if (m) defaults.price = m.v.price;
    const saved = store.get("dcf." + company.ticker, null);
    // saved assumptions are only reused if they were made for the same fiscal year
    return saved && saved.fy === company.L.fy ? { ...defaults, ...saved.inputs, custom: true } : { ...defaults, custom: false };
  }
  const saveDcf = (company, inputs) => store.set("dcf." + company.ticker, { fy: company.L.fy, inputs });
  const resetDcf = (company) => store.remove("dcf." + company.ticker);

  const watchlist = () => store.get("watchlist", []).filter(known);
  const toggleWatch = (ticker) => { store.set("watchlist", Screen.toggle(store.get("watchlist", []), ticker)); return watchlist().includes(ticker); };

  // Change in a company's rating between the two most recent stored snapshots (null if there is only one).
  function ratingChange(ticker) {
    const h = state.history;
    if (h.length < 2) return null;
    const ch = Ratings.changes(h[h.length - 2].ratings[ticker], h[h.length - 1].ratings[ticker]);
    return ch ? { ...ch, fromDate: h[h.length - 2].date, toDate: h[h.length - 1].date } : null;
  }

  /* ---------------- market data (optional) ---------------- */

  // data/prices.json exists only when a licensed price source has been connected (tools/build_prices.py).
  // Without it the site still works: the two market-based grades simply show as unavailable.
  function loadMarket(file) {
    if (!file || !file.series) return;
    const bench = file.series[file.benchmark];
    state.market = {};
    for (const c of state.list) {
      const s = file.series[c.ticker];
      if (!s || !s.close || s.close.length < 30) continue;
      const price = s.close[s.close.length - 1];
      state.market[c.ticker] = { q: Quant.metrics(s, bench || null), v: Calc.valuation(c, price) || { price }, series: s };
    }
    state.marketInfo = { source: file.source, asOf: file.dates[file.dates.length - 1], dates: file.dates, benchmark: file.benchmark,
                         benchSeries: bench, showPrices: Boolean(file.license && file.license.displayPrices), attribution: file.license && file.license.attribution };
    if (!Object.keys(state.market).length) { state.market = null; state.marketInfo = null; }
  }

  /* ---------------- start ---------------- */

  async function start(cfg) {
    cfg.mode = cfg.mode || (cfg.usesPair ? "pair" : "none");
    state.cfg = cfg;
    applyTheme();
    renderNav(cfg.page);
    try {
      const [data, summaries, prices, history] = await Promise.all([
        getJSON("data/financials.json"), getJSON("data/summaries.json"),
        getJSON("data/prices.json", true).catch(() => null), getJSON("data/ratings-history.json", true).catch(() => null),
      ]);
      state.data = data; state.summaries = summaries;
      data.companies.forEach((c) => { Calc.derive(c); state.byTicker[c.ticker] = c; });
      state.list = data.companies;
      loadMarket(prices);
      // only snapshots made with the current methodology can be compared with each other
      state.history = (history && history.snapshots ? history.snapshots : []).filter((h) => h.version === Ratings.VERSION);
      state.ratings = Ratings.rateAll(state.list, state.market, ratingWeights());
      renderFooter();
      wireSearch();

      const saved = store.get("pair", null);
      const sel = fromHash() || (saved && known(saved[0]) ? saved : DEFAULT_PAIR);
      if (cfg.multi) state.extra = sel.slice(2);
      window.addEventListener("hashchange", () => {
        const p = fromHash();
        if (p && p.join("-") !== [state.a, state.b, ...state.extra].join("-")) select(p[0], p[1] || (cfg.mode === "pair" ? state.b : null), false, p.slice(2));
      });
      // index.html?tour=1 starts the guided tour (used by the link on the main site)
      if (new URLSearchParams(location.search).get("tour") === "1") {
        sessionStorage.setItem("fq.tour", "0");
        history.replaceState(null, "", location.pathname + location.hash);
      }
      await select(sel[0], sel[1] && sel[1] !== sel[0] ? sel[1] : null, cfg.mode !== "none");
      renderTour();
    } catch (err) {
      console.error(err);
      document.body.classList.remove("fq-is-loading");
      $("#app").innerHTML = `<div class="fq-card fq-error" role="alert"><strong>The financial data could not be loaded.</strong>
        <p>Check your connection and refresh the page. If you opened this file directly from your computer, start a local web server instead (see the README).</p></div>`;
    }
  }

  // Redraw charts when the window width or the theme changes.
  function onResize(fn) {
    let timer, width = window.innerWidth;
    window.addEventListener("resize", () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      clearTimeout(timer); timer = setTimeout(fn, 150);
    });
  }

  return {
    SITE_URL, COLORS, MAX_COMPARE, GLOSSARY, state, term, store, getText, poss, swatch, md, parseDoc, combo,
    select, setPair, rerender, start, onResize, tourGo, getWeights, score, ratingWeights, setRatingWeights,
    dcfInputs, saveDcf, resetDcf, watchlist, toggleWatch, ratingChange, byGroup,
    company: (t) => state.byTicker[t],
    rating: (t) => state.ratings[t],
    peers: (group) => state.list.filter((c) => c.group === group),
  };
})();
