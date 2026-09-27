import { describe, expect, it } from 'vitest';
import {
  averageFfaPayout,
  ffaCoinsForPlace,
  ffaPayouts,
  formatForSides,
  imposters,
  landGrabSide,
  lunRange,
  placesFromScores,
  sonarSide,
  teamCoins,
  trampleCollapse,
} from './rules.ts';

const bands = (n: number) => Array.from({ length: n }, (_, i) => ffaCoinsForPlace(i + 1, n));

describe('FFA placement bands (design doc table)', () => {
  it('6 players: 1st, 2nd, 3rd, then 4th to 6th', () => expect(bands(6)).toEqual([10, 7, 5, 2, 2, 2]));
  it('8 players: 1st, 2nd, 3rd to 4th, 5th to 8th', () => expect(bands(8)).toEqual([10, 7, 5, 5, 2, 2, 2, 2]));
  it('16 players: 1st, 2nd to 4th, 5th to 8th, 9th to 16th', () =>
    expect(bands(16)).toEqual([10, 7, 7, 7, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2]));
  it('matches the economy check averages', () => {
    expect(averageFfaPayout(6)).toBeCloseTo(4.7, 1);
    expect(averageFfaPayout(8)).toBeCloseTo(4.4, 1);
    expect(averageFfaPayout(16)).toBeCloseTo(4.2, 1);
  });
  it('tied players all get the higher band', () => {
    const places = placesFromScores({ a: 9, b: 7, c: 7, d: 1, e: 0, f: 0 }, 'high');
    expect(places).toEqual({ a: 1, b: 2, c: 2, d: 4, e: 5, f: 5 });
    expect(ffaPayouts(places, 6)).toEqual({ a: 10, b: 7, c: 7, d: 2, e: 2, f: 2 });
  });
});

describe('format selection by smaller side S (design doc table)', () => {
  const format = (n: number, s: number) => formatForSides(s, n - s);
  it('S = 0 is co-op or FFA', () => [6, 8, 16].forEach((n) => expect(format(n, 0)).toBe('ffa-or-coop')));
  it('6 players', () => {
    expect(format(6, 1)).toBe('1vN');
    expect(format(6, 2)).toBe('team');
    expect(format(6, 3)).toBe('team');
  });
  it('8 players', () => {
    expect(format(8, 1)).toBe('1vN');
    expect(format(8, 2)).toBe('ffa');
    expect(format(8, 3)).toBe('team');
    expect(format(8, 4)).toBe('team');
  });
  it('16 players', () => {
    [1, 2, 3].forEach((s) => expect(format(16, s)).toBe('1vN'));
    [4, 5].forEach((s) => expect(format(16, s)).toBe('ffa'));
    [6, 7, 8].forEach((s) => expect(format(16, s)).toBe('team'));
  });
});

describe('team payouts are per player', () => {
  it('2 teams 8 / 2, 4 teams 8 / 5 / 3 / 2', () => {
    expect([teamCoins(1, 2), teamCoins(2, 2)]).toEqual([8, 2]);
    expect([1, 2, 3, 4].map((p) => teamCoins(p, 4))).toEqual([8, 5, 3, 2]);
  });
});

describe('per-game scaling', () => {
  it('Lowest Unique Number: 10 at 6, 20 at 16', () => expect([lunRange(6), lunRange(16)]).toEqual([10, 20]));
  it('Silent Trample collapses at 3, 3, 5', () => expect([6, 8, 16].map(trampleCollapse)).toEqual([3, 3, 5]));
  it('Land Grab 15, 17, 24', () => expect([6, 8, 16].map(landGrabSide)).toEqual([15, 17, 24]));
  it('Sonar 6×6 to 8 players, then 8×8', () => expect([6, 8, 9, 16].map(sonarSide)).toEqual([6, 6, 8, 8]));
  it('Odd One Out imposters', () => expect([8, 9].map(imposters)).toEqual([1, 2]));
});
