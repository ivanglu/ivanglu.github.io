/* About page: the factual sections are in about.html. Ivan's personal
   sections are loaded from about.txt and dropped into the marked places.
   Add ?draft=1 to the address to see the sections that are still empty. */

Core.start({
  page: "about",
  usesPair: false,
  async render() {
    const draft = new URLSearchParams(location.search).get("draft") === "1";
    const doc = Core.parseDoc(await Core.getText("about.txt"));
    let written = 0;
    $$("[data-ivan]").forEach((slot) => {
      const html = doc.sections[slot.dataset.ivan], title = slot.dataset.title;
      if (html) {
        written++;
        slot.innerHTML = `<h2>${esc(title)}</h2><div class="fq-card fq-ivan"><p class="fq-ivan__by">Written by Ivan Glushchenko</p>${html}</div>`;
      } else if (draft) {
        slot.innerHTML = `<h2>${esc(title)}</h2><div class="fq-todo"><strong>Draft view: not written yet.</strong><br>Add your text under the line <code>## ${esc(title.replace(", in my own words", ""))}</code> in <code>about.txt</code>.</div>`;
      }
    });
    if (draft) $("#a-status").innerHTML = `<p class="fq-note fq-note--warn">Draft view. Dashed boxes are sections still to be written. Visitors do not see them.</p>`;
    else if (!written) $("#a-status").innerHTML = `<p class="fq-note">Ivan's personal notes on why he built FinanceIQ and what he learned are being written and will appear on this page.</p>`;
  },
});
