// Ad-hoc external link checker. Run manually (not in CI) with:
//
//   npm run check:links
//
// It builds the site, scans the generated HTML in dist/ for external <a> links,
// and actually fetches each one to report its status. This is deliberately kept
// out of CI because some destinations (e.g. LinkedIn) block automated requests
// and would make CI flaky — here those show up as a WARN you can eyeball.
//
// Exit code is non-zero only for definite breakage (404/410/5xx/DNS), so it's
// still usable as a quick gate when you want one.

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST = 'dist';
const OWN_DOMAIN = 'greenbriartechnology.com';
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 6;

// A realistic UA reduces (but won't eliminate) bot-blocking.
const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// Statuses that signal bot-protection rather than a broken link.
const BLOCKED = new Set([401, 403, 405, 406, 429, 999]);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

// Map of external URL -> Set of pages it appears on.
async function collectLinks(files) {
  const links = new Map();
  const anchor = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    for (const [, href] of html.matchAll(anchor)) {
      if (!/^https?:\/\//i.test(href)) continue;
      let url;
      try {
        url = new URL(href);
      } catch {
        continue;
      }
      if (url.hostname === OWN_DOMAIN || url.hostname.endsWith(`.${OWN_DOMAIN}`)) continue;
      if (!links.has(href)) links.set(href, new Set());
      links.get(href).add(file.replace(`${DIST}/`, '/').replace(/index\.html$/, '').replace(/\.html$/, ''));
    }
  }
  return links;
}

async function check(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: HEADERS,
      signal: controller.signal,
    });
    const status = res.status;
    if (status >= 200 && status < 300) return { kind: 'ok', status, final: res.url };
    if (BLOCKED.has(status)) return { kind: 'blocked', status, final: res.url };
    return { kind: 'broken', status, final: res.url };
  } catch (err) {
    return { kind: 'error', status: 0, detail: err.name === 'AbortError' ? 'timeout' : err.message };
  } finally {
    clearTimeout(timer);
  }
}

// Tiny concurrency-limited map.
async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        results[idx] = await fn(items[idx], idx);
      }
    })
  );
  return results;
}

const files = await htmlFiles(DIST).catch(() => {
  console.error(`Could not read ${DIST}/. Run \`npm run build\` first.`);
  process.exit(2);
});

const links = await collectLinks(files);
const urls = [...links.keys()].sort();

if (urls.length === 0) {
  console.log('No external links found.');
  process.exit(0);
}

console.log(`Checking ${urls.length} external link(s) from ${files.length} page(s)...\n`);

const checked = await pool(urls, CONCURRENCY, async (url) => ({ url, ...(await check(url)) }));

const mark = { ok: 'OK  ', blocked: 'WARN', broken: 'FAIL', error: 'FAIL' };
let failures = 0;
let warnings = 0;

for (const r of checked) {
  if (r.kind === 'broken' || r.kind === 'error') failures++;
  if (r.kind === 'blocked') warnings++;
  const detail = r.kind === 'error' ? r.detail : r.status;
  console.log(`${mark[r.kind]}  ${String(detail).padEnd(7)} ${r.url}`);
  if (r.kind === 'broken' || r.kind === 'error') {
    for (const page of links.get(r.url)) console.log(`         ↳ on ${page}`);
  }
}

console.log(
  `\n${checked.length} checked · ${checked.length - failures - warnings} ok · ${warnings} warn (likely bot-blocked) · ${failures} failed`
);
if (warnings) {
  console.log('WARN = the site refused our automated request; open it in a browser to confirm.');
}

process.exit(failures > 0 ? 1 : 0);
