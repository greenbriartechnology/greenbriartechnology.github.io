# Greenbriar Technology Group — Website

The static marketing site for **Greenbriar Technology Group**, served at
[www.greenbriartechnology.com](https://www.greenbriartechnology.com).

Built with [Astro](https://astro.build), shipped as plain static HTML/CSS, and
deployed automatically to **GitHub Pages** via GitHub Actions. The design is a
clean, fast, fixed-width "teletype" aesthetic: mint green primary, burnt orange
secondary.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Local development](#local-development)
3. [Project structure](#project-structure)
4. [Editing content](#editing-content)
5. [Deploying to GitHub Pages](#deploying-to-github-pages)
6. [Configuring the domain in NameCheap](#configuring-the-domain-in-namecheap)
7. [Enabling HTTPS](#enabling-https)
8. [Apex → www redirect](#apex--www-redirect)
9. [Troubleshooting](#troubleshooting)

---

## Tech stack

- **Astro** — static site generator (no client framework, minimal JS)
- **Plain CSS** — a single global stylesheet, custom properties for theming
- **IBM Plex Mono** — the fixed-width typeface (loaded from Google Fonts)
- **GitHub Actions + GitHub Pages** — build and hosting

The only interactive touches are a typewriter effect in the hero and a mobile
navigation toggle. Everything else is static and works without JavaScript.

## Local development

Requires **Node.js 22.12+**.

```sh
npm install      # install dependencies (also enables the git hooks, see below)
npm run dev      # start dev server at http://localhost:4321
npm run build    # build production site to ./dist
npm run preview  # preview the production build locally
npm test         # build + run the Playwright smoke tests
```

### Tests

`npm test` runs the [Playwright](https://playwright.dev) smoke tests in `tests/`.
Playwright builds the site, serves it with `astro preview`, and checks that the
key pages load and that the team content renders on the About page. The same
suite runs in CI on every pull request (`.github/workflows/ci.yml`) and is the
required status check that gates merges into `main`.

First run only, install the browser:

```sh
npx playwright install --with-deps chromium
```

### Git hooks

A `pre-commit` hook (in `.githooks/`) refuses direct commits to `main`, which is
a protected branch — all work goes through a feature branch and a PR. The hook
is wired up automatically by `npm install` (via the `prepare` script, which sets
`git config core.hooksPath .githooks`). To bypass it for a single commit:
`git commit --no-verify`.

## Project structure

```text
/
├── public/                 # copied verbatim into the build
│   ├── CNAME               # custom domain for GitHub Pages (www.greenbriartechnology.com)
│   ├── favicon.svg         # terminal-prompt favicon
│   └── robots.txt
├── src/
│   ├── components/         # Nav, Footer, PageHeader, CallToAction, ...
│   ├── layouts/
│   │   └── Layout.astro    # base HTML shell, <head>, fonts, nav + footer
│   ├── pages/              # one file per route
│   │   ├── index.astro     # Home
│   │   ├── services.astro
│   │   ├── approach.astro
│   │   ├── work.astro      # case studies (placeholder)
│   │   ├── about.astro
│   │   ├── contact.astro
│   │   └── 404.astro
│   ├── styles/
│   │   └── global.css      # theme + all shared styles
│   └── consts.ts           # site name, domain, email, nav links
├── tests/                  # Playwright smoke tests
├── .githooks/
│   └── pre-commit          # blocks direct commits to main
├── .github/workflows/
│   ├── ci.yml              # build + Playwright tests (required check)
│   └── deploy.yml          # build + deploy to GitHub Pages
├── playwright.config.ts    # test runner + preview web server config
└── astro.config.mjs        # site URL + sitemap integration
```

## Editing content

- **Site-wide info** (name, email, nav, founding year): `src/consts.ts`
- **Page copy**: edit the matching file in `src/pages/`. Each page keeps its
  content in a small data array at the top of the file — replace the placeholder
  text, case studies, and team bios there.
- **Colors / fonts / spacing**: the CSS custom properties at the top of
  `src/styles/global.css` (`--mint`, `--orange`, `--paper`, `--mono`, ...).
- **Contact form**: `src/pages/contact.astro` currently points at a placeholder
  [Formspree](https://formspree.io) endpoint. Create a free form, paste your
  endpoint into the `<form action="...">`, or delete the form and rely on the
  `mailto:` link. (GitHub Pages is static and cannot process form posts itself.)

---

## Deploying to GitHub Pages

Deployment is automatic: **every push to `main` builds the site and publishes
it.** You only need to do the one-time setup below.

### 1. Push this repository to GitHub

If it isn't already on GitHub:

```sh
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Turn on GitHub Pages (GitHub Actions source)

1. On GitHub, open the repository → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.

That's it — there is no branch to choose. The included workflow
(`.github/workflows/deploy.yml`) builds with `npm run build` and deploys the
`dist/` folder.

### 3. Trigger the first deploy

Push any commit to `main` (or open the **Actions** tab and run the
**Deploy to GitHub Pages** workflow manually via *Run workflow*). When it
finishes, the **Actions** tab shows a green check and the deploy step prints the
live URL.

### 4. Set the custom domain in GitHub

1. Repository → **Settings** → **Pages** → **Custom domain**.
2. Enter `www.greenbriartechnology.com` and click **Save**.

   > The `public/CNAME` file already contains this domain, so GitHub will detect
   > it as well. Keeping the file in the repo ensures the domain survives every
   > deploy.

GitHub will now check DNS. Complete the NameCheap steps below so the check can
pass.

---

## Configuring the domain in NameCheap

You need two things in DNS:

- **`www`** → points at GitHub Pages via a **CNAME** record.
- **apex** (`greenbriartechnology.com` with no `www`) → points at GitHub's
  servers via **A / AAAA** records, so the bare domain resolves and can redirect
  to `www`.

### Steps

1. Sign in to NameCheap → **Domain List** → click **Manage** next to
   `greenbriartechnology.com`.
2. Open the **Advanced DNS** tab.
3. **Remove** any default parking records NameCheap added (e.g. a `CNAME` for
   `www` pointing to `parkingpage`, or an `URL Redirect`/`A` record for `@`
   pointing to a parking IP). Leaving these in place will break things.
4. Add the records in the table below with **Add New Record**.

| Type            | Host  | Value                          | TTL       |
| --------------- | ----- | ------------------------------ | --------- |
| `CNAME Record`  | `www` | `<your-username>.github.io.`   | Automatic |
| `A Record`      | `@`   | `185.199.108.153`              | Automatic |
| `A Record`      | `@`   | `185.199.109.153`              | Automatic |
| `A Record`      | `@`   | `185.199.110.153`              | Automatic |
| `A Record`      | `@`   | `185.199.111.153`              | Automatic |
| `AAAA Record`   | `@`   | `2606:50c0:8000::153`          | Automatic |
| `AAAA Record`   | `@`   | `2606:50c0:8001::153`          | Automatic |
| `AAAA Record`   | `@`   | `2606:50c0:8002::153`          | Automatic |
| `AAAA Record`   | `@`   | `2606:50c0:8003::153`          | Automatic |

Notes:

- Replace `<your-username>` with the GitHub account (or organization) that owns
  the repository. For a user/org site the CNAME target is
  `<your-username>.github.io` — **not** the repository name.
- In NameCheap, `Host = @` means the apex/bare domain; `Host = www` is the
  `www` subdomain. NameCheap appends the domain for you, so you do **not** type
  the full `www.greenbriartechnology.com`.
- The four A and four AAAA addresses are GitHub Pages' published IPs. The AAAA
  (IPv6) records are optional but recommended; if NameCheap rejects them you can
  safely omit them and keep just the A records.
- DNS changes can take from a few minutes up to ~30 minutes (occasionally
  longer) to propagate. You can check progress with
  `dig www.greenbriartechnology.com +short` and
  `dig greenbriartechnology.com +short`.

---

## Enabling HTTPS

GitHub Pages issues a free TLS certificate (Let's Encrypt) automatically once
DNS is pointing correctly.

1. Make sure the custom domain is set in **Settings → Pages** and the DNS check
   shows a green checkmark.
2. Wait for the **Enforce HTTPS** checkbox to become enabled (this can take a
   few minutes to a few hours after DNS resolves while the certificate is
   provisioned).
3. **Check "Enforce HTTPS".**

After this, all `http://` requests are redirected to `https://`.

> If **Enforce HTTPS** stays greyed out with a "certificate is being created"
> message, give it time. If it is stuck for more than 24 hours, remove and
> re-add the custom domain in Settings → Pages to force GitHub to re-run the
> certificate request.

---

## Apex → www redirect

This site treats `www.greenbriartechnology.com` as the canonical domain (it's
the value in `public/CNAME`).

**You do not need to configure the redirect manually.** Because the apex domain
(`greenbriartechnology.com`) is pointed at GitHub's A/AAAA records above, and the
custom domain in GitHub is set to the `www` host, **GitHub Pages automatically
redirects the bare domain to `https://www.greenbriartechnology.com`.**

So once DNS and the custom-domain setting are in place:

- `http://greenbriartechnology.com` → `https://www.greenbriartechnology.com`
- `https://greenbriartechnology.com` → `https://www.greenbriartechnology.com`
- `http://www...` → `https://www...`

No NameCheap "URL Redirect" record is needed — and you should **not** add one,
because it would conflict with the A records and the automatic redirect.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| DNS check in GitHub stays red | Parking records still present in NameCheap, or DNS hasn't propagated. Remove parking records; wait and re-check. |
| Site loads but CSS/links 404 | The `site`/`base` in `astro.config.mjs` must match the live URL. For this custom domain, `base` is `/`. |
| `Enforce HTTPS` greyed out | Certificate still provisioning. Wait, or remove/re-add the custom domain. |
| Apex domain doesn't redirect | Confirm the four A records (and optional AAAA) for `@` exist and no NameCheap URL-redirect record overrides them. |
| Custom domain disappears after deploy | Ensure `public/CNAME` is committed (it is) so each build re-publishes it. |
| Contact form does nothing | Wire up a Formspree (or similar) endpoint in `src/pages/contact.astro`, or use the `mailto:` link. |

---

## License

© Greenbriar Technology Group. All rights reserved.
