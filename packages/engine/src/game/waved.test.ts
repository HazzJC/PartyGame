import { describe, expect, it } from 'vitest';
import { buildScore, createSimRoom, pinger, teamGuess, teamPlaces, teamTiming, traceLaser } from './index.ts';

const WAVE_D = ['synchronised-pulse', 'mirror-maze', 'radar-beacon', 'blind-architect', 'tug-of-war'];

describe('wave D team games finish with bots', () => {
  for (const id of WAVE_D)
    for (const n of [4, 8, 16])
      it(`${id} with ${n} players`, () => {
        const { room, run } = createSimRoom({ seed: n * 19, bots: n, forceGame: id });
        room.hostAction({ action: 'start' }, { role: 'host' });
        run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal', 20 * 60_000);
        expect(room.phase.gameId).toBe(id);
        expect(room.phase.result.kind).toBe('team');
      });
});

describe('wave D rules', () => {
  it('team places: ties share, lower can be better', () => {
    expect(teamPlaces([3, 5])).toEqual([2, 1]);
    expect(teamPlaces([40, 40, 90], 'low')).toEqual([1, 1, 3]);
  });

  it('Synchronised Pulse scores per-player average, so team size does not matter', () => {
    const errors = { a: { 0: 20, 1: 20 }, b: { 0: 40, 1: 40 }, c: { 0: 30, 1: 30 } };
    expect(teamTiming(errors, ['a', 'b'], 2)).toBe(30);
    expect(teamTiming(errors, ['c'], 2)).toBe(30);
    // A missed beat counts as the maximum error.
    expect(teamTiming({ a: { 0: 0 } }, ['a'], 2)).toBe(150);
  });

  it('Mirror Maze: mirrors turn the laser', () => {
    const layout = { size: 3, source: { x: -1, y: 0, dx: 1, dy: 0 }, targets: [7], walls: [], slots: [1] };
    expect(traceLaser(layout, ['']).hits).toEqual([]);
    const bent = traceLaser(layout, ['\\']);
    expect(bent.path).toEqual([0, 1, 4, 7]);
    expect(bent.hits).toEqual([7]);
  });

  it('Radar Beacon: teammates take turns; the team guess is the average', () => {
    expect([0, 1, 2, 3].map((p) => pinger(['a', 'b', 'c'], p))).toEqual(['a', 'b', 'c', 'a']);
    expect(teamGuess(['a', 'b'], { a: { x: 10, y: 10 }, b: { x: 30, y: 50 } })).toEqual({ x: 20, y: 30 });
  });

  it('Blind Architect: exact heights score 1, one off scores a half', () => {
    expect(buildScore([0, 2, 3], [0, 1, 0])).toBe(1.5);
  });
});
