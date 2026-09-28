import { describe, expect, it } from 'vitest';
import type { BoardDef } from '@partygame/engine';
import { clusteredPawns, contrastRatio, focusedView, ROUTES, SPACE_SYMBOL, SYMBOL_INK, SYMBOL_PAPER } from './boardVisual.ts';

const def: BoardDef = { width: 1440, height: 940, start: 0, nodes: [
  { id: 0, x: 80, y: 80, type: 'blue', next: [1] },
  { id: 1, x: 1360, y: 860, type: 'red', next: [0] },
] };

describe('board presentation', () => {
  it('groups five stationary pawns and restores individual pawns after dispersal', () => {
    const pawns = Array.from({ length: 5 }, (_, i) => ({ x: 80, y: 80, id: i }));
    expect(clusteredPawns(pawns)).toHaveLength(1);
    expect(clusteredPawns(pawns)[0]!.members).toHaveLength(5);
    pawns[4]!.x = 1360;
    expect(clusteredPawns(pawns).map((g) => g.members.length)).toEqual([4, 1]);
    expect(clusteredPawns(pawns.map((p) => ({ ...p, stationary: false })))).toHaveLength(5);
  });

  it('clamps a phone viewport within each board edge', () => {
    expect(focusedView(def, 0)).toEqual({ x: 0, y: 0, w: 680, h: 460 });
    expect(focusedView(def, 1)).toEqual({ x: 760, y: 480, w: 680, h: 460 });
  });

  it('names and patterns both routes without relying on colour', () => {
    expect(ROUTES.map((r) => r.label)).toEqual(['Main loop', 'Shortcut']);
    expect(ROUTES[0].dash).toBeUndefined();
    expect(ROUTES[1].dash).toBeTruthy();
    for (const route of ROUTES) expect(contrastRatio('#FFFFFF', route.colour)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps every space pictogram above 4.5:1 on its immediate white centre', () => {
    expect(contrastRatio(SYMBOL_INK, SYMBOL_PAPER)).toBeGreaterThanOrEqual(4.5);
    expect(Object.keys(SPACE_SYMBOL).sort()).toEqual(['blue', 'duel', 'event', 'red', 'shop']);
  });
});
