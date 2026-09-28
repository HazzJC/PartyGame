import { describe, expect, it } from 'vitest';
import { createSimRoom, entityOf, game, membersOf, teamPayout, TEAM_BOARD_MIN } from './index.ts';

function teamRoom(seed: number, bots = 12) {
  const sim = createSimRoom({ seed, bots, length: 'quick' });
  sim.room.state.settings.teamBoard = true;
  sim.room.hostAction({ action: 'start' }, { role: 'host' });
  return sim;
}

describe('team board mode', () => {
  it('splits a big room into four teams that share a pawn and purse', () => {
    const { room } = teamRoom(1);
    const g = game(room);
    expect(g.order).toEqual(['t0', 't1', 't2', 't3']);
    expect(g.teamBoard!.teams.flat().sort()).toEqual(room.seats.map((s) => s.id).sort());
    for (const t of g.order) expect(membersOf(g, t)).toHaveLength(3);
    for (const s of room.seats) expect(g.order).toContain(entityOf(g, s.id));
  });

  it('stays a normal game below the minimum', () => {
    const { room } = teamRoom(1, TEAM_BOARD_MIN - 1);
    const g = game(room);
    expect(g.teamBoard).toBeNull();
    expect(g.order).toEqual(room.seats.map((s) => s.id));
  });

  for (const seed of [2, 3, 4])
    it(`plays a whole quick game with every seat in the mini games (seed ${seed})`, () => {
      const { room, run } = teamRoom(seed, 16);
      const g = game(room);
      let checked = 0;
      const seen = run(() => {
        if (room.phase.kind === 'minigame' && room.phase.format !== 'duel' && room.phase.stage === 'play' && !checked) {
          expect(room.phase.participants).toHaveLength(16);
          checked++;
        }
        return room.phase.kind === 'podium';
      });
      expect(room.phase.kind).toBe('podium');
      expect(seen.has('board')).toBe(true);
      expect(checked).toBe(1);
      // Every coin and star went to a team, never to a seat.
      expect(Object.keys(g.players).sort()).toEqual(['t0', 't1', 't2', 't3']);
      expect(g.order.reduce((n, t) => n + g.players[t]!.stars, 0)).toBeGreaterThan(0);
    });

  it('pays free-for-all games by the teams’ average placement', () => {
    const { room } = teamRoom(5, 8);
    const g = game(room);
    const places: Record<string, number> = {};
    // Team t2 takes 1st and 2nd, t0 3rd and 4th, and so on.
    const rankOrder = ['t2', 't0', 't3', 't1'];
    let p = 1;
    for (const t of rankOrder) for (const m of membersOf(g, t)) places[m] = p++;
    const seats = room.seats.map((s) => s.id);
    const out = teamPayout(g, seats, { kind: 'ffa', places }, {});
    expect(out).toEqual({ t2: 8, t0: 5, t3: 3, t1: 2 });
    const coop = teamPayout(g, seats, { kind: 'coop', grade: 'gold' }, Object.fromEntries(seats.map((s) => [s, 8])));
    expect(Object.values(coop)).toEqual([8, 8, 8, 8]);
  });
});

describe('movement cards', () => {
  it('deals three cards, replaces each played card, and plays to the end', () => {
    const { room, run } = createSimRoom({ seed: 6, bots: 6, length: 'quick' });
    room.state.settings.movement = 'cards';
    room.hostAction({ action: 'start' }, { role: 'host' });
    const g = game(room);
    for (const id of g.order) expect(g.players[id]!.cards).toHaveLength(3);
    run(() => room.phase.kind === 'podium');
    expect(room.phase.kind).toBe('podium');
    for (const id of g.order) {
      const cards = g.players[id]!.cards!;
      expect(cards).toHaveLength(3);
      for (const c of cards) expect(c >= 1 && c <= 6).toBe(true);
    }
  });

  it('works with teams voting on a card', () => {
    const { room, run } = createSimRoom({ seed: 7, bots: 12, length: 'quick' });
    room.state.settings.movement = 'cards';
    room.state.settings.teamBoard = true;
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'podium');
    expect(room.phase.kind).toBe('podium');
  });
});
