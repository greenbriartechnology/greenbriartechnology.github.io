import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { NAV } from '../src/consts';

// Automated accessibility scan. Runs axe-core against each page and fails on any
// WCAG 2.1 A/AA violation. This is content-agnostic — it checks structure,
// contrast, labels, and roles, not the wording — so it keeps protecting
// accessibility as the copy changes.

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

// Every nav page, plus a 404 page (rendered for an unknown route).
const PAGES = [...NAV.map((item) => item.href), '/this-route-does-not-exist'];

for (const path of PAGES) {
  test(`accessibility: ${path}`, async ({ page }) => {
    await page.goto(path);
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();

    // Compact summary so a failure points at the rule + count, not a wall of JSON.
    const summary = violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
    }));
    expect(summary, `axe found accessibility violations on ${path}`).toEqual([]);
  });
}
