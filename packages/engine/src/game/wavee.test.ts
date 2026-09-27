import { describe, expect, it } from 'vitest';
import { COLUMNS, commitPlays, covered, createSimRoom, keypadOrder, mindCards, nextNode, quiltSize, recipeGrade, routeTo, wireToCut, type MindData } from './index.ts';

const WAVE_E = ['recipe-assembly', 'runaway-switchboard', 'pressure-valve', 'the-mind', 'collaborative-quilt', 'defuse-circuit', 'meteor-shield', 'count-to'];

describe('wave E co-op games finish with bots', () => {
  for (const id of WAVE_E)
    for (const n of [4, 8, 16])
      it(`${id} with ${n} players`, () => {
        const { room, run } = createSimRoom({ seed: n * 23, bots: n, forceGame: id });
        room.hostAction({ action: 'start' }, { role: 'host' });
        run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal', 20 * 60_000);
        expect(room.phase.gameId).toBe(id);
        expect(room.phase.result.kind).toBe('coop');
      });
});

describe('wave E rules', () => {
  it('Recipe: completed orders set the grade, many strikes drop it', () => {
    expect([recipeGrade(3, 0), recipeGrade(3, 4), recipeGrade(0, 0)]).toEqual(['gold', 'silver', 'fail']);
  });

  it('Switchboard: routes and switches agree', () => {
    for (let exit = 0; exit < 8; exit++) {
      let j: number | null = 0;
      let reached: number | null = null;
      for (const step of routeTo(exit)) {
        expect(step.junction).toBe(j);
        const n = nextNode(step.junction, step.sw);
        j = n.junction;
        reached = n.exit;
      }
      expect(reached).toBe(exit);
    }
  });

  it('The Mind: plays commit in timestamp order; a skipped lower card costs a life', () => {
    const d: MindData = { hands: { a: [10], b: [20], c: [30] }, pile: [], pending: [], discarded: [], lives: 3, max: 50, closesAt: 0, lastMistake: null };
    // b pressed first by synced time, even though a's arrived first.
    d.pending = [
      { card: 10, by: 'a', at: 105 },
      { card: 20, by: 'b', at: 100 },
    ];
    expect(commitPlays(d)).toBe(true);
    expect(d.lives).toBe(2);
    expect(d.pile.map((p) => p.card)).toEqual([20]);
    expect(d.discarded).toEqual([{ card: 10, by: 'a' }]);
    expect([mindCards(4), mindCards(8), mindCards(16)]).toEqual([3, 2, 1]);
  });

  it('Quilt sizes from the doc', () => {
    expect([quiltSize(6), quiltSize(8), quiltSize(16)]).toEqual([
      { cols: 3, rows: 2 },
      { cols: 4, rows: 2 },
      { cols: 4, rows: 4 },
    ]);
  });

  it('Defuse: the manual is consistent', () => {
    expect(wireToCut(['blue', 'blue', 'yellow'], false)).toBe(1);
    expect(wireToCut(['red', 'blue', 'white'], false)).toBe(2);
    const keys = [COLUMNS[1]![4]!, COLUMNS[1]![0]!, COLUMNS[1]![2]!, COLUMNS[1]![1]!];
    expect(keypadOrder(keys)).toEqual([COLUMNS[1]![0], COLUMNS[1]![1], COLUMNS[1]![2], COLUMNS[1]![4]]);
  });

  it('Meteor shield covers within the arc plus a margin', () => {
    expect(covered({ a: 0 }, 0.5, 0.3)).toBe(true);
    expect(covered({ a: 0 }, 0.5, 1)).toBe(false);
    expect(covered({ a: 6.2 }, 0.5, 0.05)).toBe(true);
  });
});
