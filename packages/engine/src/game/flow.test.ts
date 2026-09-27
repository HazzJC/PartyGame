import { describe, expect, it } from 'vitest';
import { RoomEngine } from '../room.ts';
import { computePayout, game, lunPlaces, stopwatchScore } from './index.ts';

function botRoom(bots: number, length: 'quick' | 'standard' = 'quick', seed = 1) {
  let t = 1_000_000;
  let n = 0;
  const room = new RoomEngine(RoomEngine.createState('BCDF', 'h', t, seed), { clock: { now: () => t }, token: () => `tok${++n}` });
  room.state.settings.length = length;
  for (let i = 0; i < bots; i++) room.addBot();
  /** Advances the clock to each next timer until `until` holds (or a safety limit). */
  const runUntil = (until: () => boolean, maxMs = 60 * 60 * 1000) => {
    const end = t + maxMs;
    while (!until() && t < end) {
      const next = room.nextTimerAt();
      if (next === null) break;
      t = Math.max(t, next);
      room.fireTimers();
    }
  };
  return { room, runUntil, now: () => t };
}

describe('mini game loop', () => {
  it('plays a whole quick game with 8 bots and reaches the podium', () => {
    const { room, runUntil } = botRoom(8);
    room.hostAction({ action: 'start' }, { role: 'host' });
    expect(room.phase.kind).toBe('roundIntro');
    runUntil(() => room.phase.kind === 'podium');
    expect(room.phase.kind).toBe('podium');
    const g = game(room);
    expect(g.round).toBe(8);
    expect(g.history).toHaveLength(8);
    const coins = Object.values(g.players).map((p) => p.coins);
    // Coins never go negative, and nobody can have earned an absurd amount in 8 rounds.
    for (const c of coins) expect(c).toBeGreaterThanOrEqual(0);
    expect(Math.max(...coins)).toBeLessThan(250);
  });

  it('works at 16 players', () => {
    const { room, runUntil } = botRoom(16, 'quick', 5);
    room.hostAction({ action: 'start' }, { role: 'host' });
    runUntil(() => room.phase.kind === 'podium');
    expect(game(room).history).toHaveLength(8);
  });

  it('the VIP can end the game and return to the lobby', () => {
    const { room } = botRoom(3);
    room.hostAction({ action: 'start' }, { role: 'host' });
    room.hostAction({ action: 'backToLobby' }, { role: 'host' });
    expect(room.phase.kind).toBe('lobby');
    expect(room.state.game).toBeNull();
  });
});

describe('scoring', () => {
  it('Lowest Unique Number places unique numbers upward and clashes last', () => {
    const places = lunPlaces({ a: 1, b: 1, c: 2, d: 5, e: 3 }, ['a', 'b', 'c', 'd', 'e', 'f']);
    expect(places).toEqual({ a: 4, b: 4, c: 1, d: 3, e: 2, f: 4 });
  });

  it('Stopwatch Chicken ranks busts after everyone under', () => {
    expect(stopwatchScore(5000, 4900)).toBeLessThan(stopwatchScore(5000, 4000));
    expect(stopwatchScore(5000, 5010)).toBeGreaterThan(stopwatchScore(5000, 1000));
    expect(stopwatchScore(5000, undefined)).toBeGreaterThan(stopwatchScore(5000, 9000));
  });

  it('autopiloted players get the median payout', () => {
    const payout = computePayout({ participants: ['a', 'b', 'c', 'd', 'e', 'f'], autopiloted: ['a'] }, { kind: 'ffa', places: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } });
    expect(payout).toEqual({ a: 4, b: 7, c: 5, d: 2, e: 2, f: 2 });
  });

  it('1-vs-many pays 15 to each winner on the small side, 4 on the large side', () => {
    const phase = { participants: ['a', 'b', 'c', 'd'], teams: [['a'], ['b', 'c', 'd']], autopiloted: [] };
    expect(computePayout(phase, { kind: '1vN', smallWins: true })).toEqual({ a: 15, b: 0, c: 0, d: 0 });
    expect(computePayout(phase, { kind: '1vN', smallWins: false })).toEqual({ a: 0, b: 4, c: 4, d: 4 });
  });
});
