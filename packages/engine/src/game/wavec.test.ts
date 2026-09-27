import { describe, expect, it } from 'vitest';
import { createSimRoom, flightPath, placementCells, previewRoute, resolveLand, rotate, simulateSumo, SHAPES, EMPTY, NEUTRAL, type LandData } from './index.ts';

const WAVE_C = ['sumo-programming', 'artillery', 'artillery-fortress', 'heist', 'heist-guard', 'land-grab'];

describe('wave C mini games finish with bots', () => {
  for (const id of WAVE_C)
    for (const n of [4, 8, 16])
      it(`${id} with ${n} players`, () => {
        const { room, run } = createSimRoom({ seed: n * 17, bots: n, forceGame: id });
        room.hostAction({ action: 'start' }, { role: 'host' });
        run(() => room.phase.kind === 'minigame' && room.phase.stage === 'reveal', 20 * 60_000);
        expect(room.phase.gameId).toBe(id);
        expect(room.phase.stage).toBe('reveal');
      });
});

describe('wave C simulations', () => {
  it('Sumo is deterministic and knocks a puck off the edge', () => {
    const run = () => {
      const pucks = { a: { x: -100, y: 0, alive: true }, b: { x: 200, y: 0, alive: true } };
      const frames = simulateSumo(pucks, { a: { angle: 0, force: 5 } }, 300);
      return { pucks, frames: frames.length };
    };
    const one = run();
    expect(run()).toEqual(one);
    expect(one.pucks.b.alive).toBe(false);
    expect(one.pucks.a.alive).toBe(true);
  });

  it('Artillery flights are symmetric without wind and bend with it', () => {
    const right = flightPath(0, { angle: 45, power: 60, dir: 1 }, 0);
    const left = flightPath(0, { angle: 45, power: 60, dir: -1 }, 0);
    expect(right[right.length - 2]).toBe(-left[left.length - 2]!);
    const windy = flightPath(0, { angle: 45, power: 60, dir: 1 }, 3);
    expect(windy[windy.length - 2]!).toBeGreaterThan(right[right.length - 2]!);
  });

  it('Heist routes stop at walls', () => {
    expect(previewRoute({ size: 3, walls: [1] }, { x: 0, y: 0 }, ['R', 'D', 'R', 'R', 'W'])).toEqual([
      [0, 0],
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 1],
    ]);
  });

  it('Land Grab: pieces must touch your land; clashing cells stay neutral', () => {
    expect(rotate([[0, 0], [1, 0]], 1)).toEqual([[0, 0], [0, 1]]);
    const d: LandData = { side: 5, cells: Array(25).fill(EMPTY), order: ['a', 'b'], round: 1, maxRounds: 5, stage: 'place', closesAt: 0, pieces: { a: 1, b: 1 }, placements: {}, lastClaims: {}, shownAt: 0 };
    d.cells[0] = 0;
    d.cells[4] = 1;
    expect(placementCells(d, 0, SHAPES[1]!, 3, 3, 0)).toBeNull();
    // a's L covers cells 1, 2 and 6; b's bar covers 1, 2 and 3. Cells 1 and 2 clash.
    d.placements = { a: { x: 1, y: 0, rot: 0 }, b: { x: 1, y: 0, rot: 0 } };
    d.pieces = { a: 0, b: 1 };
    resolveLand(d);
    expect([d.cells[1], d.cells[2]]).toEqual([NEUTRAL, NEUTRAL]);
    expect(d.cells[6]).toBe(0);
    expect(d.cells[3]).toBe(1);
  });
});
