# Deploy ivanglushchenko.com — first-time setup

A step-by-step guide to go from the files in this folder to a live site at
**https://ivanglushchenko.com**, with pushes auto-deploying.

Assumed starting state:

- You own **ivanglushchenko.com** at **Cloudflare Registrar**.
- You're on a Mac.
- You may or may not have a GitHub account yet.

Total time: **~25 minutes**, mostly waiting for DNS/SSL to propagate.

---

## Step 1 — Create a GitHub account (~3 min)

If you already have one, skip to Step 2.

1. Open https://github.com in your browser.
2. Click **Sign up** (top-right).
3. Enter your email, pick a password, and most importantly pick a **username**.
   - Pick something you'll be happy with for years. `ivanglushchenko` is already
     mentioned in the website files; if it's taken, you'll pick something else
     and I'll update the files for you.
4. Verify your email (GitHub sends a code).

> **Keep this username handy — you'll use it everywhere below.**

---

## Step 2 — Install GitHub Desktop (~3 min)

GitHub Desktop is a free app that handles pushing changes to GitHub without
needing the command line. Easier for a first-time setup.

1. Open https://desktop.github.com and download the Mac version.
2. Open the downloaded `.zip`, drag **GitHub Desktop** to Applications, launch it.
3. On the welcome screen, click **Sign in to GitHub.com**. It opens a browser
   tab, you log in, and it syncs back automatically.
4. On the "Configure Git" screen, use your real name + the email you signed up
   with. Click **Finish**.

(Prefer the command line? See **Appendix A** at the bottom.)

---

## Step 3 — Create the repository (~2 min)

The repo needs a very specific name for GitHub Pages to publish it to a URL
automatically.

1. In your browser, go to https://github.com/new
2. Fill in:
   - **Repository name:** `<your-username>.github.io`
     (e.g. if your GitHub username is `ivanglushchenko`, the repo is
     `ivanglushchenko.github.io`)
   - **Description:** `My personal website.`
   - **Public** (required for free GitHub Pages).
   - **Do NOT** check "Add a README" — we already have one.
   - **Do NOT** add a .gitignore — we have one.
3. Click **Create repository**.

You now have an empty repo. The page shows setup instructions — ignore them,
we'll do this through GitHub Desktop.

---

## Step 4 — Push your files to the repo (~5 min)

1. In **GitHub Desktop**, click **File → Add Local Repository**.
2. Click **Choose...** and navigate to:
   `/Users/ivanglushchenko/Desktop/Claude python/Personal webstie/`
3. GitHub Desktop will say "This directory does not appear to be a Git
   repository." Click **create a repository** on that message.
4. On the "Create a new repository" dialog:
   - **Name:** `<your-username>.github.io` (must match the GitHub repo name).
   - **Local path:** should already be filled in.
   - Click **Create repository**.
5. In the top-right of GitHub Desktop you'll see **Publish repository**. Click it.
6. In the dialog, make sure **Keep this code private** is **unchecked**. Click
   **Publish repository**.

Your files are now on GitHub. Open `https://github.com/<your-username>/<your-username>.github.io`
in a browser — you should see all the files listed.

---

## Step 5 — Turn on GitHub Pages (~2 min)

1. Still on your repo page, click the **Settings** tab (top of the page).
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, pick **main** and **/ (root)**. Click **Save**.
5. Wait ~1 minute, then refresh. You'll see a green banner:
   `Your site is live at https://<your-username>.github.io/`

Open that URL to verify — the site should work (though at this stage the custom
domain isn't connected yet).

GitHub also reads the `CNAME` file in your repo (it says `ivanglushchenko.com`)
and will automatically fill in the **Custom domain** field on the Pages page.
You should see a yellow warning like "Domain's DNS record could not be
retrieved." That's expected — we fix it next.

---

## Step 6 — Add DNS records in Cloudflare (~3 min)

Because you bought the domain through Cloudflare Registrar, the DNS zone is
already active. We just add 4 A records (apex) + 1 CNAME record (www).

1. Open https://dash.cloudflare.com and sign in.
2. Click your domain **ivanglushchenko.com** in the list.
3. In the left sidebar, click **DNS → Records**.
4. Click **Add record** and add each of these one at a time:

   | Type  | Name  | Content                   | Proxy status           | TTL  |
   |-------|-------|---------------------------|------------------------|------|
   | A     | `@`   | `185.199.108.153`         | **DNS only** (grey)    | Auto |
   | A     | `@`   | `185.199.109.153`         | **DNS only** (grey)    | Auto |
   | A     | `@`   | `185.199.110.153`         | **DNS only** (grey)    | Auto |
   | A     | `@`   | `185.199.111.153`         | **DNS only** (grey)    | Auto |
   | CNAME | `www` | `<your-username>.github.io` | **DNS only** (grey)   | Auto |

   > **Important:** click the orange cloud icon on each record to turn it **grey**
   > ("DNS only"). This lets GitHub provision the HTTPS certificate. Once SSL
   > is working you can turn the clouds back to orange if you want Cloudflare's
   > CDN features.

5. In the left sidebar, click **SSL/TLS → Overview** and set the mode to
   **Full**. (Not "Flexible" — that would double-encrypt and break things.)

Done with Cloudflare.

---

## Step 7 — Attach the custom domain in GitHub (~1 min)

1. Back on GitHub, go to your repo's **Settings → Pages**.
2. Under **Custom domain**, make sure `ivanglushchenko.com` is filled in.
   (It should be, because of the CNAME file.) Click **Save**.
3. GitHub starts a DNS check — this can take **a few minutes to a few hours**.
   You'll see:
   - First: a yellow "DNS check in progress."
   - Then: a green "DNS check successful. Your site is published at
     https://ivanglushchenko.com"
   - Finally: a green **Enforce HTTPS** checkbox becomes available —
     **tick it** to force all traffic over HTTPS.

If the DNS check stays yellow for more than an hour, see **Troubleshooting**
below.

---

## Step 8 — Verify

1. Open https://ivanglushchenko.com in your browser (incognito tab is safest to
   avoid caching).
2. You should see the dark-themed site with your name front and center.
3. Also test https://www.ivanglushchenko.com — it should redirect to the
   apex domain.

Congrats — you're live.

---

## Making changes going forward

The autodeploy loop is:

1. Edit files in `/Users/ivanglushchenko/Desktop/Claude python/Personal webstie/`
   (open `index.html` in any text editor — VS Code, TextEdit, Sublime).
2. Preview locally: double-click `index.html` or run
   `open "/Users/ivanglushchenko/Desktop/Claude python/Personal webstie/index.html"`
3. In **GitHub Desktop**, you'll see your changes listed under "Changes".
4. Type a short message in the "Summary" box at the bottom-left
   (e.g. "update about section"), click **Commit to main**.
5. Click **Push origin** (top-right).
6. GitHub rebuilds within ~30 seconds and your changes are live at
   https://ivanglushchenko.com.

That's the whole workflow.

---

## What to edit first

Open `index.html` and search for `[EDIT ME]`:

```sh
grep -n "EDIT ME" "/Users/ivanglushchenko/Desktop/Claude python/Personal webstie/index.html"
```

The placeholders to replace:

- **About section** — school name, graduation year, bio, intended field of study.
- **Facts card** — city, school, graduation year.
- **Interests** — one card currently reads `[EDIT ME]`; pick a real interest.
- **Projects** — the third card is a template; replace with a real project.
- **Contact** — three `href=` values (email, GitHub, LinkedIn).

The Python Horizon racing game project card is already filled in; replace the
`#` link in the "View on GitHub" button once you push that project to GitHub.

---

## Troubleshooting

### "DNS check in progress" is stuck for hours

- In Cloudflare → DNS → make sure all 5 records are **grey cloud** (DNS only),
  not orange (proxied). GitHub can't verify through a proxy.
- Make sure the A records point to `185.199.108.153` / `.109.153` / `.110.153` /
  `.111.153` and the CNAME at `www` points to `<your-username>.github.io`
  (with a trailing `.github.io`, not just `github.io`).
- You can check what Cloudflare is actually serving with:
  ```sh
  dig +short ivanglushchenko.com
  dig +short www.ivanglushchenko.com
  ```
  The first should show 4 GitHub Pages IPs. The second should show
  `<your-username>.github.io.`

### Site loads but shows "404 Not Found"

- Repo must be named exactly `<your-username>.github.io`. If it's named
  differently, GitHub Pages publishes under a path instead of the root — rename
  the repo in **Settings → General → Repository name**.
- The CNAME file inside the repo must contain exactly `ivanglushchenko.com` with
  no extra lines or spaces.

### Styles don't load / page is unstyled

- Make sure `styles.css` is in the repo root (same folder as `index.html`),
  not inside a subfolder.

### "This connection is not private" (SSL warning)

- GitHub needs 15 min to a few hours after DNS passes before SSL is ready.
  Grab a coffee and refresh.

---

## Appendix A — Command-line path (optional)

If you prefer Terminal over GitHub Desktop:

```sh
# One-time: install git if not already present (macOS prompts for Command Line
# Tools install the first time you run git).
git --version

# One-time: tell git who you are
git config --global user.name  "Ivan Glushchenko"
git config --global user.email "you@example.com"

# One-time: install GitHub CLI for easy auth
#   via Homebrew:
brew install gh
#   or download the Mac installer from https://cli.github.com

# Authenticate with GitHub via browser:
gh auth login
# → GitHub.com → HTTPS → "Login with a web browser" → paste the code into the browser.

# Initialize the repo and push:
cd "/Users/ivanglushchenko/Desktop/Claude python/Personal webstie"
git init -b main
git add -A
git commit -m "Initial site"
gh repo create <your-username>.github.io --public --source=. --push
```

After that, the loop is just:

```sh
cd "/Users/ivanglushchenko/Desktop/Claude python/Personal webstie"
git add -A
git commit -m "update: short description"
git push
```

---

## Appendix B — Why these settings

- **Repo name must match `<username>.github.io`.** This magic name tells GitHub
  Pages to publish at the user root path instead of under `/<reponame>/`. Any
  other name requires custom path config.
- **A records, not CNAME, at the apex.** DNS doesn't officially allow CNAME at
  a zone apex. Cloudflare does support "CNAME flattening" so a CNAME at `@`
  would work too, but A records to the GitHub Pages IPs are the officially
  documented approach, and GitHub's DNS verifier is happiest with them.
- **DNS only (grey cloud), not proxied (orange cloud).** GitHub Pages
  provisions a Let's Encrypt certificate for your domain by serving an HTTP-01
  challenge. If Cloudflare proxies that request, the challenge fails and no
  cert is issued. After HTTPS is working you can switch to proxied if you want
  Cloudflare's CDN / WAF — set SSL to **Full (strict)** when you do.
- **SSL mode "Full".** Cloudflare → GitHub Pages is already HTTPS. "Full" means
  Cloudflare also uses HTTPS to talk to GitHub Pages. "Flexible" would use HTTP
  behind the scenes, which GitHub Pages redirects, causing a loop.
