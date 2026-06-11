# Greenbriar Technology Group — Website

<p align="center">
  <img src="assets/profile.png" alt="Greenbriar Technology Group" width="96" height="96" />
</p>

The static marketing site for **Greenbriar Technology Group**, live at
[www.greenbriartechnology.com](https://www.greenbriartechnology.com).

Built with [Astro](https://astro.build) (plain static HTML/CSS, minimal JS) and
deployed automatically to **GitHub Pages** on every push to `main`. Design: a
fixed-width "teletype" aesthetic — mint green primary, burnt orange secondary,
IBM Plex Mono.

Hosting, the custom domain, HTTPS, and the apex→www redirect are already
configured. This README covers day-to-day maintenance.

## Local development

Requires **Node.js 24+**.

```sh
npm install      # install dependencies (also enables the git hooks)
npm run dev      # dev server at http://localhost:4321
npm run build    # build to ./dist
npm run preview  # preview the production build
npm run lint     # astro check (well-formed pages + types) + eslint
npm test         # Playwright tests (first run: npx playwright install --with-deps chromium)
npm run check:links  # fetch every external link, report OK/WARN/FAIL (ad hoc)
```

## Editing content

- **Site-wide info** (name, tagline, email, location, nav links): `src/consts.ts`.
- **Page copy**: edit the matching file in `src/pages/`. Most pages keep their
  content in a small data array at the top of the file.
- **Team members**: the `members` array in `src/pages/about.astro` — name, bio,
  LinkedIn, and photo. Bios are currently empty; add real text there. For
  photos, drop a square image (≥600×600) in `public/team/` and point the `photo`
  field at it (e.g. `/team/jane-doe.jpeg`). Don't hotlink LinkedIn images —
  those URLs are signed and expire.
- **Colors / fonts / spacing**: the CSS custom properties at the top of
  `src/styles/global.css` (`--mint`, `--orange`, `--paper`, `--mono`, ...).

## Adding a page

1. Create `src/pages/<name>.astro` (copy an existing page for the layout).
2. Add it to the `NAV` array in `src/consts.ts` so it shows in the nav and footer.

The test suite automatically checks the new page is reachable, well-formed,
link-clean, and accessible.

## Fonts

IBM Plex Mono is **self-hosted** in `public/fonts/` (woff2, weights 400/500/700,
latin + latin-ext) and declared via `@font-face` in `src/styles/global.css` — so
the site makes no render-blocking request to Google's font servers. The rules use
`font-display: optional`, so the font never swaps mid-view and contributes no
layout shift (CLS); a first uncached visit on a slow link may briefly see the
monospace fallback before the font is cached. To refresh or
add a weight, fetch the CSS from the Google Fonts css2 endpoint with a modern
browser User-Agent, download the `latin` / `latin-ext` `.woff2` files it points
to, drop them in `public/fonts/`, and mirror the `@font-face` block (keeping the
`unicode-range`). The body weight (400 latin) is preloaded in `Layout.astro`.

## Brand icons

`public/favicon.svg` is the single source of truth for the mark (a mint G
sheltering the Shanahan Ridge mineshaft headframe in burnt orange, on a
transparent background with a thin dark outline so it reads on any surface).
It is also shown in the site header next to the brand name. The raster derivatives —
`public/favicon.ico` (the legacy multi-size fallback, 16/32/48&nbsp;px) and
`assets/profile.png` (512&nbsp;px, used as the GitHub org avatar and the badge at
the top of this README) — are generated from it:

```sh
node scripts/gen-icons.mjs   # re-run after editing favicon.svg
```

`assets/` lives outside the Astro build, so the profile image isn't published to
the website. To set the org avatar, upload `assets/profile.png` under the
organization's **Settings → Profile**.

## Quality checks

`npm run lint` and `npm test` run in CI on every pull request
(`.github/workflows/ci.yml`) and gate merges into `main`:

- **`tests/links.spec.ts`** — crawls every page: 200 status, well-formed
  `<head>`, no broken links or images, no uncaught JS errors, valid in-page
  anchors, nav reachability, every image reserves its space (width+height or
  `aspect-ratio`), and no CSS/fonts loaded from third-party origins.
- **`tests/cls.spec.ts`** — measures Cumulative Layout Shift on every page and
  fails if it exceeds a tight budget (catches images/fonts that load without
  reserved space).
- **`tests/site.spec.ts`** — behavior: the 404 page and the mobile nav toggle.
- **`tests/a11y.spec.ts`** — an [axe-core](https://github.com/dequelabs/axe-core)
  WCAG 2.1 A/AA scan on every page.

A `pre-commit` hook (`.githooks/pre-commit`, enabled by `npm install`) blocks
direct commits to the protected `main` branch — work on a feature branch and
open a PR. External links aren't checked in CI (some hosts block bots), so run
`npm run check:links` by hand when you change them.

## Deploying

Automatic: every push to `main` builds and publishes via
`.github/workflows/deploy.yml`. The custom domain (`public/CNAME`), HTTPS, and
apex→www redirect are already set up — there's nothing to do.

## Project structure

```text
assets/                  # brand assets NOT published to the site (GitHub profile image)
public/                  # copied verbatim into the build (CNAME, favicon, team photos, fonts)
src/
├── components/           # Nav, Footer, PageHeader, CallToAction
├── layouts/Layout.astro  # base HTML shell, <head>, fonts, nav + footer
├── pages/                # one file per route (index, services, approach, work, about, contact, 404)
├── styles/global.css     # theme + all shared styles
└── consts.ts             # site info + nav links
tests/                    # Playwright tests (structure, behavior, a11y)
scripts/                  # ad-hoc external link checker + icon generator
.github/workflows/        # ci.yml (lint + tests), deploy.yml (build + deploy)
```

## License

© Greenbriar Technology Group. All rights reserved.
