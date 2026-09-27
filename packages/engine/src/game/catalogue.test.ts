import { describe, expect, it } from 'vitest';
import { allMinigames } from './index.ts';

describe('mini game catalogue (design doc)', () => {
  const games = allMinigames();
  const ofFormat = (f: string) => games.filter((g) => g.formats.includes(f as never)).length;

  it('has all 33 games', () => expect(games).toHaveLength(33));
  it('16 free-for-all, 5 team, 4 one-vs-many, 8 co-op', () => {
    expect(ofFormat('ffa')).toBe(16);
    expect(ofFormat('team')).toBe(5);
    expect(ofFormat('1vN')).toBe(4);
    expect(ofFormat('coop')).toBe(8);
  });
  it('three duel games: Quick Draw, Stopwatch Chicken, Lowest Unique Number', () => {
    expect(games.filter((g) => g.formats.includes('duel')).map((g) => g.id).sort()).toEqual(['lowest-unique', 'quick-draw', 'stopwatch-chicken']);
  });
  it('every game has a rules blurb and declared inputs', () => {
    for (const g of games) {
      expect(g.blurb.length).toBeGreaterThan(20);
      expect(g.inputs.length).toBeGreaterThan(0);
    }
  });
});
