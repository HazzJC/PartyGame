import { expect, test } from '@playwright/test';

test('phone trap picker keeps the shared map usable in high contrast and reduced motion', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => localStorage.setItem('pg.display', JSON.stringify({ motion: 'reduce', highContrast: true })));
  await page.goto('/dev/board?n=4&dev=items');
  const player = page.frameLocator('iframe[title="Player screen"]');
  await expect(player.getByRole('button', { name: /Roll!/ })).toBeVisible({ timeout: 20_000 });
  await expect(player.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await expect(player.locator('html')).toHaveAttribute('data-contrast', 'high');
  await player.locator('.item-chip', { hasText: 'Trap' }).click();
  await expect(player.getByRole('heading', { name: 'Hide a trap: tap a space' })).toBeVisible();
  await expect(player.locator('.trap-map')).toHaveAttribute('data-presentation', 'trap');
  await player.getByRole('button', { name: 'Space 1', exact: true }).click();
  await expect(player.getByText('Using (secret):')).toBeVisible();
  await expect(player.locator('.item-chip', { hasText: 'Trap' })).toBeVisible();
});
