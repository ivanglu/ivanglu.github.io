# ivanglu.com

Personal site. Plain HTML + CSS + a sprinkle of JS. No build step.

- Hosted on **GitHub Pages** from this repo's `main` branch.
- Custom domain **ivanglu.com** managed via **Cloudflare**.
- Auto-deploys: every push to `main` is live within ~30 seconds.

## Local preview

```sh
# From the project folder:
open index.html
```

That's it — no server, no npm install, no watchers.

## Editing

Every placeholder you need to fill in is marked `[EDIT ME]` in `index.html`.
Grep for it:

```sh
grep -n "EDIT ME" index.html
```

## Pushing changes

```sh
git add -A
git commit -m "update: short description"
git push
```

GitHub Pages picks it up automatically.

## Full deployment guide

See [`GUIDE.md`](GUIDE.md) for the first-time setup walkthrough
(GitHub account → repo → Pages → Cloudflare DNS).
