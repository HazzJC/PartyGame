import { test } from '@playwright/test';
import { smokeGame } from './smoke.ts';

const WAVE_B = ['herd-mentality', 'odd-one-out', 'who-wrote-that', 'predict-the-crowd'];

for (const id of WAVE_B)
  test(`wave B: ${id} plays through on a phone`, async ({ page }) => {
    test.setTimeout(240_000);
    await smokeGame(page, id);
  });
