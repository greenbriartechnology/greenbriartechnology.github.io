import { test, expect } from '@playwright/test';

// Behavioral tests for site-wide features that aren't covered by the structural
// crawl. These assert behavior, not copy, so content edits won't break them.

test('unknown routes return a 404 with a way back home', async ({ page }) => {
  const res = await page.goto('/this-route-does-not-exist');
  expect(res?.status()).toBe(404);
  // The 404 page should still let the user recover.
  await expect(page.locator('a[href="/"]').first()).toBeVisible();
});

test('mobile nav toggle reveals and hides the menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/');

  const toggle = page.getByRole('button', { name: /toggle navigation/i });
  const firstNavLink = page.locator('#primary-nav a').first();

  // On a narrow viewport the hamburger shows and the menu starts collapsed.
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(firstNavLink).not.toBeInViewport();

  // Opening reveals the menu...
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(firstNavLink).toBeInViewport();

  // ...and toggling again hides it.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(firstNavLink).not.toBeInViewport();
});
