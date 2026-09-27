import { expect, test, type Page } from '@playwright/test';
import { hostGame, joinAsPlayer } from './helpers.ts';

async function tapWhenGo(page: Page) {
  const surface = page.getByLabel('Reaction pad');
  await expect(surface).toHaveAttribute('data-cue', 'go', { timeout: 10_000 });
  // Robots are faster than the 100 ms human floor; wait like a person would.
  await page.waitForTimeout(200);
  await surface.tap();
}

test('stream check measures ~0 s for a player watching the host directly', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Tv');
  await p.page.getByRole('button', { name: 'Stream check' }).tap();
  await expect(page.getByRole('heading', { name: 'Stream check' })).toBeVisible();

  // Tap the phone 250 ms after each scheduled flash, like someone watching a TV in the room.
  // (Driving this from the host page's frames is unreliable when one test browser runs both pages.)
  const flashes = (await page.locator('.flash-star').getAttribute('data-flashes'))!.split(',').map(Number);
  await p.page.evaluate(async (times) => {
    const pad = document.querySelector('.tap-pad')!;
    for (const t of times) {
      while (Date.now() < t + 250) await new Promise((r) => setTimeout(r, 5));
      pad.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }));
    }
  }, flashes);
  // Then three local flashes.
  for (let i = 0; i < 3; i++) await tapWhenGo(p.page);

  await expect(p.page.getByText('Your stream delay')).toBeVisible();
  const shown = await p.page.locator('.big-result').textContent();
  expect(parseFloat(shown!)).toBeLessThan(0.6);
  await page.screenshot({ path: 'test-results/host-calibrate.png' });
  // Everyone reported, so the room drops back to the lobby.
  await expect(p.page.getByText("You're in, Tv!")).toBeVisible({ timeout: 10_000 });
  await p.ctx.close();
});

test('reaction test: cues are drawn on the phone and bots play along', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Quick');
  await p.page.getByRole('button', { name: '+ Bot' }).tap();
  await p.page.getByRole('button', { name: 'Reaction test' }).tap();
  for (let round = 1; round <= 3; round++) {
    await expect(p.page.getByRole('heading', { name: `Round ${round}/3` })).toBeVisible({ timeout: 10_000 });
    await tapWhenGo(p.page);
    // After the last round the phone jumps straight to the total.
    if (round < 3) await expect(p.page.locator('.chip', { hasText: 'ms' })).toBeVisible();
  }
  await expect(p.page.getByText('Your total')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Totals' })).toBeVisible();
  await page.screenshot({ path: 'test-results/host-reaction.png' });
  await p.ctx.close();
});
