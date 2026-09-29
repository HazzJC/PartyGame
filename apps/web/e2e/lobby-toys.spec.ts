import { expect, test } from '@playwright/test';
import { hostGame, joinAsPlayer } from './helpers.ts';

test('a doodle drawn on a phone appears behind that sticker on the host screen', async ({ page, browser }) => {
  const code = await hostGame(page);
  const p = await joinAsPlayer(browser, code, 'Doodler');
  await p.page.getByRole('button', { name: 'Doodle a flag' }).tap();
  const canvas = p.page.locator('.draw-canvas');
  await expect(canvas).toBeVisible();
  // The pad sizes itself from its container on the next frame; measure after it settles.
  await p.page.waitForTimeout(300);
  const c = (await canvas.boundingBox())!;
  await p.page.mouse.move(c.x + 30, c.y + 30);
  await p.page.mouse.down();
  for (let i = 0; i < 15; i++) await p.page.mouse.move(c.x + 30 + i * 10, c.y + 30 + i * 6);
  await p.page.mouse.up();
  await expect(page.locator('.hl-doodle path')).toHaveCount(1);
  // The phone reported itself as a touch device.
  await expect(page.locator('.hl-device').getByRole('img', { name: 'Phone' })).toBeVisible();
  await page.screenshot({ path: 'test-results/host-doodle.png' });
  await p.ctx.close();
});
