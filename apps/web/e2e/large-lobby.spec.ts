import { expect, test } from '@playwright/test';
import { hostGame, joinAsPlayer } from './helpers.ts';

test('team board with movement cards: teams on the rail, a card played by vote', async ({ page, browser }) => {
  test.setTimeout(150_000);
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Captain');
  for (let i = 0; i < 11; i++) await p.page.getByRole('button', { name: '+ Bot' }).tap();
  await p.page.getByRole('button', { name: 'Quick' }).tap();
  // VIP options on the phone: movement cards, team board, and the deck editor.
  await p.page.getByRole('button', { name: 'Cards' }).tap();
  // Controlled by the server's settings, so click and wait for the echo rather than .check().
  await p.page.getByLabel(/Team board/).click();
  await expect(p.page.getByLabel(/Team board/)).toBeChecked();
  await p.page.getByRole('button', { name: /Mini games: \d+\/\d+ on/ }).tap();
  const landGrab = p.page.getByRole('dialog', { name: 'Mini game deck' }).getByLabel('Land Grab');
  await landGrab.click();
  await expect(landGrab).not.toBeChecked();
  await p.page.getByRole('button', { name: 'Done' }).tap();
  await expect(p.page.getByRole('button', { name: /Mini games: 32\/33 on/ })).toBeVisible();
  // The host screen summarises the options under the game length.
  await expect(page.locator('.hl-opts-row')).toContainText('Movement cards · Team board');
  await p.page.getByRole('button', { name: 'Start game' }).tap();

  // Four teams on the host rail, and a hand of three cards on the phone.
  await expect(page.locator('.hg-player')).toHaveCount(4, { timeout: 15_000 });
  await expect(page.locator('.hg-rail')).toContainText('Red team');
  const cards = p.page.locator('.bp-card');
  await expect(cards).toHaveCount(3, { timeout: 15_000 });
  await expect(p.page.locator('.bp-team')).toContainText('team');
  await page.screenshot({ path: 'test-results/team-board-host.png' });
  await p.page.screenshot({ path: 'test-results/team-board-phone.png' });
  await cards.nth(1).tap();
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true');

  // The round carries on to a rules card that everyone (all 12 seats) plays.
  await expect(page.locator('.rules-card')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.rules-ready-av')).toHaveCount(12);
  await p.ctx.close();
});

test('16 players fit on the host rail', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Sixteen');
  for (let i = 0; i < 15; i++) await p.page.getByRole('button', { name: '+ Bot' }).tap();
  await p.page.getByRole('button', { name: 'Quick' }).tap();
  await p.page.getByRole('button', { name: 'Start game' }).tap();
  const rail = page.locator('.hg-rail');
  await expect(page.locator('.hg-player')).toHaveCount(16, { timeout: 15_000 });
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByLabel('Board space legend')).toBeVisible();
  await expect(page.getByLabel('16 players on one space')).toBeVisible();
  // The last card sits inside the rail (nothing is cut off at 1080p).
  const railBox = (await rail.boundingBox())!;
  const last = (await page.locator('.hg-player').last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(railBox.y + railBox.height + 1);
  const denseSize = await page.locator('.hg-player').first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize) * el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).height));
  expect(denseSize).toBeGreaterThanOrEqual(15.9); // transformed 24px text at 2/3 scale; allow browser rounding
  await page.screenshot({ path: 'test-results/board-16-720.png' });
  await p.ctx.close();
});

for (const count of [2, 4, 8]) test(`${count} players: host rail and board fit at 1280×720`, async ({ page, browser }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, `P${count}`);
  for (let i = 1; i < count; i++) await p.page.getByRole('button', { name: '+ Bot' }).tap();
  await p.page.getByRole('button', { name: 'Start game' }).tap();
  await expect(page.locator('.hg-player')).toHaveCount(count, { timeout: 15_000 });
  await expect(page.getByLabel('Board space legend')).toBeVisible({ timeout: 15_000 });
  const rail = (await page.locator('.hg-rail').boundingBox())!;
  const stage = (await page.locator('.stage').boundingBox())!;
  expect(rail.x + rail.width).toBeLessThanOrEqual(stage.x + stage.width + 1);
  await page.screenshot({ path: `test-results/board-${count}-720.png` });
  await p.ctx.close();
});
