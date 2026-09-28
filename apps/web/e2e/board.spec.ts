import { expect, test } from '@playwright/test';
import { hostGame, joinAsPlayer } from './helpers.ts';

test('a board round: roll on the phone, pawns move on the host, colours pick the format', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Roller');
  for (let i = 0; i < 3; i++) await p.page.getByRole('button', { name: '+ Bot' }).tap();
  await p.page.getByRole('button', { name: 'Quick' }).tap();
  await p.page.getByRole('button', { name: 'Start game' }).tap();

  // Round banner, then the roll.
  await expect(p.page.getByRole('button', { name: /Roll!/ })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByLabel('Game board')).toBeVisible();
  await expect(page.getByLabel('Board space legend')).toBeVisible();
  await expect(p.page.getByRole('button', { name: 'Full map' })).toBeVisible();
  const near = await p.page.getByLabel('Game board').getAttribute('viewBox');
  await p.page.getByRole('button', { name: 'Full map' }).tap();
  expect(await p.page.getByLabel('Game board').getAttribute('viewBox')).not.toBe(near);
  await p.page.getByRole('button', { name: 'Near me' }).tap();
  expect(await p.page.getByLabel('Game board').getAttribute('viewBox')).toBe(near);
  await p.page.setViewportSize({ width: 844, height: 390 });
  await expect(p.page.getByRole('button', { name: 'Full map' })).toBeVisible();
  await p.page.getByRole('button', { name: 'Full map' }).click();
  await expect(p.page.getByLabel('Game board')).toBeVisible();
  await p.page.setViewportSize({ width: 390, height: 844 });
  await p.page.evaluate(() => { document.documentElement.dataset.motion = 'reduce'; document.documentElement.dataset.contrast = 'high'; });
  await expect(p.page.getByLabel('Game board')).toBeVisible();
  await page.screenshot({ path: 'test-results/board-roll.png' });
  await p.page.getByRole('button', { name: /Roll!/ }).tap();
  await expect(p.page.getByLabel(/Rolled [1-6]/)).toBeVisible();

  // If our route hits a junction, pick the first path from the private map.
  const choice = p.page.locator('.bp-choice').first();
  const landed = page.locator('.board-sides').or(page.locator('.spot-card'));
  await expect.poll(async () => (await choice.isVisible()) || (await landed.isVisible()), { timeout: 40_000, intervals: [100] }).toBe(true);
  if (await choice.isVisible()) {
    await expect(p.page.getByRole('button', { name: /Main loop/ })).toBeVisible();
    await expect(p.page.getByRole('button', { name: /Shortcut/ })).toBeVisible();
    await expect(p.page.locator('.bp-route-mark.dashed')).toBeVisible();
    await p.page.screenshot({ path: 'test-results/board-junction-phone.png' });
    await choice.tap();
  }
  // Landing and colours on the host, then the rules card for the chosen format.
  await expect(landed).toBeVisible({ timeout: 40_000 });
  const rules = p.page.getByRole('button', { name: 'Ready' });
  await page.screenshot({ path: 'test-results/board-resolve.png' });
  await expect(rules).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.rules-card')).toBeVisible();
  await p.ctx.close();
});
