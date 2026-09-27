import { expect, test } from '@playwright/test';
import { hostGame, joinAsPlayer } from './helpers.ts';

test('host creates a room, plays from a popup, friends join, host screen can be re-opened', async ({ page, browser, context }) => {
  const code = await hostGame(page);

  // The host joins as a player from the shared screen's panel.
  await page.getByRole('button', { name: 'Play from this computer or your phone' }).click();
  await page.getByLabel('Your name').fill('Harry');
  await page.getByRole('button', { name: 'Take a seat' }).click();
  await expect(page.getByRole('button', { name: 'Open player window' })).toBeVisible();

  // Streaming mode: the personal seat token must never be in the shared screen's DOM.
  const hostSeat = await page.evaluate((c) => JSON.parse(sessionStorage.getItem(`hostseat:${c}`)!), code);
  expect(await page.content()).not.toContain(hostSeat.token);

  // "Open player window" opens a separate popup with the personal link.
  const [popup] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Open player window' }).click()]);
  await expect(popup.getByText("You're in, Harry!")).toBeVisible();
  await expect(popup.getByText('VIP controls')).toBeVisible();
  // Once the host's player screen connects, the panel closes itself.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.content()).not.toContain(hostSeat.token);

  // A friend joins on a phone and appears on the shared screen.
  const friend = await joinAsPlayer(browser, code, 'Sam');
  await expect(page.locator('.hl-slot.filled')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/host-lobby.png' });
  await friend.page.screenshot({ path: 'test-results/player-lobby.png' });

  // The VIP adds a bot from their player screen.
  await popup.getByRole('button', { name: '+ Bot' }).click();
  await expect(page.locator('.hl-slot.filled')).toHaveCount(3);

  // Refreshing a phone keeps the seat.
  await friend.page.reload();
  await expect(friend.page.getByText("You're in, Sam!")).toBeVisible();

  // The VIP re-opens the host screen in a fresh window; it connects with a new host token.
  await popup.getByRole('button', { name: 'Menu' }).click();
  const [newHost] = await Promise.all([context.waitForEvent('page'), popup.getByRole('button', { name: 'Re-open host screen' }).click()]);
  await expect(newHost.getByLabel('Room code')).toHaveText(code);
  await expect(newHost.locator('.hl-slot.filled')).toHaveCount(3);

  await friend.ctx.close();
});

test('rejoin by name after losing the link', async ({ page, browser }) => {
  const code = await hostGame(page);
  const a = await joinAsPlayer(browser, code, 'Alex');
  await a.page.goto('about:blank');
  await expect(page.locator('.hl-badge.away')).toBeVisible({ timeout: 20_000 });
  await a.ctx.close();
  // A new device with no stored token rejoins under the same name and gets the same seat back.
  const again = await joinAsPlayer(browser, code, 'alex', undefined, 'Alex');
  await expect(again.page.getByText('Players 1/16')).toBeVisible();
  await again.ctx.close();
});
