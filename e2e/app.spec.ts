import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { EMULATOR_URL } from './ports';

// These run against the host emulator (the real CommandStation-EX firmware,
// started by playwright.config.ts on its own port), so every reply is the
// firmware's own.

async function connect(page: Page, path = '/'): Promise<void> {
  await page.goto(`/#${path}`);

  // The emulator lives under "Other ways to connect"; it is already open in
  // browsers without Web Serial.
  const other = page.getByTestId('other-connections');

  if (
    !(await other.evaluate(element => (element as HTMLDetailsElement).open))
  ) {
    await page.getByTestId('other-connections-toggle').click();
  }

  await page.getByTestId('emulator-url').fill(EMULATOR_URL);
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('Connected');
}

// A turnout control that is on screen: the diagram on a desktop, route tiles
// on a phone.
function turnout(page: Page, id: number) {
  return page
    .locator(
      `[data-testid="diagram-turnout-${id}"]:visible, [data-testid="turnout-${id}"]:visible`,
    )
    .first();
}

test('opens on the connect page and connects to the emulator', async ({
  page,
}) => {
  await page.goto('/#/');

  await expect(
    page.getByRole('heading', { name: 'Connect to your Command Station' }),
  ).toBeVisible();
  await expect(page.getByTestId('stop-all')).toHaveCount(0);

  await connect(page);

  // Control is the default role; Stop all and track power are always there.
  await expect(page.getByTestId('role-control')).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByTestId('stop-all')).toBeVisible();
  await expect(page.getByTestId('track-power-A')).toBeVisible();
});

test('drives a loco: speed, direction, a function and stop', async ({
  page,
}) => {
  await connect(page, '/drive');

  await page.getByTestId('drive-address').fill('7');
  await page.getByTestId('drive-name').fill('Shunter');
  await page.getByTestId('drive').click();

  const desk = page.getByTestId('throttle-panel');

  await expect(desk).toContainText('Shunter');

  const slider = desk.getByTestId('speed-slider');

  await slider.fill('12');
  // The readout shows what the station reports back, not what was sent.
  await expect(desk.getByTestId('speed-readout')).toHaveText('12');

  const reverse = desk.getByTestId('direction-toggle').getByRole('button', {
    name: 'REV',
  });

  await reverse.click();
  await expect(reverse).toHaveAttribute('aria-pressed', 'true');

  const headlight = desk.locator('[data-testid="fun"][data-function="0"]');
  const before = await headlight.getAttribute('aria-pressed');

  await headlight.click();
  await expect(headlight).not.toHaveAttribute('aria-pressed', before ?? '');

  await desk.getByTestId('estop').click();
  await expect(desk.getByTestId('estop')).toHaveText('Stopped');
  await expect(desk.getByTestId('speed-readout')).toHaveText('0');
});

test('throws a turnout and shows it only once the station confirms', async ({
  page,
}) => {
  await connect(page, '/points');

  const first = turnout(page, 1);

  await expect(first).toHaveAttribute(
    'aria-label',
    /Turnout 1.*(closed|thrown)/,
  );

  const wasThrown = /thrown/.test(
    (await first.getAttribute('aria-label')) ?? '',
  );

  await first.click();
  await expect(first).toHaveAttribute(
    'aria-label',
    wasThrown ? /closed/ : /thrown/,
  );

  // The change is in the event log, from the strip, as the newest entry.
  await page.getByTestId('events-button').click();
  await expect(
    page.getByTestId('event-log').locator('li').first(),
  ).toContainText(`Turnout 1 ${wasThrown ? 'closed' : 'thrown'}`);
});

test('shows a sensor going occupied and clear', async ({ page }) => {
  await connect(page, '/diagnostics');

  // The emulator's layout puts sensor 20 (Platform 1) on pin 22. Pulling the
  // pin low is what its detector does; <z> drives the pin the same way the
  // firmware would on a real board.
  await page.getByTestId('command-input').fill('<z -22>');
  await page.getByTestId('send-command').click();

  await page.getByTestId('role-points').click();
  await expect(page.getByTestId('sensor-20')).toContainText('Occupied');

  await page.getByTestId('events-button').click();
  await expect(
    page.getByTestId('event-log').locator('li').first(),
  ).toContainText('Platform 1 occupied');
  await page.keyboard.press('Escape');

  await page.getByTestId('role-diagnostics').click();
  await page.getByTestId('command-input').fill('<z 22>');
  await page.getByTestId('send-command').click();

  await page.getByTestId('role-points').click();
  await expect(page.getByTestId('sensor-20')).toContainText('Clear');
});

test('opens Settings from the menu, and the wordmark goes back home', async ({
  page,
}) => {
  await connect(page);

  await page.getByTestId('app-menu-button').click();
  await expect(page.getByTestId('app-menu')).toBeVisible();

  // Choosing an item closes the menu.
  await page.getByTestId('menu-settings').click();
  await expect(page.getByTestId('page-title')).toHaveText('Settings');
  await expect(page.getByTestId('app-menu')).toBeHidden();

  await page.getByTestId('home').click();
  await expect(page.getByTestId('stop-all')).toBeVisible();
  await expect(page.getByTestId('page-title')).toHaveCount(0);
});

test('switches track power and stops everything from the strip', async ({
  page,
}) => {
  await connect(page);

  const main = page.getByTestId('track-power-A');
  const wasOn = (await main.getAttribute('aria-pressed')) === 'true';

  await main.click();
  await expect(main).toHaveAttribute('aria-pressed', String(!wasOn));

  // All tracks turns everything off while any track has power, and on only
  // when every track is off; either way the tracks then agree.
  const all = page.getByTestId('master-power');
  const expected
    = (await all.getAttribute('aria-pressed')) === 'false' ? 'true' : 'false';

  await all.click();
  await expect(all).toHaveAttribute('aria-pressed', expected);
  await expect(main).toHaveAttribute('aria-pressed', expected);

  await page.getByTestId('stop-all').click();

  await page.getByTestId('role-diagnostics').click();
  await expect(page.getByTestId('trace-list')).toContainText('<!>');
});

test('sends a raw command from Diagnostics and explains the reply', async ({
  page,
}) => {
  await connect(page, '/diagnostics');

  await page.getByTestId('command-input').fill('<s>');
  await page.getByTestId('send-command').click();

  const trace = page.getByTestId('trace-list');

  await expect(trace).toContainText('<iDCC-EX');

  // Coming back to Diagnostics opens the log at the latest traffic.
  await page.getByTestId('role-control').click();
  await page.getByTestId('role-diagnostics').click();
  await expect
    .poll(() =>
      trace.evaluate(
        list => list.scrollHeight - list.scrollTop - list.clientHeight,
      ))
    .toBeLessThan(2);

  await page
    .getByTestId('trace-row')
    .filter({ hasText: '<iDCC-EX' })
    .last()
    .click();
  await expect(page.getByTestId('trace-details').first()).toBeVisible();
});

test('warns before disconnecting while a loco is moving', async ({ page }) => {
  await connect(page, '/drive');

  await page.getByTestId('drive-address').fill('9');
  await page.getByTestId('drive').click();
  await page.getByTestId('speed-slider').fill('20');
  await expect(page.getByTestId('speed-readout')).toHaveText('20');

  await page.getByTestId('shell-status').click();
  await expect(page.getByTestId('disconnect-warning')).toContainText(
    'still moving',
  );

  await page.getByTestId('stop-and-disconnect').click();
  await expect(
    page.getByRole('heading', { name: 'Connect to your Command Station' }),
  ).toBeVisible();
});

test('remembers a theme choice', async ({ page }) => {
  await page.goto('/#/settings');

  await page.getByTestId('theme-contrast').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
});
