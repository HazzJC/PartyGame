import { describe, expect, it } from 'vitest';
import { TapLimiter } from './tapLimiter.ts';

describe('mash parity cap', () => {
  it('counts at most 10 taps in any one-second window', () => {
    const l = new TapLimiter(10);
    let counted = 0;
    // A keyboard auto-mash at 30 taps per second for two seconds.
    for (let t = 0; t < 2000; t += 33) if (l.accept(t)) counted++;
    expect(counted).toBeLessThanOrEqual(20);
    expect(counted).toBeGreaterThanOrEqual(18);
  });
});
