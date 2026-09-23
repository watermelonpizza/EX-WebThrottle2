import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/throttles');
});

test('app shell loads and shows the throttle stub', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Throttles' })).toBeVisible();
  await expect(page.getByTestId('navigation-drawer')).toBeVisible();
});

test('navigates to another stub from the navigation rail', async ({ page }) => {
  // The drawer starts hidden behind the menu button below the md breakpoint.
  if ((page.viewportSize()?.width ?? 1280) < 960) {
    await page.getByTestId('nav-toggle').click();
  }

  await page
    .locator('[data-test="navigation-drawer"]')
    .getByText('Settings')
    .click();
  await expect(page).toHaveURL(/#\/settings/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});

test('theme toggle switches between light and dark', async ({ page }) => {
  const toggle = page.getByTestId('theme-toggle');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-label', /Switch to light theme/);
});
