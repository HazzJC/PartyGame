import { SESSION } from '@partygame/shared';
import { describe, expect, it } from 'vitest';
import { caught, createSimRoom, drawBonusStars, game, hunterZones, POWER_DOUBLING_S, TUG_MAX_MS, tugPower, tugRates, tugWeights } from './index.ts';

describe('endgame', () => {
  it('last place picks a twist at the start of the final stretch, then bonus stars are awarded', () => {
    const { room, run } = createSimRoom({ seed: 4, bots: 6, length: 'quick' });
    room.hostAction({ action: 'start' }, { role: 'host' });
    const seen = run(() => room.phase.kind === 'twist');
    expect(room.phase.kind).toBe('twist');
    expect(game(room).round).toBe(SESSION.quick.rounds - SESSION.quick.finalStretch + 1);
    expect(seen.has('board')).toBe(true);
    const phases = run(() => room.phase.kind === 'podium');
    expect(phases.has('bonus')).toBe(true);
    expect(['cheapStars', 'starMoves', 'bottomItems']).toContain(game(room).twist);
    expect(game(room).bonus).toHaveLength(SESSION.quick.bonusStars);
  });

  it('bonus stars go to every tied player and skip categories nobody earned', () => {
    const { room } = createSimRoom({ seed: 1, bots: 3 });
    room.hostAction({ action: 'start' }, { role: 'host' });
    const g = game(room);
    const [a, b] = g.order;
    g.players[a!]!.stats.redSpaces = 3;
    g.players[b!]!.stats.redSpaces = 3;
    const awards = drawBonusStars(room, g, 7);
    expect(awards.map((x) => x.id)).not.toContain('gambler');
    expect(awards.find((x) => x.id === 'unlucky')?.winners.sort()).toEqual([a, b].sort());
  });

  it('a full threat meter hits everyone and resets', () => {
    const { room, run } = createSimRoom({ seed: 2, bots: 4, length: 'quick' });
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'payout');
    const g = game(room);
    g.threat = g.threatMax;
    const before = Object.fromEntries(g.order.map((id) => [id, g.players[id]!.coins]));
    room.hostAction({ action: 'skip' }, { role: 'host' });
    expect(room.phase.kind).toBe('threat');
    expect(g.threat).toBe(0);
    for (const id of g.order) expect(g.players[id]!.coins).toBe(Math.max(0, before[id]! - 5));
  });
});

describe('new mini games', () => {
  it('Tug of War runs until the rope reaches an end, even between evenly matched bot teams', () => {
    for (const seed of [8, 9, 10]) {
      const { room, run, now } = createSimRoom({ seed, bots: 6, forceGame: 'tug-of-war' });
      room.hostAction({ action: 'start' }, { role: 'host' });
      run(() => room.phase.kind === 'minigame');
      const started = now();
      run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal');
      expect(room.phase.result.kind).toBe('team');
      // Decided by the rope, not a clock: it reached an end, well before the two-minute safety net.
      expect(Math.abs(room.phase.data.marker)).toBe(1);
      expect(now() - started).toBeLessThan(TUG_MAX_MS);
    }
  });

  it('Tug of War pull power grows, so small edges count more later on', () => {
    expect(tugPower(0)).toBe(1);
    expect(tugPower(POWER_DOUBLING_S * 1000)).toBeCloseTo(2);
    expect(tugPower(POWER_DOUBLING_S * 3000)).toBeCloseTo(8);
  });

  it('Tug of War weights each individual the same, so a small team can hold a big one', () => {
    expect(tugWeights([3, 5])).toEqual([5 / 3, 1]);
    // One player tapping 8 times against three players tapping 8 times each: dead level.
    const [solo, trio] = tugRates([[8, 0], [24, 0]], [1, 3], 1);
    expect(solo).toBeCloseTo(trio!);
    // Three on the big team idling while one pulls leaves them well behind the solo player.
    const [solo2, trio2] = tugRates([[8, 0], [8, 0]], [1, 3], 1);
    expect(solo2).toBeGreaterThan(trio2! * 2.9);
  });

  it('Hunter vs Hiders pays the small side 15 when it wins', () => {
    const { room, run } = createSimRoom({ seed: 3, bots: 6, forceGame: 'hunter-vs-hiders' });
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal');
    const ph = room.phase;
    const [small] = ph.teams;
    const coins = ph.payout[small[0]];
    expect(coins === 15 || coins === 0).toBe(true);
    expect(hunterZones(1, 5)).toBe(8);
    expect(caught({ hides: { a: 1, b: 2 }, searches: { h: [2, 3, 4] } })).toEqual(['b']);
  });
});
