import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/');
});

test('app loads to the connect page, then connects via the emulator', async ({
  page,
}) => {
  await expect(
    page.getByRole('heading', { name: 'WebThrottle' }),
  ).toBeVisible();
  await expect(page.getByTestId('connect-emulator')).toBeVisible();

  await page.getByTestId('connect-emulator').click();

  await expect(page.getByTestId('shell-status')).toContainText('connected');
  await expect(page.getByTestId('layout-panel')).toBeVisible();

  // The status bar shows the commander master switch plus each track.
  await expect(page.getByTestId('commander-power')).toBeVisible();
  await expect(page.getByTestId('track-power-A')).toContainText('Main');
  await expect(page.getByTestId('track-power-B')).toContainText('Programming');
});

test('saves and drives a locomotive on the emulator', async ({ page }) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  await page.getByTestId('new-loco-address').fill('7');
  await page.getByTestId('new-loco-name').fill('Shunter');
  await page.getByTestId('add-loco').click();

  await expect(page.getByTestId('roster-7')).toContainText('Shunter');

  await page.getByTestId('drive').click();

  await expect(page.getByTestId('throttle-panel')).toBeVisible();
  await expect(page.getByTestId('speed-slider')).toBeVisible();
});

test('powers the commander and each track from the status bar', async ({
  page,
}) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  const commander = page.getByTestId('commander-power');
  const mainTrack = page.getByTestId('track-power-A');

  await expect(commander).toHaveAttribute('aria-pressed', 'false');
  await expect(mainTrack).toHaveAttribute('aria-pressed', 'false');

  await commander.click();
  await expect(commander).toHaveAttribute('aria-pressed', 'true');
  await expect(mainTrack).toHaveAttribute('aria-pressed', 'true');

  await mainTrack.click();
  await expect(mainTrack).toHaveAttribute('aria-pressed', 'false');
  await expect(commander).toHaveAttribute('aria-pressed', 'true');
});

test('debug console is a workspace panel and sends a raw command', async ({
  page,
}) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  await expect(page.getByTestId('command-input')).toBeVisible();

  await page.getByTestId('command-input').fill('<1>');
  await page.getByTestId('send-command').click();

  await expect(page.getByTestId('trace-list')).toContainText('<1>');
});

test('settings holds the arrangement and theme controls, and the logo returns home', async ({
  page,
}) => {
  await page.getByTestId('settings-link').click();

  await expect(page).toHaveURL(/#\/settings/);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByTestId('new-map')).toBeVisible();
  await expect(page.getByTestId('arrangement-driving')).toBeVisible();
  await expect(page.getByTestId('theme-light')).toBeVisible();

  await page.getByTestId('arrangement-system').click();
  await expect(page.getByTestId('arrangement-system')).toHaveClass(
    /console-layout__choice--active/,
  );

  await page.getByTestId('theme-dark').click();
  await expect(page.getByTestId('theme-dark')).toHaveClass(
    /theme-picker__choice--active/,
  );

  await page.getByTestId('brand').click();

  await expect(page).toHaveURL(/#\/$/);
  await expect(
    page.getByRole('heading', { name: 'WebThrottle' }),
  ).toBeVisible();
});

test('switches the console arrangement from settings and disconnects', async ({
  page,
}) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  await page.getByTestId('settings-link').click();
  await page.getByTestId('arrangement-system').click();
  await page.getByTestId('brand').click();

  await expect(page.getByTestId('panel-debug')).toBeVisible();
  await expect(page.getByTestId('track-power-B')).toBeVisible();

  await page.getByTestId('disconnect').click();

  await expect(page.getByTestId('shell-status')).toContainText('disconnected');
  await expect(
    page.getByRole('heading', { name: 'WebThrottle' }),
  ).toBeVisible();
});

test('panels hide and come back from the settings screen', async ({ page }) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  await page.getByTestId('settings-link').click();

  // Panels are managed from Settings: hide the debug console, then bring it
  // back. There is no close button on the panel itself yet.
  await page.getByTestId('panel-toggle-debug').uncheck();
  await page.getByTestId('brand').click();
  await expect(page.getByTestId('command-input')).toBeHidden();

  await page.getByTestId('settings-link').click();
  await page.getByTestId('panel-toggle-debug').check();
  await page.getByTestId('brand').click();

  await expect(page.getByTestId('command-input')).toBeVisible();
});
