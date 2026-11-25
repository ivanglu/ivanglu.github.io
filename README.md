# ivanglushchenko.com

Ivan Glushchenko's personal site, plus FinanceIQ, a stock research tool in the `financeiq/` folder.
Plain HTML, CSS and JavaScript. No framework, no build step.

- Hosted on **GitHub Pages** from this repository's `main` branch.
- Custom domain **ivanglushchenko.com**, DNS through **Cloudflare**.
- Every push to `main` is live within a couple of minutes.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `script.js` | The main page |
| `theme.js` | Light and dark theme, shared with FinanceIQ so the choice carries across the whole site |
| `404.html` | Shown for any address that does not exist |
| `financeiq/` | FinanceIQ. It has its own [README](financeiq/README.md) and documentation |
| `GUIDE.md` | First-time setup: GitHub account, repository, Pages, Cloudflare DNS |

## Preview on your computer

FinanceIQ loads data files, which browsers block when a page is opened straight from disk, so use a small
local server. From this folder:

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765/

## Publishing a change

If you changed any `.js` or `.css` file, give the files a new version number first, so visitors' browsers
fetch the new versions instead of mixing old and new files:

```bash
python3 financeiq/tools/bump_version.py 3.1.1
```

Then run the tests and publish:

```bash
sh financeiq/tests/run.sh
```

```bash
git add -A
```

```bash
git commit -m "Short description of the change"
```

```bash
git push
```

## Still to fill in on the main page

These used to be reminder comments inside `index.html`. They were moved here so they are not in the public page source.

- **Python Horizon:** when the code is on GitHub, replace the line "Source code not published yet" with a link to it.
- **LinkedIn:** add a third contact card next to Email and GitHub once you have a profile.
- **A third project:** a school project, hackathon or script would fill out the Projects section.

FinanceIQ's own list of things for Ivan to write is in [financeiq/README.md](financeiq/README.md).
