import { test } from '@playwright/test';
import { smokeGame } from './smoke.ts';

const WAVE_A = ['silent-trample', 'pick-a-door', 'pick-a-door-setter', 'deep-sea-sonar', 'raft-gamble', 'crumble-tower', 'quick-draw'];

for (const id of WAVE_A)
  test(`wave A: ${id} plays through on a phone`, async ({ page }) => {
    test.setTimeout(200_000);
    await smokeGame(page, id);
  });
