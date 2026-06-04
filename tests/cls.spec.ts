import { test, expect } from '@playwright/test';
import { NAV } from '../src/consts';

// Cumulative Layout Shift (CLS) guard. CLS measures how much visible content
// jumps around as a page loads — images and fonts that arrive without reserved
// space are the usual culprits. We measure the real metric on every page and
// require it to stay near zero, so a regression (e.g. an image that lost its
// width/height) fails CI instead of quietly shipping a janky load.
//
// This complements the deterministic image-dimension check in links.spec.ts:
// that one guards the most common *cause*; this one guards the *symptom*, so it
// also catches shift from sources that aren't images — dynamically injected
// content, or a font that's allowed to swap mid-view (the @font-face rules use
// font-display: optional precisely so they never do).
//
// The budget is a small epsilon, not literal 0: even with no real shift, layout
// measurement carries sub-pixel rounding noise. Measured today, five of six
// pages are exactly 0 and the home page reads ~3e-5 (its typewriter animation).
// Google's "good" cutoff is 0.1; we hold 0.001 — comfortably above that noise
// floor, but well below the ~0.003 a single real regression (an undimensioned
// image, or a swapping web font) produces.
const CLS_BUDGET = 0.001;

for (const { href } of NAV) {
  test(`layout stability (CLS): ${href}`, async ({ page }) => {
    await page.goto(href);

    // Scroll the full height so lazy / below-the-fold images (e.g. the team
    // photos) load and any shift they cause is captured, then return to the top.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          let y = 0;
          const step = () => {
            window.scrollTo(0, y);
            y += window.innerHeight;
            if (y < document.body.scrollHeight) {
              requestAnimationFrame(step);
            } else {
              window.scrollTo(0, 0);
              resolve();
            }
          };
          step();
        })
    );

    // Total all layout-shift entries since navigation (buffered: true replays
    // the ones from initial load), ignoring any caused by user input. Give it a
    // beat to flush before reading.
    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              const shift = entry as PerformanceEntry & {
                value: number;
                hadRecentInput: boolean;
              };
              if (!shift.hadRecentInput) total += shift.value;
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => {
            observer.disconnect();
            resolve(total);
          }, 1000);
        })
    );

    expect(
      cls,
      `${href} should have near-zero cumulative layout shift (budget ${CLS_BUDGET})`
    ).toBeLessThanOrEqual(CLS_BUDGET);
  });
}
