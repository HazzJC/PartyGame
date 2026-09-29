import { expect, test } from '@playwright/test';

test('world map: districts sit in the middle of their quadrants, and only the host map animates', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/dev/board?n=4');
  const hostEl = await page.waitForSelector('iframe[title="Host screen"]');
  const host = (await hostEl.contentFrame())!;
  await host.waitForSelector('.board-svg [data-district]', { timeout: 30_000 });

  // Measure the art at rest: sways and bobs would otherwise shift the boxes by a few pixels.
  const centres = await host.evaluate(() => {
    const running = document.getAnimations();
    running.forEach((a) => a.cancel());
    const out = [...document.querySelectorAll<SVGGElement>('.board-svg [data-district]')].map((g) => {
      // Union of the visible parts (clipped groups such as the lagoon waves are skipped).
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const c of [...g.children] as SVGGraphicsElement[]) {
        if (c.getAttribute('clip-path')) continue;
        const r = c.getBBox();
        if (!r.width && !r.height) continue;
        const t = c.transform?.baseVal?.consolidate()?.matrix;
        const [ox, oy, sx, sy] = t ? [t.e, t.f, t.a, t.d] : [0, 0, 1, 1];
        x0 = Math.min(x0, ox + r.x * sx);
        y0 = Math.min(y0, oy + r.y * sy);
        x1 = Math.max(x1, ox + (r.x + r.width) * sx);
        y1 = Math.max(y1, oy + (r.y + r.height) * sy);
      }
      const m = g.transform.baseVal.consolidate()!.matrix;
      return { name: g.dataset.district!, x: m.e + (x0 + x1) / 2, y: m.f + (y0 + y1) / 2 };
    });
    running.forEach((a) => a.play());
    return out;
  });
  // Quadrant centres inside the 80 px-inset loop of the 1440×940 board.
  const want: Record<string, [number, number]> = { pier: [400, 275], grove: [1040, 275], plaza: [400, 665], hill: [1040, 665] };
  expect(centres.map((c) => c.name).sort()).toEqual(Object.keys(want).sort());
  for (const c of centres) {
    expect(Math.abs(c.x - want[c.name]![0]), `${c.name} x`).toBeLessThan(2);
    expect(Math.abs(c.y - want[c.name]![1]), `${c.name} y`).toBeLessThan(2);
  }

  // The host map is alive (waterfall, trees, standees); the phone map is still.
  expect(await host.evaluate(() => document.getAnimations().length)).toBeGreaterThan(10);
  await expect(host.getByLabel('Board space legend').locator('svg')).toHaveCount(6);
  const phone = page.frameLocator('iframe[title="Player screen"]');
  await expect(phone.locator('.bp-map')).toBeVisible({ timeout: 20_000 });
  const phoneFrame = page.frames().find((f) => f.url().includes('#seat='))!;
  expect(await phoneFrame.evaluate(() => document.querySelector('.bp-map')!.getAnimations({ subtree: true }).length)).toBe(0);
});
