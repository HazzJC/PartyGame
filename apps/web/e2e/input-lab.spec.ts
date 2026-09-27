import { expect, test } from '@playwright/test';
import { phones } from './helpers.ts';

const log = (page: import('@playwright/test').Page) => page.locator('.lab-log li').first();

test.describe('input kit on a touch phone', () => {
  test.use({ ...phones.iphone });

  test('pick, d-pad, draw and rank work by touch', async ({ page }) => {
    await page.goto('/dev/input-lab#pick');
    await page.getByRole('radio', { name: '3' }).tap();
    await expect(log(page)).toContainText('pick{3}');
    await expect(page.getByText('Tap your choice')).toBeVisible();

    await page.getByRole('button', { name: 'D-pad' }).tap();
    const pad = page.getByLabel('Direction pad');
    await expect(pad).toBeVisible();
    const box = (await pad.boundingBox())!;
    // Touch the right arm of the d-pad.
    await page.touchscreen.tap(box.x + box.width * 0.85, box.y + box.height / 2);
    await expect(page.locator('.lab-log')).toContainText('dir{1,0}');
    await page.screenshot({ path: 'test-results/lab-dpad-phone.png' });

    await page.getByRole('button', { name: 'Draw' }).tap();
    const canvas = page.locator('.draw-canvas');
    const c = (await canvas.boundingBox())!;
    await page.mouse.move(c.x + 20, c.y + 20);
    await page.mouse.down();
    for (let i = 0; i < 20; i++) await page.mouse.move(c.x + 20 + i * 8, c.y + 20 + Math.sin(i / 3) * 30);
    await page.mouse.up();
    await expect(log(page)).toContainText('strokes[1]');
    await page.screenshot({ path: 'test-results/lab-draw-phone.png' });

    await page.getByRole('button', { name: 'Vote + Rank' }).tap();
    await page.getByRole('button', { name: 'Move down' }).first().tap();
    await expect(log(page)).toContainText('rank[Tacos,Pizza,Sushi,Curry]');
  });

  test('landscape phone gets the handheld layout', async ({ browser }) => {
    const ctx = await browser.newContext({ ...phones.pixelLandscape });
    const page = await ctx.newPage();
    await page.goto('/dev/input-lab#dpad');
    await expect(page.locator('.gl[data-size="phone-landscape"] .gl-left .dpad')).toBeVisible();
    await page.screenshot({ path: 'test-results/lab-dpad-landscape.png' });
    await ctx.close();
  });
});

test.describe('input kit on a keyboard laptop', () => {
  test('number keys pick, WASD moves, keys drive aim and sequence', async ({ page }) => {
    await page.goto('/dev/input-lab#pick');
    await expect(page.getByRole('radio', { name: '4' })).toBeVisible();
    await page.keyboard.press('4');
    await expect(log(page)).toContainText('pick{4}');
    await expect(page.getByText('Click it, or press its number')).toBeVisible();

    await page.getByRole('button', { name: 'D-pad' }).click();
    // Keyboard players get key hints, not an on-screen pad.
    await expect(page.getByLabel('Direction pad')).toHaveCount(0);
    await page.keyboard.down('d');
    await expect(log(page)).toContainText('dir{1,0}');
    await page.keyboard.up('d');
    await expect(log(page)).toContainText('dir{0,0}');

    await page.getByRole('button', { name: 'Aim' }).click();
    await page.keyboard.press('ArrowRight');
    await expect(log(page)).toContainText('aim{50,60}');

    await page.getByRole('button', { name: 'Sequence' }).click();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowRight');
    await expect(log(page)).toContainText('program[U,R]');
    await page.keyboard.press('Backspace');
    await expect(log(page)).toContainText('program[U]');

    await page.getByRole('button', { name: 'Mash' }).click();
    for (let i = 0; i < 40; i++) await page.keyboard.press('k');
    await expect(page.locator('.lab-log')).toContainText('mash{');
    await page.screenshot({ path: 'test-results/lab-desktop.png' });
  });
});
