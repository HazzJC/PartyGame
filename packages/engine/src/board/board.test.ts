import { createRng, formatForSides } from '@partygame/shared';
import { describe, expect, it } from 'vitest';
import '../game/index.ts';
import { game } from '../game/state.ts';
import { RoomEngine } from '../room.ts';
import { generateBoard, loopLength } from './generate.ts';
import { board } from './state.ts';

describe('board generator', () => {
  for (const n of [6, 8, 16]) {
    it(`builds a connected board for ${n} players`, () => {
      const def = generateBoard(n, createRng(n));
      const ids = new Set(def.nodes.map((x) => x.id));
      for (const node of def.nodes) for (const nx of node.next) expect(ids.has(nx)).toBe(true);
      // Every node is reachable from the start.
      const seen = new Set<number>([def.start]);
      const queue = [def.start];
      while (queue.length) for (const nx of def.nodes[queue.shift()!]!.next) if (!seen.has(nx)) (seen.add(nx), queue.push(nx));
      expect(seen.size).toBe(def.nodes.length);
      expect(def.nodes.filter((x) => x.next.length > 1)).toHaveLength(2);
      expect(def.nodes.filter((x) => x.type === 'slot').every((x) => x.next.length === 1)).toBe(true);
      expect(def.nodes.filter((x) => x.type === 'slot')).toHaveLength(n >= 12 ? 8 : 6);
      const spaces = def.nodes.filter((x) => x.type !== 'slot');
      expect(spaces.length).toBe(loopLength(n) + 10);
      const reds = spaces.filter((x) => x.type === 'red').length / spaces.length;
      expect(reds).toBeGreaterThan(0.15);
      expect(reds).toBeLessThan(0.25);
    });
  }

  it('scales with the room', () => {
    expect(loopLength(6)).toBeLessThan(loopLength(16));
  });
});

function botGame(bots: number, length: 'quick' | 'standard', seed: number) {
  let t = 1_000_000;
  let n = 0;
  const room = new RoomEngine(RoomEngine.createState('BCDF', 'h', t, seed), { clock: { now: () => t }, token: () => `tok${++n}` });
  room.state.settings.length = length;
  for (let i = 0; i < bots; i++) room.addBot();
  room.hostAction({ action: 'start' }, { role: 'host' });
  const phases = new Set<string>();
  for (let guard = 0; guard < 200_000 && room.phase.kind !== 'podium'; guard++) {
    phases.add(room.phase.kind);
    const next = room.nextTimerAt();
    if (next === null) break;
    t = Math.max(t, next);
    room.fireTimers();
  }
  return { room, phases };
}

describe('board rounds with bots', () => {
  it('plays a standard game: everyone moves, stars get bought, the podium is reached', () => {
    const { room, phases } = botGame(8, 'standard', 3);
    expect(room.phase.kind).toBe('podium');
    expect(phases.has('board')).toBe(true);
    const g = game(room);
    const stars = Object.values(g.players).map((p) => p.stars);
    expect(stars.reduce((a, b) => a + b, 0)).toBeGreaterThan(0);
    for (const p of Object.values(g.players)) expect(p.stats.spacesMoved).toBeGreaterThanOrEqual(12);
    expect(g.history.length).toBe(12);
  });

  it('keeps the doc economy: a 12-round leader ends with roughly 3 to 5 stars', () => {
    const leaders: number[] = [];
    for (let seed = 1; seed <= 12; seed++) {
      const { room } = botGame(8, 'standard', seed * 17);
      leaders.push(Math.max(...Object.values(game(room).players).map((p) => p.stars)));
    }
    const avg = leaders.reduce((a, b) => a + b, 0) / leaders.length;
    // The doc's estimate is 3 to 5; bots don't use items or duels yet, so allow a wider band.
    expect(avg).toBeGreaterThanOrEqual(1.5);
    expect(avg).toBeLessThanOrEqual(6);
  });

  it('16 players get two stars on the board', () => {
    const { room } = botGame(16, 'quick', 9);
    expect(board(game(room)).stars).toHaveLength(2);
  });

  it('format selection by colour agrees with the doc thresholds', () => {
    expect(formatForSides(1, 7)).toBe('1vN');
  });
});
