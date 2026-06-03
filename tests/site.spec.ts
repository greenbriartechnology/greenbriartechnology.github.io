import { test, expect } from '@playwright/test';

const NAV_PAGES = ['/', '/services', '/approach', '/work', '/about', '/contact'];

const MEMBERS = [
  { name: 'Josef Schroeter', linkedin: 'https://www.linkedin.com/in/josefschroeter/' },
  { name: 'Michael Deskevich', linkedin: 'https://www.linkedin.com/in/michael-deskevich-2498b1279/' },
  { name: 'Matthew Ball', linkedin: 'https://www.linkedin.com/in/matthewvball/' },
];

test('home page loads and is branded', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Greenbriar/);
});

test('every primary nav page returns 200', async ({ page }) => {
  for (const path of NAV_PAGES) {
    const response = await page.goto(path);
    expect(response?.status(), `expected 200 for ${path}`).toBe(200);
  }
});

test('primary navigation has the expected links', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header nav, nav').first();
  for (const label of ['Services', 'Approach', 'Work', 'About', 'Contact']) {
    await expect(nav.getByRole('link', { name: label, exact: true }).first()).toBeVisible();
  }
  // The standalone Team page was folded into About — it should no longer be in the nav.
  await expect(page.getByRole('link', { name: 'Team', exact: true })).toHaveCount(0);
});

test('the team content lives on the About page', async ({ page }) => {
  await page.goto('/about');
  for (const member of MEMBERS) {
    await expect(page.getByText(member.name, { exact: false }).first()).toBeVisible();
    await expect(page.locator(`a[href="${member.linkedin}"]`)).toHaveCount(1);
  }
});

test('the old /team route no longer exists', async ({ page }) => {
  const response = await page.goto('/team');
  expect(response?.status()).toBe(404);
});
