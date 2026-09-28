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
  // The last card sits inside the rail (nothing is cut off at 1080p).
  const railBox = (await rail.boundingBox())!;
  const last = (await page.locator('.hg-player').last().boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(railBox.y + railBox.height + 1);
  await p.ctx.close();
});
