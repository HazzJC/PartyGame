import { expect, test } from '@playwright/test';
import { hostGame, joinAsPlayer } from './helpers.ts';

test('landing links to credits', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Sticker Party' })).toBeVisible();
  await page.getByRole('link', { name: 'Credits' }).click();
  await expect(page.getByRole('heading', { name: 'Credits' })).toBeVisible();
  await expect(page.getByText('SIL Open Font License').first()).toBeVisible();
});

test('how-to-play intro, then an extra key rolls the dice', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Learner');
  for (let i = 0; i < 3; i++) await p.page.getByRole('button', { name: '+ Bot' }).tap();
  await p.page.getByRole('button', { name: 'Quick' }).tap();
  await p.page.getByLabel(/How-to-play intro/).click();
  await expect(p.page.getByLabel(/How-to-play intro/)).toBeChecked();

  // Bind J as an extra confirm key before the game starts.
  await p.page.getByRole('button', { name: 'Menu' }).tap();
  await p.page.getByRole('button', { name: /Preferences/ }).tap();
  await p.page.getByRole('button', { name: 'Extra key for Confirm / action', exact: true }).tap();
  await p.page.keyboard.press('j');
  await expect(p.page.getByRole('button', { name: 'Extra key for Confirm / action', exact: true })).toHaveText('J');
  await p.page.getByRole('dialog', { name: 'Preferences' }).getByRole('button', { name: 'Done' }).tap();
  await p.page.getByRole('dialog', { name: 'Menu' }).getByRole('button', { name: 'Close' }).tap();

  await p.page.getByRole('button', { name: 'Start game' }).tap();
  await expect(page.locator('.tut-card')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.tut-card h1')).toHaveText('Collect the most stars');
  await page.screenshot({ path: 'test-results/tutorial-host.png' });
  // The only human pressing Got it skips the rest.
  await p.page.getByRole('button', { name: 'Got it' }).tap();
  await expect(p.page.getByRole('button', { name: /Roll!/ })).toBeVisible({ timeout: 10_000 });
  await p.page.keyboard.press('j');
  await expect(p.page.getByLabel(/Rolled [1-6]/)).toBeVisible();
  await p.ctx.close();
});

test('host lobby fits a laptop window: Start is on screen and the join QR scans', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/host');
  const start = page.getByRole('button', { name: 'Start game' });
  await expect(start).toBeVisible({ timeout: 15_000 });
  const box = (await start.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(720);
  await expect(page.getByRole('img', { name: /^Join [A-Z]{4}$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Test sound' })).toBeVisible();
  await expect(page.getByText(/Share this tab with audio in Discord/)).toBeVisible();
  // Options live in a dialog so the lobby never grows past the stage.
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Game options' }).getByRole('button', { name: 'Cards' })).toBeVisible();
});

test('host sound check enables browser audio and reports readiness', async ({ page }) => {
  await page.goto('/host');
  await page.getByRole('button', { name: 'Test sound' }).click();
  await expect(page.getByRole('status')).toHaveText('Audio ready');
  await expect(page.getByText('Sound check played on this host.')).toBeVisible();
});

test('host options: volume and animation level are saved in this browser', async ({ page }) => {
  await page.goto('/host');
  const options = page.getByRole('button', { name: 'Host options: sound and animation' });
  await expect(options).toBeVisible({ timeout: 15_000 });
  await options.click();
  await page.getByRole('slider', { name: 'Volume' }).fill('0.3');
  await page.getByRole('group', { name: 'Animation' }).getByRole('button', { name: 'Low' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'low');
  await page.getByRole('button', { name: 'Mute' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Host options: sound and animation' }).click();
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Unmute' }).click();
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('0.3');
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'low');
  // Clicking away closes the panel.
  await page.mouse.click(400, 300);
  await expect(page.getByRole('dialog', { name: 'Host options' })).toBeHidden();
});
