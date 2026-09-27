import { devices, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

export const phones = {
  iphone: devices['iPhone 13'],
  pixelLandscape: devices['Pixel 7 landscape'],
};

export async function hostGame(page: Page): Promise<string> {
  await page.goto('/host');
  await page.waitForURL(/\/host\/[A-Z]{4}$/);
  const code = page.url().slice(-4);
  await expect(page.getByLabel('Room code')).toHaveText(code);
  return code;
}

/** Joins a room as a new player in its own browser context (like a separate phone). */
export async function joinAsPlayer(browser: Browser, code: string, name: string, device = phones.iphone, shownAs = name): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ ...device });
  const page = await ctx.newPage();
  await page.goto(`/${code}`);
  await page.getByLabel('Your name').fill(name);
  await page.getByRole('button', { name: "I'm in!" }).click();
  await expect(page.getByText(`You're in, ${shownAs}!`)).toBeVisible();
  return { ctx, page };
}
