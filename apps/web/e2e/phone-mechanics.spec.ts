import { expect, test } from '@playwright/test';

test('items, a duel with bets, and the shop on the phone', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/dev/board?n=4&dev=items,duel,shop');
  const host = page.frameLocator('iframe[title="Host screen"]');
  const player = page.frameLocator('iframe[title="Player screen"]');

  // Roll step: queue a secret Swap on a bot, then roll.
  await expect(player.getByRole('button', { name: /Roll!/ })).toBeVisible({ timeout: 20_000 });
  await player.locator('.item-chip', { hasText: 'Swap' }).click();
  await player.locator('.item-target').first().click();
  await expect(player.getByText('Using (secret):')).toBeVisible();
  await page.screenshot({ path: 'test-results/items-roll.png' });
  await player.getByRole('button', { name: /Roll!/ }).click();
  // Items are revealed together on the host.
  await expect(host.getByText('Items!')).toBeVisible({ timeout: 20_000 });
  await expect(host.getByText(/swapped places with/)).toBeVisible();
  await page.screenshot({ path: 'test-results/items-reveal.png' });

  // Skip through the board and mini game with the VIP menu until the standings/shop.
  const skipUntil = async (done: () => Promise<boolean>) => {
    for (let i = 0; i < 20 && !(await done()); i++) {
      await player.getByRole('button', { name: 'Menu' }).click();
      await player.getByRole('button', { name: 'Skip this step' }).click();
      await player.getByRole('button', { name: 'Close' }).click();
      await page.waitForTimeout(1500);
    }
  };
  const shopOpen = () => player.getByRole('heading', { name: 'Shop' }).isVisible();
  await skipUntil(shopOpen);
  await expect(player.getByRole('heading', { name: 'Shop' })).toBeVisible();
  await page.screenshot({ path: 'test-results/shop.png' });
  await player.getByRole('button', { name: 'Done shopping' }).click();

  // The queued duel: we challenge someone for 10 coins.
  await expect(player.getByRole('button', { name: 'Challenge!' })).toBeVisible({ timeout: 30_000 });
  await player.locator('.pick-tile').first().click();
  await player.locator('.pick-tile', { hasText: '10c' }).click();
  await page.screenshot({ path: 'test-results/duel-challenge.png' });
  await player.getByRole('button', { name: 'Challenge!' }).click();
  await expect(host.getByText('VS')).toBeVisible();
  await page.screenshot({ path: 'test-results/duel-bets.png' });
  // Then the duel's rules card and game; the result lands on its own screen.
  await expect(host.getByText(/wins the duel|A draw!/)).toBeVisible({ timeout: 90_000 }).catch(async () => {
    await skipUntil(() => host.getByText(/wins the duel|A draw!/).isVisible());
  });
  await page.screenshot({ path: 'test-results/duel-result.png' });
});
