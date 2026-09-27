import { test } from '@playwright/test';
import { smokeGame } from './smoke.ts';

const WAVE_E = ['recipe-assembly', 'runaway-switchboard', 'pressure-valve', 'the-mind', 'collaborative-quilt', 'defuse-circuit', 'meteor-shield'];

for (const id of WAVE_E)
  test(`wave E: ${id} plays through on a phone`, async ({ page }) => {
    test.setTimeout(260_000);
    await smokeGame(page, id, 5);
  });
