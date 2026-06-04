import { test, expect } from '@playwright/test';
import { NAV } from '../src/consts';

// Structural health of the whole site, independent of the actual copy. This
// crawls every page reachable from the home page and asserts things that should
// always be true no matter how the content changes — so it keeps catching real
// regressions (broken links, broken images, JS errors, missing <head> tags)
// without needing edits every time wording is updated.

// Strip a trailing slash (except on root) so '/about' and '/about/' compare equal.
function normPath(pathname: string): string {
  return pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

test('site is structurally healthy across every reachable page', async ({ page, baseURL }) => {
  const base = new URL(baseURL!);

  // Uncaught client-side exceptions on any page should fail the run.
  const jsErrors: string[] = [];
  let currentPath = '/';
  page.on('pageerror', (err) => jsErrors.push(`${currentPath}: ${err.message}`));

  const toVisit: string[] = ['/'];
  const visited = new Set<string>();
  const idsByPath = new Map<string, Set<string>>();
  const anchorTargets: { from: string; dest: string; hash: string }[] = [];
  const imageUrls = new Set<string>();

  while (toVisit.length) {
    const path = toVisit.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    currentPath = path;

    const res = await page.goto(path);
    expect(res?.status(), `internal page ${path} should return 200`).toBe(200);

    // Every page must be well-formed and SEO-complete in ways that don't depend
    // on the wording: one <h1>, a non-empty <title>, a meta description, and a
    // canonical link.
    await expect(page.locator('h1'), `${path} should have exactly one <h1>`).toHaveCount(1);
    expect((await page.title()).trim().length, `${path} should have a non-empty <title>`).toBeGreaterThan(0);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.trim().length ?? 0, `${path} should have a non-empty meta description`).toBeGreaterThan(0);
    await expect(page.locator('link[rel="canonical"]'), `${path} should have a canonical link`).toHaveCount(1);

    // Record element ids so we can verify in-page anchor (#fragment) targets later.
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
    idsByPath.set(path, new Set(ids));

    // Collect same-origin images so we can confirm none are broken (e.g. a
    // mistyped photo filename) without depending on which images exist.
    const imgSrcs = await page.locator('img[src]').evaluateAll((els) =>
      els.map((e) => (e as HTMLImageElement).getAttribute('src') ?? '')
    );
    for (const src of imgSrcs) {
      const url = new URL(src, base);
      if (url.origin === base.origin) imageUrls.add(url.href);
    }

    const anchors = await page.locator('a[href]').evaluateAll((els) =>
      els.map((e) => {
        const a = e as HTMLAnchorElement;
        return {
          href: a.getAttribute('href') ?? '',
          rel: a.getAttribute('rel') ?? '',
          target: a.getAttribute('target') ?? '',
        };
      })
    );

    for (const { href, rel, target } of anchors) {
      if (!href) throw new Error(`Empty href on ${path}`);

      // Pure in-page fragment, e.g. href="#main".
      if (href.startsWith('#')) {
        if (href.length > 1) anchorTargets.push({ from: path, dest: path, hash: href.slice(1) });
        continue;
      }

      if (href.startsWith('mailto:')) {
        expect(href, `mailto link on ${path}`).toMatch(/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/);
        continue;
      }

      let url: URL;
      try {
        url = new URL(href, base);
      } catch {
        throw new Error(`Malformed href "${href}" on ${path}`);
      }

      if (url.protocol !== 'http:' && url.protocol !== 'https:') continue;

      if (url.origin === base.origin) {
        // Internal page links must keep a trailing slash so they match what
        // GitHub Pages serves (/about/index.html) — a slash-less link costs every
        // visitor a 301 redirect per click. Asset links (favicon.svg, photos)
        // have a file extension and are exempt.
        const hasFileExtension = /\.[a-z0-9]+$/i.test(url.pathname);
        if (!hasFileExtension) {
          expect(
            url.pathname.endsWith('/'),
            `internal link "${href}" on ${path} should end with a trailing slash (avoids a 301 redirect)`
          ).toBe(true);
        }

        const dest = normPath(url.pathname);
        if (url.hash.length > 1) anchorTargets.push({ from: path, dest, hash: url.hash.slice(1) });
        if (!visited.has(dest) && !toVisit.includes(dest)) toVisit.push(dest);
      } else if (target === '_blank') {
        // Security hygiene: links that open a new tab must not leak window.opener.
        expect(rel, `external _blank link ${url.href} on ${path} should set rel=noopener`).toContain('noopener');
      }
    }
  }

  // Every in-page anchor target must exist on its destination page.
  for (const t of anchorTargets) {
    const ids = idsByPath.get(t.dest);
    expect(ids, `anchor #${t.hash} (linked from ${t.from}) points to un-crawled page ${t.dest}`).toBeTruthy();
    expect([...ids!], `#${t.hash} target should exist on ${t.dest} (linked from ${t.from})`).toContain(t.hash);
  }

  // No image on the site should 404.
  for (const imageUrl of imageUrls) {
    const imgRes = await page.request.get(imageUrl);
    expect(imgRes.status(), `image ${imageUrl} should load`).toBe(200);
  }

  // Every page in the nav must actually be reachable (catches an orphaned route
  // or a nav that silently rendered nothing). Sourced from the real NAV config,
  // so it stays correct as pages are added or removed.
  for (const { href } of NAV) {
    expect([...visited], `nav link ${href} should be reachable`).toContain(normPath(href));
  }

  expect(jsErrors, 'no page should throw an uncaught JS error').toEqual([]);
});
