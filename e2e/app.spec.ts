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

  await expect(page.getByTestId('commander-power')).toBeVisible();
  await expect(page.getByTestId('track-power-A')).toContainText('Main');
});

test('saves and drives a locomotive on the emulator', async ({ page }) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  await page.getByTestId('new-loco-address').fill('7');
  await page.getByTestId('new-loco-name').fill('Shunter');
  await page.getByTestId('add-loco').click();

  await expect(page.getByTestId('roster-7')).toContainText('Shunter');

  await page.getByTestId('drive').click();

  const throttle = page.getByTestId('throttle-panel');
  const slider = page.getByTestId('speed-slider');
  const direction = page.getByTestId('direction-toggle');
  const forward = direction.getByRole('button', { name: 'Forward' });
  const reverse = direction.getByRole('button', { name: 'Reverse' });
  const headlight = page.locator('[data-test="fun"][data-function="0"]');
  const trace = page.getByTestId('trace-list');

  await expect(throttle).toBeVisible();
  await expect(slider).toBeVisible();
  await expect(trace).toContainText('<t 7>');
  await expect(trace).toContainText('<l 7');

  if ((await headlight.getAttribute('class'))?.includes('is-selected')) {
    const receivedCount = await trace.locator('.received').count();

    await headlight.click();
    await expect(headlight).not.toHaveClass(/is-selected/);
    await expect
      .poll(() => trace.locator('.received').count())
      .toBeGreaterThan(receivedCount);
  }

  await forward.click();
  await slider.evaluate((element) => {
    if (!(element instanceof HTMLInputElement)) {
      throw new TypeError('speed slider is not an input');
    }

    element.value = '12';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect(slider).toHaveValue('12');
  await expect(forward).toHaveAttribute('aria-pressed', 'true');
  await expect(trace).toContainText('<t 7 12 1>');
  await expect(trace).toContainText('<l 7 0 141 0>');

  await reverse.click();

  await expect(reverse).toHaveAttribute('aria-pressed', 'true');
  await expect(trace).toContainText('<t 7 12 0>');
  await expect(trace).toContainText('<l 7 0 13 0>');

  await headlight.click();

  await expect(headlight).toHaveClass(/is-selected/);
  await expect(trace).toContainText('<F 7 0 1>');
  await expect(trace).toContainText('<l 7 0 13 1>');

  await page.getByTestId('estop').click();

  await expect(slider).toHaveValue('0');
  await expect(reverse).toHaveAttribute('aria-pressed', 'true');
  await expect(trace).toContainText('<t 7 -1 0>');
  await expect(trace).toContainText('<l 7 0 1 1>');
});

test('powers the commander and each track from the status bar', async ({
  page,
}) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  const commander = page.getByTestId('commander-power');
  const mainTrack = page.getByTestId('track-power-A');

  await expect(mainTrack).toBeVisible();
  await expect(commander).toBeEnabled();
  await expect(mainTrack).toBeEnabled();

  const commanderWasOn =
    (await commander.getAttribute('aria-pressed')) === 'true';
  const switchedState = String(!commanderWasOn);

  await commander.click();
  await expect(commander).toHaveAttribute('aria-pressed', switchedState);
  await expect(mainTrack).toHaveAttribute('aria-pressed', switchedState);

  await mainTrack.click();
  await expect(mainTrack).toHaveAttribute(
    'aria-pressed',
    String(commanderWasOn),
  );
  await expect(commander).toHaveAttribute('aria-pressed', switchedState);
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

test('throws a seeded turnout and receives its broadcast', async ({ page }) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  const command = page.getByTestId('command-input');
  const send = page.getByTestId('send-command');
  const trace = page.getByTestId('trace-list');

  await command.fill('<T 1 C>');
  await send.click();
  await command.fill('<T 1 T>');
  await send.click();

  await expect(trace).toContainText('<T 1 T>');
  await expect(trace).toContainText('<H 1 1>');
});

test('operates the turnouts, outputs and sensors the station reports', async ({
  page,
}) => {
  await page.getByTestId('connect-emulator').click();
  await expect(page.getByTestId('shell-status')).toContainText('connected');

  const turnout = page.getByTestId('turnout-1');
  const toggle = page.getByTestId('turnout-toggle-1');
  const outputSwitch = page.getByTestId('output-10');
  const output = outputSwitch.locator('input');
  const trace = page.getByTestId('trace-list');

  await expect(turnout).toContainText('Turnout 1');
  await expect(page.getByTestId('sensor-20')).toContainText('Clear');

  // The emulator keeps its state between tests, so switch whichever way the
  // station currently reports and expect the opposite back.
  const closing = (await toggle.innerText()).trim() === 'Close';

  await toggle.click();

  await expect(trace).toContainText(closing ? '<T 1 C>' : '<T 1 T>');
  await expect(trace).toContainText(closing ? '<H 1 0>' : '<H 1 1>');
  await expect(turnout).toContainText(closing ? 'Closed' : 'Thrown');

  const switchingOn = !(await output.isChecked());

  // The switch is a styled label around a hidden checkbox, so the label is what
  // a person clicks.
  await outputSwitch.click();

  await expect(trace).toContainText(`<Z 10 ${switchingOn ? 1 : 0}>`);
  await expect(trace).toContainText(`<Y 10 ${switchingOn ? 1 : 0}>`);
  await expect(output).toBeChecked({ checked: switchingOn });
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
  await expect(page.getByTestId('track-power-A')).toBeVisible();

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
