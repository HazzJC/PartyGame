import type { Rng } from '@partygame/shared';

export type SpaceType = 'blue' | 'red' | 'event' | 'shop' | 'duel';

export interface BoardNode {
  id: number;
  x: number;
  y: number;
  /** 'slot' nodes are star waypoints: moving through them never costs a step. */
  type: SpaceType | 'slot';
  next: number[];
}

export interface BoardDef {
  width: number;
  height: number;
  start: number;
  nodes: BoardNode[];
}

export const BOARD_W = 1440;
export const BOARD_H = 940;

/** Spaces on the main loop grow with the room (the exact ratio is a playtest knob). */
export const loopLength = (n: number): number => Math.max(30, Math.min(56, 24 + 2 * n));

type Pt = { x: number; y: number };

/** Evenly spaced points along a rounded rectangle, clockwise from the top-left straight. */
function roundedRectPoints(count: number, x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
  const segs: { len: number; at: (t: number) => Pt }[] = [];
  const line = (a: Pt, b: Pt) => ({ len: Math.hypot(b.x - a.x, b.y - a.y), at: (t: number) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }) });
  const arc = (cx: number, cy: number, a0: number) => ({
    len: (Math.PI / 2) * r,
    at: (t: number) => ({ x: cx + Math.cos(a0 + (t * Math.PI) / 2) * r, y: cy + Math.sin(a0 + (t * Math.PI) / 2) * r }),
  });
  segs.push(line({ x: x0 + r, y: y0 }, { x: x1 - r, y: y0 }));
  segs.push(arc(x1 - r, y0 + r, -Math.PI / 2));
  segs.push(line({ x: x1, y: y0 + r }, { x: x1, y: y1 - r }));
  segs.push(arc(x1 - r, y1 - r, 0));
  segs.push(line({ x: x1 - r, y: y1 }, { x: x0 + r, y: y1 }));
  segs.push(arc(x0 + r, y1 - r, Math.PI / 2));
  segs.push(line({ x: x0, y: y1 - r }, { x: x0, y: y0 + r }));
  segs.push(arc(x0 + r, y0 + r, Math.PI));
  const total = segs.reduce((s, g) => s + g.len, 0);
  const pts: Pt[] = [];
  for (let i = 0; i < count; i++) {
    let d = (i / count) * total;
    for (const g of segs) {
      if (d <= g.len) {
        pts.push(g.at(d / g.len));
        break;
      }
      d -= g.len;
    }
  }
  return pts;
}

function bezier(a: Pt, c: Pt, b: Pt, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/**
 * Builds a board for n players: a main loop, two shortcut branches that bulge toward the middle
 * (each starting at a junction), and star waypoints between some loop spaces.
 */
export function generateBoard(n: number, rng: Rng): BoardDef {
  const L = loopLength(n);
  const m = 80;
  const loop = roundedRectPoints(L, m, m, BOARD_W - m, BOARD_H - m, 170);
  const nodes: BoardNode[] = loop.map((p, i) => ({ id: i, x: Math.round(p.x), y: Math.round(p.y), type: 'blue', next: [(i + 1) % L] }));
  const center = { x: BOARD_W / 2, y: BOARD_H / 2 };
  const add = (p: Pt, type: BoardNode['type']): BoardNode => {
    const node: BoardNode = { id: nodes.length, x: Math.round(p.x), y: Math.round(p.y), type, next: [] };
    nodes.push(node);
    return node;
  };

  // Shortcuts: [from, to] loop indices, curving in toward the middle of the board.
  const chords: [number, number][] = [
    [Math.round(L * 0.1), Math.round(L * 0.37)],
    [Math.round(L * 0.6), Math.round(L * 0.87)],
  ];
  for (const [from, to] of chords) {
    const a = nodes[from]!;
    const b = nodes[to]!;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const ctrl = { x: mid.x + (center.x - mid.x) * 0.9, y: mid.y + (center.y - mid.y) * 0.9 };
    const k = 5;
    let prev = a;
    for (let i = 1; i <= k; i++) {
      const s = add(bezier(a, ctrl, b, i / (k + 1)), 'blue');
      if (prev === a) a.next.push(s.id);
      else prev.next = [s.id];
      prev = s;
    }
    prev.next = [b.id];
  }

  // Star waypoints on loop edges (not next to the start, not on a junction's outgoing edge).
  const slotCount = n >= 12 ? 8 : 6;
  const junctions = new Set(chords.map(([f]) => f));
  const slotEdges: number[] = [];
  for (let i = 0; i < slotCount; i++) {
    let e = Math.round(((i + 0.5) / slotCount) * L) % L;
    while (junctions.has(e) || e === 0 || slotEdges.includes(e)) e = (e + 1) % L;
    slotEdges.push(e);
  }
  for (const e of slotEdges) {
    const a = nodes[e]!;
    const bId = a.next[0]!;
    const b = nodes[bId]!;
    const slot = add({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, 'slot');
    slot.next = [bId];
    a.next[0] = slot.id;
  }

  // Space types: mostly blue, ~20% red (never two reds in a row), a sprinkling of events, shops and duels.
  const spaces = nodes.filter((x) => x.type !== 'slot' && x.id !== 0);
  const shuffled = rng.shuffle(spaces.map((s) => s.id));
  const counts = { event: Math.max(3, Math.round(spaces.length * 0.1)), shop: n >= 10 ? 3 : 2, duel: Math.max(2, Math.round(spaces.length * 0.07)), red: Math.round(spaces.length * 0.2) };
  const taken = new Set<number>();
  const neighbours = (id: number) => nodes.filter((x) => x.next.includes(id)).map((x) => x.id).concat(nodes[id]!.next);
  const place = (type: SpaceType, count: number, spacing: (id: number) => boolean) => {
    for (const id of shuffled) {
      if (count <= 0) break;
      if (taken.has(id) || !spacing(id)) continue;
      nodes[id]!.type = type;
      taken.add(id);
      count--;
    }
  };
  const notNextTo = (type: SpaceType) => (id: number) => neighbours(id).every((nb) => nodes[nb]?.type !== type);
  place('shop', counts.shop, notNextTo('shop'));
  place('event', counts.event, notNextTo('event'));
  place('duel', counts.duel, notNextTo('duel'));
  place('red', counts.red, notNextTo('red'));
  return { width: BOARD_W, height: BOARD_H, start: 0, nodes };
}

export function isJunction(def: BoardDef, id: number): boolean {
  return (def.nodes[id]?.next.length ?? 0) > 1;
}

/** Walks `steps` counted spaces starting with `first`, always taking the first exit, for route previews. */
export function preview(def: BoardDef, first: number, steps: number): number[] {
  const path: number[] = [];
  let at = first;
  let left = steps;
  for (let guard = 0; guard < 200 && left > 0; guard++) {
    path.push(at);
    const node = def.nodes[at]!;
    if (node.type !== 'slot') left--;
    if (left <= 0) break;
    at = node.next[0]!;
  }
  return path;
}
