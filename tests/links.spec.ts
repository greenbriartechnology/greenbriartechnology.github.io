import { test, expect } from '@playwright/test';

// Pages we expect the crawl to reach from the home page. If a new content page
// is added to the nav/footer, add it here so a regression that orphans it fails.
const EXPECTED_PAGES = ['/', '/services', '/approach', '/work', '/about', '/contact'];

// Strip a trailing slash (except on root) so '/about' and '/about/' compare equal.
function normPath(pathname: string): string {
  return pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

test('content pages are well-formed and every internal link is valid', async ({ page, baseURL }) => {
  const base = new URL(baseURL!);

  const toVisit: string[] = ['/'];
  const visited = new Set<string>();
  const idsByPath = new Map<string, Set<string>>();
  const anchorTargets: { from: string; dest: string; hash: string }[] = [];
  const externalLinks = new Set<string>();

  while (toVisit.length) {
    const path = toVisit.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    const res = await page.goto(path);
    expect(res?.status(), `internal page ${path} should return 200`).toBe(200);

    // Well-formed: exactly one <h1> and a non-empty <title>.
    await expect(page.locator('h1'), `${path} should have exactly one <h1>`).toHaveCount(1);
    expect((await page.title()).trim().length, `${path} should have a non-empty <title>`).toBeGreaterThan(0);

    // Record element ids so we can verify in-page anchor (#fragment) targets later.
    const ids = await page.locator('[id]').evaluateAll((els) => els.map((e) => e.id));
    idsByPath.set(path, new Set(ids));

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
        const dest = normPath(url.pathname);
        if (url.hash.length > 1) anchorTargets.push({ from: path, dest, hash: url.hash.slice(1) });
        if (!visited.has(dest) && !toVisit.includes(dest)) toVisit.push(dest);
      } else {
        externalLinks.add(url.href);
        // Security hygiene for links that open a new tab.
        if (target === '_blank') {
          expect(rel, `external _blank link ${url.href} on ${path} should set rel=noopener`).toContain('noopener');
        }
      }
    }
  }

  // Every in-page anchor target must exist on its destination page.
  for (const t of anchorTargets) {
    const ids = idsByPath.get(t.dest);
    expect(ids, `anchor #${t.hash} (linked from ${t.from}) points to un-crawled page ${t.dest}`).toBeTruthy();
    expect([...ids!], `#${t.hash} target should exist on ${t.dest} (linked from ${t.from})`).toContain(t.hash);
  }

  // Sanity: the crawl actually reached every page we expect to publish.
  for (const expected of EXPECTED_PAGES) {
    expect([...visited], `crawl should reach ${expected}`).toContain(expected);
  }

  // External links are format-checked above but intentionally NOT fetched:
  // targets like LinkedIn block automated requests, which would make CI flaky.
  expect(externalLinks.size, 'expected at least one external link (e.g. LinkedIn)').toBeGreaterThan(0);
});
