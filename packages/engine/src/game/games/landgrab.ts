import { LAND_EMPTY, LAND_NEUTRAL, LAND_SHAPES, landGrabSide, placementCells, placesFromScores, rotateShape } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Land Grab: each round you get a piece; place it touching your territory. Cells two players both
 * claim stay neutral forever, but the rest of each piece is placed. The phone shows a zoomed view
 * of your own area. Biggest territory wins.
 */
export { placementCells };
export const SHAPES = LAND_SHAPES;
export const rotate = rotateShape;
export const NEUTRAL = LAND_NEUTRAL;
export const EMPTY = LAND_EMPTY;

export interface LandData {
  side: number;
  cells: number[];
  order: string[];
  round: number;
  maxRounds: number;
  stage: 'place' | 'show';
  closesAt: number;
  pieces: Record<string, number>;
  placements: Record<string, { x: number; y: number; rot: number }>;
  /** Cells claimed last round: cell → owner index (or NEUTRAL for clashes). */
  lastClaims: Record<number, number>;
  shownAt: number;
}

const PLACE_MS = 20_000;
const SHOW_MS = 4500;

/** Resolves a round: every valid placement lands, except cells claimed by two or more players. */
export function resolveLand(d: LandData): void {
  const claims = new Map<number, number[]>();
  d.order.forEach((id, owner) => {
    const p = d.placements[id];
    if (!p) return;
    const cells = placementCells(d, owner, SHAPES[d.pieces[id]!]!, p.x, p.y, p.rot);
    for (const c of cells ?? []) claims.set(c, [...(claims.get(c) ?? []), owner]);
  });
  d.lastClaims = {};
  for (const [c, owners] of claims) {
    const v = owners.length > 1 ? NEUTRAL : owners[0]!;
    d.cells[c] = v;
    d.lastClaims[c] = v;
  }
}

export function territory(d: Pick<LandData, 'cells' | 'order'>): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(d.order.map((id) => [id, 0]));
  for (const v of d.cells) if (v >= 0) out[d.order[v]!]!++;
  return out;
}

function dealPieces(ctx: MgContext, d: LandData): void {
  for (const id of d.order) d.pieces[id] = ctx.rng.int(0, SHAPES.length - 1);
}

function startRound(ctx: MgContext, d: LandData): void {
  d.round++;
  d.stage = 'place';
  d.placements = {};
  dealPieces(ctx, d);
  d.closesAt = ctx.now() + PLACE_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

export const landGrab = defineMinigame<LandData>({
  id: 'land-grab',
  name: 'Land Grab',
  formats: ['ffa'],
  inputs: [{ kind: 'grid', rotate: true, what: 'Place your piece next to your land' }],
  blurb: 'Place your piece touching your own land. If two players claim the same square, it stays empty forever, but the rest of each piece still lands. Biggest territory after five rounds wins.',
  setup(ctx) {
    const side = landGrabSide(ctx.n);
    const order = ctx.rng.shuffle(ctx.phase.participants);
    const cells = Array.from({ length: side * side }, () => EMPTY);
    // Home cells spread on a coarse grid.
    const per = Math.ceil(Math.sqrt(order.length));
    order.forEach((_, i) => {
      const gx = i % per;
      const gy = Math.floor(i / per);
      const x = Math.floor(((gx + 0.5) * side) / per);
      const y = Math.floor(((gy + 0.5) * side) / per);
      cells[y * side + x] = i;
    });
    const d: LandData = { side, cells, order, round: 0, maxRounds: 5, stage: 'place', closesAt: 0, pieces: {}, placements: {}, lastClaims: {}, shownAt: 0 };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'place' || d.stage !== 'place') return;
    const owner = d.order.indexOf(seatId);
    const x = Math.round(Number(intent.x));
    const y = Math.round(Number(intent.y));
    const rot = Math.round(Number(intent.rot)) || 0;
    if (!placementCells(d, owner, SHAPES[d.pieces[seatId]!]!, x, y, rot)) return;
    d.placements[seatId] = { x, y, rot };
    if (d.order.every((id) => id in d.placements)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'place') {
      resolveLand(d);
      d.stage = 'show';
      d.shownAt = ctx.now();
      if (d.round >= d.maxRounds) {
        ctx.finish({ kind: 'ffa', places: placesFromScores(territory(d), 'high') }, SHOW_MS + 1500);
        return;
      }
      ctx.phase.endsAt = ctx.now() + SHOW_MS;
      ctx.setTimer('next', ctx.now() + SHOW_MS);
    } else if (key === 'next' || (key === 'deadline' && d.stage === 'show')) startRound(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'place' && !(seatId in d.placements),
  botDelay: [2500, 12_000],
  bot(ctx, d, seatId) {
    const owner = d.order.indexOf(seatId);
    const mine = d.cells.map((v, i) => (v === owner ? i : -1)).filter((i) => i >= 0);
    for (let tries = 0; tries < 80; tries++) {
      const base = ctx.rng.pick(mine);
      const x = (base % d.side) + ctx.rng.int(-3, 2);
      const y = Math.floor(base / d.side) + ctx.rng.int(-3, 2);
      const rot = ctx.rng.int(0, 3);
      if (placementCells(d, owner, SHAPES[d.pieces[seatId]!]!, x, y, rot)) return { type: 'place', x, y, rot };
    }
    return null;
  },
  hostView: (_ctx, d) => ({ side: d.side, cells: d.cells, order: d.order, round: d.round, maxRounds: d.maxRounds, stage: d.stage, closesAt: d.closesAt, submitted: Object.keys(d.placements), lastClaims: d.stage === 'show' ? d.lastClaims : {}, scores: territory(d), shownAt: d.shownAt }),
  playerView: (_ctx, d, seatId) => ({
    side: d.side,
    cells: d.cells,
    order: d.order,
    me: d.order.indexOf(seatId),
    piece: SHAPES[d.pieces[seatId] ?? 0],
    round: d.round,
    maxRounds: d.maxRounds,
    stage: d.stage,
    closesAt: d.closesAt,
    myPlacement: d.placements[seatId] ?? null,
    myScore: territory(d)[seatId] ?? 0,
    shownAt: d.shownAt,
  }),
});
