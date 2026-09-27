import { describe, expect, it } from 'vitest';
import { createSimRoom, resolveTower, rowStable, scoreNets, scoreTrampleRound } from './index.ts';

const WAVE_A = ['silent-trample', 'pick-a-door', 'pick-a-door-setter', 'deep-sea-sonar', 'raft-gamble', 'crumble-tower', 'quick-draw'];

describe('wave A mini games finish with bots', () => {
  for (const id of WAVE_A)
    for (const n of [4, 8, 16])
      it(`${id} with ${n} players`, () => {
        const { room, run } = createSimRoom({ seed: n * 7, bots: n, forceGame: id });
        room.hostAction({ action: 'start' }, { role: 'host' });
        run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal', 20 * 60_000);
        expect(room.phase.kind).toBe('minigame');
        expect(room.phase.gameId).toBe(id);
        expect(room.phase.stage).toBe('reveal');
        const paid = Object.values(room.phase.payout as Record<string, number>);
        expect(paid.length).toBe(n);
      });
});

describe('wave A scoring', () => {
  it('Silent Trample: crowded zones collapse', () => {
    const { gains, collapsed } = scoreTrampleRound([2, 4, 6], 3, { a: 2, b: 2, c: 2, d: 1 });
    expect(collapsed).toEqual([2]);
    expect(gains).toEqual({ a: 0, b: 0, c: 0, d: 4 });
  });

  it('Deep Sea Sonar: tangled nets catch nothing', () => {
    expect(scoreNets([0, 5, 9], { a: 2, b: 2, c: 1 })).toEqual({ a: 0, b: 0, c: 5 });
  });

  it('Crumble Tower: the lowest removal that makes a row unstable is at fault', () => {
    const rows: [boolean, boolean, boolean][] = [
      [true, true, true],
      [true, false, true],
      [true, true, true],
    ];
    const scores: Record<string, number> = {};
    const { log, fault } = resolveTower({ rows, picks: { hi: [2, 0], low: [1, 0], clashA: [0, 1], clashB: [0, 1] }, scores });
    expect(log.map((l) => l.outcome)).toEqual(['bumped', 'bumped', 'toppled']);
    expect(fault).toBe('low');
    expect(scores.hi).toBeUndefined();
    expect(rowStable([true, false, true])).toBe(true);
    expect(rowStable([false, false, true])).toBe(false);
  });
});
