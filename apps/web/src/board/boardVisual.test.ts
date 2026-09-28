import { describe, expect, it } from 'vitest';
import type { BoardDef } from '@partygame/engine';
import { clusteredPawns, contrastRatio, focusedView, ROUTES } from './boardVisual.ts';
import { SPACE_ART } from './SpaceArt.tsx';

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

  it('tells every space type apart by shape or colour, never colour alone for the rarer types', () => {
    const kinds = Object.keys(SPACE_ART).sort();
    expect(kinds).toEqual(['blue', 'duel', 'event', 'red', 'shop', 'start']);
    // Every type has a distinct face colour...
    expect(new Set(kinds.map((k) => SPACE_ART[k as keyof typeof SPACE_ART].face)).size).toBe(kinds.length);
    // ...and only blue and red (which also differ by icon) share a shape.
    const shapes = kinds.filter((k) => k !== 'blue' && k !== 'red').map((k) => SPACE_ART[k as keyof typeof SPACE_ART].shape);
    expect(new Set(shapes).size).toBe(shapes.length);
    // The extruded edge is darker than the face, so the paper depth reads on a stream.
    for (const k of kinds) expect(contrastRatio(SPACE_ART[k as keyof typeof SPACE_ART].side, '#FFFFFF')).toBeGreaterThan(contrastRatio(SPACE_ART[k as keyof typeof SPACE_ART].face, '#FFFFFF'));
  });
});
