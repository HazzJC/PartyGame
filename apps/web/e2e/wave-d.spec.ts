import { test } from '@playwright/test';
import { smokeGame } from './smoke.ts';

const WAVE_D = ['synchronised-pulse', 'mirror-maze', 'radar-beacon', 'blind-architect'];

for (const id of WAVE_D)
  test(`wave D: ${id} plays through on a phone`, async ({ page }) => {
    test.setTimeout(240_000);
    await smokeGame(page, id, 6);
  });
