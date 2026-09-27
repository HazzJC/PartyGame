import { expect, type FrameLocator, type Page } from '@playwright/test';

/**
 * Plays a mini game from the harness player screen by poking whatever input is on offer, until
 * the personal result appears. Takes a host screenshot the first time a reveal is on screen.
 */
export async function smokeGame(page: Page, gameId: string, n = 5, shot = gameId): Promise<void> {
  await page.goto(`/dev/minigame/${gameId}?n=${n}`);
  const host = page.frameLocator('iframe[title="Host screen"]');
  const player = page.frameLocator('iframe[title="Player screen"]');
  await expect(player.getByRole('button', { name: 'Ready' })).toBeVisible({ timeout: 20_000 });
  await player.getByRole('button', { name: 'Ready' }).click();

  let playShot = false;
  const deadline = Date.now() + 150_000;
  while (Date.now() < deadline) {
    if (await player.locator('.pf-coins').isVisible().catch(() => false)) break;
    const acted = await poke(player);
    if (acted && !playShot) {
      playShot = true;
      await page.waitForTimeout(300);
      await page.screenshot({ path: `test-results/${shot}-play.png` });
    }
    await page.waitForTimeout(acted ? 700 : 400);
  }
  await expect(player.locator('.pf-coins')).toBeVisible();
  await page.screenshot({ path: `test-results/${shot}-result.png` });
  void host;
}

async function tryClick(frame: FrameLocator, selector: string, index = 0): Promise<boolean> {
  const loc = frame.locator(selector);
  const count = await loc.count().catch(() => 0);
  if (count === 0) return false;
  const target = loc.nth(Math.min(index, count - 1));
  if (!(await target.isVisible().catch(() => false)) || !(await target.isEnabled().catch(() => false))) return false;
  await target.click({ timeout: 2000 }).catch(() => undefined);
  return true;
}

async function poke(player: FrameLocator): Promise<boolean> {
  // Word games: type an answer, vote, guess writers, lock in a ranking.
  const text = player.locator('.text-answer input');
  if ((await text.isVisible().catch(() => false)) && (await text.isEnabled().catch(() => false))) {
    await text.fill('Pizza').catch(() => undefined);
    await player.locator('.text-answer button').click({ timeout: 2000 }).catch(() => undefined);
    return true;
  }
  if (await tryClick(player, 'button:has-text("Lock in")')) return true;
  const openCard = player.locator('.who-guess:not(:has(.who-guess-btn[aria-pressed="true"]))').first();
  if (await openCard.isVisible().catch(() => false)) {
    await openCard.locator('.who-guess-btn').first().click({ timeout: 2000 }).catch(() => undefined);
    return true;
  }
  if ((await player.locator('.vote-item[aria-pressed="true"]').count().catch(() => 0)) === 0 && (await tryClick(player, '.vote-item'))) return true;
  // Multi-select pickers (hunter, trap-setter) need their submit button after picking.
  if (await tryClick(player, 'button:has-text("Search 3/3")')) return true;
  if (await tryClick(player, 'button:has-text("Set trap")')) return true;
  // Pick once; multi-select pickers (with a "Search n/3" or "Set trap" button) keep adding.
  const unpicked = player.locator('.pick-tile[aria-checked="false"]:not(:disabled)');
  const picked = await player.locator('.pick-tile[aria-checked="true"]').count().catch(() => 0);
  const multi = (await player.locator('button:has-text("Search"), button:has-text("Set trap")').count().catch(() => 0)) > 0;
  if ((await unpicked.count().catch(() => 0)) > 0 && (picked === 0 || (multi && picked < 3))) {
    await unpicked.first().click({ timeout: 2000 }).catch(() => undefined);
    return true;
  }
  if ((await player.locator('.raft-choice[aria-pressed="true"]').count().catch(() => 0)) === 0 && (await tryClick(player, '.raft-choice'))) return true;
  if ((await player.locator('.tower-pick-block[aria-pressed="true"]').count().catch(() => 0)) === 0 && (await tryClick(player, '.tower-pick-block:not(:disabled)', 4))) return true;
  const grid = player.locator('.grid-svg');
  if (await grid.isVisible().catch(() => false)) {
    const box = await grid.boundingBox();
    if (box) {
      await grid.click({ position: { x: box.width * 0.45, y: box.height * 0.45 } }).catch(() => undefined);
      return true;
    }
  }
  return false;
}
