import { describe, expect, it } from 'vitest';
import { accusedFrom, actualRanks, applyMerges, createSimRoom, scoreHerd, scoreOdd, scorePrediction, scoreWho } from './index.ts';

const WAVE_B = ['herd-mentality', 'odd-one-out', 'who-wrote-that', 'predict-the-crowd'];

describe('wave B mini games finish with bots', () => {
  for (const id of WAVE_B)
    for (const n of [4, 9, 16])
      it(`${id} with ${n} players`, () => {
        const { room, run } = createSimRoom({ seed: n * 13, bots: n, forceGame: id });
        room.hostAction({ action: 'start' }, { role: 'host' });
        run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal', 20 * 60_000);
        expect(room.phase.gameId).toBe(id);
        expect(room.phase.stage).toBe('reveal');
      });
});

describe('wave B scoring', () => {
  it('Herd: the single biggest group scores; a tie for biggest scores nobody', () => {
    expect(scoreHerd([{ label: 'Dog', ids: ['a', 'b'] }, { label: 'Cat', ids: ['c'] }], 'herd')).toEqual({ a: 1, b: 1 });
    expect(scoreHerd([{ label: 'Dog', ids: ['a', 'b'] }, { label: 'Cat', ids: ['c', 'd'] }], 'herd')).toEqual({});
    expect(scoreHerd([{ label: 'Dog', ids: ['a', 'b'] }, { label: 'Owl', ids: ['c'] }], 'unique')).toEqual({ c: 1 });
  });

  it('Herd: a third of the room can merge two groups', () => {
    const groups = [
      { label: 'Soda', ids: ['a', 'b'] },
      { label: 'Pop', ids: ['c'] },
    ];
    expect(applyMerges(groups, { a: { from: 'Pop', to: 'Soda' } }, 6)).toHaveLength(2);
    const merged = applyMerges(groups, { a: { from: 'Pop', to: 'Soda' }, b: { from: 'Pop', to: 'Soda' } }, 6);
    expect(merged).toEqual([{ label: 'Soda', ids: ['a', 'b', 'c'] }]);
  });

  it('Odd One Out: catching the imposter pays voters; escaping pays the imposter', () => {
    const votes = { a: 'x', b: 'x', x: 'a', c: 'b' };
    expect(accusedFrom(votes)).toEqual(['x']);
    expect(scoreOdd(['a', 'b', 'c', 'x'], ['x'], votes, ['x'])).toEqual({ a: 2, b: 2, c: 0, x: 0 });
    expect(scoreOdd(['a', 'b', 'c', 'x'], ['x'], votes, ['a'])).toEqual({ a: 2, b: 2, c: 0, x: 4 });
  });

  it('Who Wrote That: right guesses and fooled friends both score', () => {
    expect(scoreWho(['w1', 'w2'], { g: { 0: 'w1', 1: 'w1' } })).toEqual({ g: 1, w2: 1 });
  });

  it('Predict the Crowd: ranks and ties', () => {
    expect(actualRanks([5, 1, 3, 3])).toEqual([0, 3, 1, 1]);
    // Perfect order (either order of the tied pair counts) plus the top pick bonus.
    expect(scorePrediction([0, 2, 3, 1], [5, 1, 3, 3])).toBe(5);
    expect(scorePrediction([0, 3, 2, 1], [5, 1, 3, 3])).toBe(5);
    expect(scorePrediction([1, 0, 2, 3], [5, 1, 3, 3])).toBe(1);
  });
});
