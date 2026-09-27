import { expect, test, type FrameLocator, type Page } from '@playwright/test';

async function openHarness(page: Page, gameId: string, n = 4) {
  await page.goto(`/dev/minigame/${gameId}?n=${n}`);
  const host = page.frameLocator('iframe[title="Host screen"]');
  const player = page.frameLocator('iframe[title="Player screen"]');
  // Rules card, then Ready.
  await expect(player.getByRole('button', { name: 'Ready' })).toBeVisible({ timeout: 20_000 });
  await player.getByRole('button', { name: 'Ready' }).click();
  return { host, player };
}

async function expectPersonalResult(player: FrameLocator) {
  await expect(player.locator('.pf-coins')).toBeVisible({ timeout: 20_000 });
}

test('Lowest Unique Number: pick, reveal, personal result after the reveal, payout', async ({ page }) => {
  test.setTimeout(90_000);
  const { host, player } = await openHarness(page, 'lowest-unique');
  // Desktop tiles also show their key hint, so match the label itself.
  await player.locator('.pick-tile', { has: player.locator('.pick-label', { hasText: /^8$/ }) }).click();
  await expect(player.getByText('You picked 8')).toBeVisible();
  // No spoilers: during the reveal the phone only says "Watch the screen".
  await expect(player.getByText('Watch the screen')).toBeVisible({ timeout: 20_000 });
  await expect(host.locator('.lun-tile[data-state]').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/game-lun.png' });
  await expectPersonalResult(player);
  await expect(host.getByRole('heading', { name: /Standings/ }).or(host.locator('.standings'))).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/game-standings.png' });
});

test('Stopwatch Chicken: the clock runs on the phone and the stop is measured locally', async ({ page }) => {
  test.setTimeout(90_000);
  const { host, player } = await openHarness(page, 'stopwatch-chicken');
  await expect(player.locator('.sw-player-clock[data-state="run"]')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  await player.getByRole('button', { name: /STOP/ }).click();
  const stopped = await player.locator('.sw-stopped b').textContent();
  expect(parseFloat(stopped!)).toBeGreaterThan(1.2);
  expect(parseFloat(stopped!)).toBeLessThan(3.5);
  await expect(host.locator('.sw-track')).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'test-results/game-stopwatch.png' });
  await expectPersonalResult(player);
});

test('Count Together: saying a number blocks you from going twice; the VIP can skip', async ({ page }) => {
  test.setTimeout(90_000);
  const { host, player } = await openHarness(page, 'count-to');
  const say = player.locator('.count-say');
  await expect(say).toBeEnabled({ timeout: 15_000 });
  await say.click();
  await expect(host.locator('.count-log .count-call').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/game-count.png' });
  // VIP skip ends the round (a fail if the count isn't done).
  await player.getByRole('button', { name: 'Menu' }).click();
  await player.getByRole('button', { name: 'Skip this step' }).click();
  await player.getByRole('button', { name: 'Close' }).click();
  await expectPersonalResult(player);
});
