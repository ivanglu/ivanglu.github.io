// Small enhancements for the main page. The page works without them.
(function () {
  "use strict";

  // Keep the footer year current without a yearly edit.
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Light / dark switch (theme.js does the work).
  var toggle = document.getElementById("theme-toggle");
  if (toggle && window.SiteTheme) {
    var label = function () { toggle.setAttribute("aria-pressed", String(window.SiteTheme.current() === "light")); };
    label();
    toggle.addEventListener("click", function () { window.SiteTheme.toggle(); label(); });
  }

  // Highlight the nav link whose section is in view.
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
  var sections = navLinks.map(function (a) { return document.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if (!("IntersectionObserver" in window) || sections.length === 0) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var id = "#" + entry.target.id;
      navLinks.forEach(function (a) {
        var on = a.getAttribute("href") === id;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
      });
    });
  }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });

  sections.forEach(function (s) { observer.observe(s); });
})();
