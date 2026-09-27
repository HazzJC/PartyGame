import { test } from '@playwright/test';
import { smokeGame } from './smoke.ts';

const WAVE_C = ['sumo-programming', 'artillery', 'artillery-fortress', 'heist', 'heist-guard', 'land-grab'];

for (const id of WAVE_C)
  test(`wave C: ${id} plays through on a phone`, async ({ page }) => {
    test.setTimeout(240_000);
    await smokeGame(page, id);
  });
