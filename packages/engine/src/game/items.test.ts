import { describe, expect, it } from 'vitest';
import { board, createSimRoom, game, resolveItems, settleBets, springTrap, starPriceFor, capStake } from './index.ts';

function started(bots = 4) {
  const sim = createSimRoom({ seed: 11, bots });
  sim.room.hostAction({ action: 'start' }, { role: 'host' });
  const g = game(sim.room);
  return { ...sim, g, b: board(g), ids: g.order };
}

describe('items', () => {
  it('resolves movement, then position, then coins; mutual swaps cancel', () => {
    const { room, g, b, ids } = started();
    const [a, c, d, e] = ids as [string, string, string, string];
    g.players[a]!.items = ['swap'];
    g.players[c]!.items = ['swap'];
    g.players[d]!.items = ['steal'];
    g.players[e]!.items = ['doubleRoll'];
    g.players[a]!.coins = 20;
    const walks = Object.fromEntries(ids.map((id, i) => [id, { roll: 3, start: i, at: i }]));
    const lines = resolveItems(room, g, b, walks, { [a]: { item: 'swap', target: c }, [c]: { item: 'swap', target: a }, [d]: { item: 'steal', target: a }, [e]: { item: 'doubleRoll' } }, () => 4);
    expect(walks[a]!.at).toBe(0);
    expect(walks[c]!.at).toBe(1);
    expect(lines.some((l) => l.includes('Both cancel'))).toBe(true);
    expect(g.players[a]!.coins).toBe(14);
    expect(walks[e]!.roll).toBe(7);
    // Used items leave the hand.
    for (const id of [a, c, d, e]) expect(g.players[id]!.items).toEqual([]);
  });

  it('a one-sided swap exchanges positions', () => {
    const { room, g, b, ids } = started();
    const [a, c] = ids as [string, string];
    g.players[a]!.items = ['swap'];
    const walks = Object.fromEntries(ids.map((id, i) => [id, { roll: 3, start: i * 2, at: i * 2 }]));
    resolveItems(room, g, b, walks, { [a]: { item: 'swap', target: c } }, () => 1);
    expect([walks[a]!.at, walks[c]!.at]).toEqual([2, 0]);
  });

  it('hidden traps pay their owner once and vanish; coupons discount the next star', () => {
    const { g, b, ids } = started();
    const [a, c] = ids as [string, string];
    g.traps[a] = 5;
    g.players[c]!.coins = 10;
    expect(springTrap(g, a, 5)).toBeNull();
    expect(springTrap(g, c, 5)).toEqual([a, 6]);
    expect(g.traps[a]).toBeUndefined();
    g.discounts.push(c);
    expect(starPriceFor(g, b, c)).toBe(b.starPrice - 8);
  });
});

describe('duels and bets', () => {
  it('stakes are capped at what the poorer player holds', () => {
    const { g, ids } = started();
    g.players[ids[0]!]!.coins = 7;
    expect(capStake(g, ids[0]!, ids[1]!, 20)).toBe(7);
    expect(capStake(g, ids[0]!, ids[1]!, 99)).toBe(5);
  });

  it('the losing pool is split among correct bettors by stake', () => {
    const net = settleBets({ x: { side: 'a', coins: 3 }, y: { side: 'a', coins: 1 }, z: { side: 'b', coins: 2 }, w: { side: 'b', coins: 2 } }, 'a');
    expect(net).toEqual({ x: 3, y: 1, z: -2, w: -2 });
    expect(settleBets({ x: { side: 'a', coins: 3 } }, null)).toEqual({ x: 0 });
  });

  it('bots play whole games with shops, items and duels to the podium', () => {
    let duels = 0;
    let shops = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const { room, run } = createSimRoom({ seed, bots: 8, length: 'standard' });
      room.hostAction({ action: 'start' }, { role: 'host' });
      const seen = run(() => room.phase.kind === 'podium');
      expect(room.phase.kind).toBe('podium');
      if (seen.has('duelResult')) duels++;
      if (Object.values(game(room).players).some((p) => p.items.length)) shops++;
    }
    expect(duels).toBeGreaterThan(0);
    expect(shops).toBeGreaterThan(0);
  });
});
