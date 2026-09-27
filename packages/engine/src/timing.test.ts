import { describe, expect, it } from 'vitest';
import { estimateStreamDelay, inTime, judgeReaction } from './timing.ts';

describe('timing rules', () => {
  it('accepts a submission stamped before the deadline that arrives within grace', () => {
    expect(inTime(1000, 1300, 990)).toBe(true);
    expect(inTime(1000, 1500, 990)).toBe(false);
    expect(inTime(1000, 1100, 1050)).toBe(false);
    // Claiming to have sent it in the future doesn't help.
    expect(inTime(1000, 1200, 5000)).toBe(false);
  });

  it('treats sub-100 ms reactions as false starts', () => {
    expect(judgeReaction({ ms: 80 }, 2000)).toEqual({ falseStart: true });
    expect(judgeReaction({ ms: 240.4 }, 2000)).toEqual({ ms: 240 });
    expect(judgeReaction({ ms: 2600 }, 2000)).toEqual({ missed: true });
    expect(judgeReaction({ falseStart: true }, 2000)).toEqual({ falseStart: true });
  });

  it('estimates a Discord-like delay and ~0 for a TV', () => {
    const flashes = [10_000, 12_500, 15_100, 17_400, 20_000];
    const reaction = [250, 270, 240];
    const discord = flashes.map((f, i) => f + 1800 + 260 + (i % 2 ? 40 : -30));
    expect(estimateStreamDelay(flashes, discord, reaction)).toBeGreaterThan(1700);
    expect(estimateStreamDelay(flashes, discord, reaction)).toBeLessThan(1900);
    const tv = flashes.map((f) => f + 260);
    expect(estimateStreamDelay(flashes, tv, reaction)).toBeLessThan(40);
    expect(estimateStreamDelay(flashes, [10_300], reaction)).toBeNull();
  });
});
