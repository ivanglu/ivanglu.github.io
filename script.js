// Keep the footer year current without needing a yearly edit.
(function () {
  "use strict";

  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Highlight the nav link whose section is in view (simple + no deps).
  const navLinks = Array.from(document.querySelectorAll(".nav__links a"));
  const sections = navLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if (!("IntersectionObserver" in window) || sections.length === 0) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = "#" + entry.target.id;
        navLinks.forEach((a) => {
          a.classList.toggle("is-active", a.getAttribute("href") === id);
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );

  sections.forEach((s) => observer.observe(s));
})();
