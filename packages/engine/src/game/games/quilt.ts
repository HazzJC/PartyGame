import { DRAW_PALETTE, DRAW_SIZE, sanitiseStrokes, type CoopGrade, type Stroke } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';

/**
 * Collaborative Quilt (co-op): each player draws one patch of a shared picture, seeing only the
 * edges of their neighbours' patches. The quilt is only revealed at the end. The grade rewards
 * everyone taking part and lines that carry on across the seams.
 */
export interface QuiltData {
  theme: string;
  cols: number;
  rows: number;
  /** Patch index → player. */
  patches: string[];
  strokes: Record<string, Stroke[]>;
  closesAt: number;
}

const TIME_MS = 70_000;
export const EDGE = 90;
const THEMES = ['A busy garden', 'Under the sea', 'A city at night', 'Outer space', 'A jungle', 'A seaside town', 'A dragon’s castle', 'A giant pizza', 'A farm', 'A rainy day'];

export function quiltSize(n: number): { cols: number; rows: number } {
  if (n <= 6) return { cols: 3, rows: 2 };
  if (n <= 8) return { cols: 4, rows: 2 };
  if (n <= 9) return { cols: 3, rows: 3 };
  if (n <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 };
}

/** Points of a patch's strokes that sit near one side (0 top, 1 right, 2 bottom, 3 left), as positions along that side. */
export function edgePoints(strokes: Stroke[], side: number): number[] {
  const out: number[] = [];
  for (const s of strokes)
    for (let i = 0; i < s.p.length; i += 2) {
      const x = s.p[i]!;
      const y = s.p[i + 1]!;
      if (side === 0 && y < EDGE) out.push(x);
      if (side === 2 && y > DRAW_SIZE - EDGE) out.push(x);
      if (side === 1 && x > DRAW_SIZE - EDGE) out.push(y);
      if (side === 3 && x < EDGE) out.push(y);
    }
  return out;
}

/** A seam counts as joined when lines meet it from both sides at roughly the same place. */
export function seamJoined(a: number[], b: number[]): boolean {
  return a.some((p) => b.some((q) => Math.abs(p - q) < 120));
}

export function quiltGrade(d: QuiltData): CoopGrade {
  const drawn = d.patches.filter((id) => (d.strokes[id]?.length ?? 0) >= 2).length / d.patches.length;
  let seams = 0;
  let joined = 0;
  for (let i = 0; i < d.patches.length; i++) {
    const x = i % d.cols;
    const y = Math.floor(i / d.cols);
    const me = d.strokes[d.patches[i]!] ?? [];
    if (x + 1 < d.cols) {
      seams++;
      if (seamJoined(edgePoints(me, 1), edgePoints(d.strokes[d.patches[i + 1]!] ?? [], 3))) joined++;
    }
    if (y + 1 < d.rows) {
      seams++;
      if (seamJoined(edgePoints(me, 2), edgePoints(d.strokes[d.patches[i + d.cols]!] ?? [], 0))) joined++;
    }
  }
  const seam = seams ? joined / seams : 1;
  if (drawn >= 0.9 && seam >= 0.5) return 'gold';
  if (drawn >= 0.75 && seam >= 0.25) return 'silver';
  if (drawn >= 0.5) return 'bronze';
  return 'fail';
}

function neighbourEdges(d: QuiltData, seatId: string): Record<string, Stroke[]> {
  const i = d.patches.indexOf(seatId);
  if (i < 0) return {};
  const x = i % d.cols;
  const y = Math.floor(i / d.cols);
  const at = (dx: number, dy: number) => (x + dx >= 0 && x + dx < d.cols && y + dy >= 0 && y + dy < d.rows ? d.patches[(y + dy) * d.cols + x + dx] : undefined);
  // Only the strip of each neighbour next to your patch is shared.
  const strip = (id: string | undefined, keep: (x: number, y: number) => boolean): Stroke[] =>
    (id ? d.strokes[id] ?? [] : [])
      .map((s) => {
        const p: number[] = [];
        for (let k = 0; k < s.p.length; k += 2) if (keep(s.p[k]!, s.p[k + 1]!)) p.push(s.p[k]!, s.p[k + 1]!);
        return { ...s, p };
      })
      .filter((s) => s.p.length >= 2);
  return {
    top: strip(at(0, -1), (_, y2) => y2 > DRAW_SIZE - EDGE),
    right: strip(at(1, 0), (x2) => x2 < EDGE),
    bottom: strip(at(0, 1), (_, y2) => y2 < EDGE),
    left: strip(at(-1, 0), (x2) => x2 > DRAW_SIZE - EDGE),
  };
}

export const collaborativeQuilt = defineMinigame<QuiltData>({
  id: 'collaborative-quilt',
  name: 'Collaborative Quilt',
  formats: ['coop'],
  inputs: [{ kind: 'draw', what: 'Draw your patch' }],
  blurb: 'Together you draw one big picture. You each get a patch and can only see the edges of your neighbours’ patches. Carry your lines across the seams!',
  minPlayers: 4,
  setup(ctx) {
    const { cols, rows } = quiltSize(ctx.n);
    const ids = ctx.rng.shuffle(ctx.phase.participants);
    // More patches than players in odd rooms: the extras are left blank (and don't count).
    const patches = Array.from({ length: cols * rows }, (_, i) => ids[i] ?? '').filter((id) => id);
    const closesAt = ctx.now() + TIME_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    return { theme: ctx.rng.pick(THEMES), cols, rows: Math.ceil(patches.length / cols), patches, strokes: {}, closesAt };
  },
  intent(_ctx, d, seatId, intent) {
    if (intent.type !== 'patch' || !d.patches.includes(seatId)) return;
    d.strokes[seatId] = sanitiseStrokes(intent.strokes, DRAW_PALETTE.length).slice(0, 80);
  },
  timer(ctx, d, key) {
    if (key === 'deadline') ctx.finish({ kind: 'coop', grade: quiltGrade(d) }, 7000);
  },
  awaiting: (_ctx, d, seatId) => (d.strokes[seatId]?.length ?? 0) < 4,
  botDelay: [4000, 12_000],
  bot(ctx, d, seatId) {
    // A bot scribbles a line from one edge to another, so seams have something to meet.
    const mine = d.strokes[seatId] ?? [];
    const y = ctx.rng.int(200, 800);
    const line: Stroke = { c: ctx.rng.int(0, 6), w: 22, p: [0, y, 250, y + ctx.rng.int(-80, 80), 500, y, 750, y + ctx.rng.int(-80, 80), 1000, y] };
    return { type: 'patch', strokes: [...mine, line] };
  },
  hostView: (ctx, d) => ({
    theme: d.theme,
    cols: d.cols,
    rows: d.rows,
    patches: d.patches,
    closesAt: d.closesAt,
    drawn: d.patches.filter((id) => (d.strokes[id]?.length ?? 0) > 0),
    // The full quilt is a surprise for the reveal.
    strokes: ctx.phase.stage === 'reveal' ? d.strokes : null,
  }),
  playerView: (_ctx, d, seatId) => ({ theme: d.theme, closesAt: d.closesAt, myStrokes: d.strokes[seatId] ?? [], edges: neighbourEdges(d, seatId), drawing: d.patches.includes(seatId) }),
});
