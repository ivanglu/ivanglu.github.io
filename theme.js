// Light / dark theme, shared by every page on the site (the main page and FinanceIQ).
// Runs in the <head> before the page is drawn, so there is no flash of the wrong theme.
// The choice is saved in this browser only, under the same key FinanceIQ uses.
(function () {
  "use strict";
  var KEY = "fq.theme";

  function saved() {
    try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }

  // No saved choice: follow the device setting.
  function current() {
    var s = saved();
    if (s === "light" || s === "dark") return s;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function apply() { document.documentElement.setAttribute("data-theme", current()); }

  window.SiteTheme = {
    current: current,
    toggle: function () {
      try { localStorage.setItem(KEY, JSON.stringify(current() === "light" ? "dark" : "light")); } catch (e) { /* private mode */ }
      apply();
    },
  };
  apply();
})();
