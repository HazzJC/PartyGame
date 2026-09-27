import { traceLaser, type Mirror } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';
import { teamOf, teamPlaces } from './teams.ts';

/**
 * Mirror Maze Optics (team): every team gets the same grid, laser and targets. Each player owns
 * some mirror slots and flips them between /, \ and empty. One laser trace scores the targets it
 * crosses. Phones preview their own team's path live (a deterministic grid calculation); the host
 * only reveals the boards at the end so teams can't copy each other.
 */
export type { Mirror };
export { traceLaser };

export interface MirrorData {
  size: number;
  source: { x: number; y: number; dx: number; dy: number };
  targets: number[];
  walls: number[];
  slots: number[];
  /** Per team: slot index → mirror. */
  boards: Mirror[][];
  /** Per team: slot index → owner seat. */
  owners: string[][];
  closesAt: number;
}

const BUILD_MS = 45_000;
export const MIRROR_SIZE = 8;
const SLOTS = 8;

function assignOwners(team: string[]): string[] {
  // Small teams control several mirrors each.
  return Array.from({ length: SLOTS }, (_, i) => team[i % Math.max(1, team.length)] ?? '');
}

function makeLayout(ctx: MgContext): Pick<MirrorData, 'size' | 'source' | 'targets' | 'walls' | 'slots'> {
  const size = MIRROR_SIZE;
  const source = { x: -1, y: ctx.rng.int(1, size - 2), dx: 1, dy: 0 };
  const cells = ctx.rng.shuffle(Array.from({ length: size * size }, (_, i) => i).filter((c) => c % size !== 0));
  const slots = cells.slice(0, SLOTS);
  const targets = cells.slice(SLOTS, SLOTS + 5);
  const walls = cells.slice(SLOTS + 5, SLOTS + 9);
  return { size, source, targets, walls, slots };
}

export const mirrorMaze = defineMinigame<MirrorData>({
  id: 'mirror-maze',
  name: 'Mirror Maze Optics',
  formats: ['team'],
  inputs: [{ kind: 'grid', what: 'Flip your mirrors' }],
  blurb: 'Each of you controls some mirrors. Flip them so your team’s laser crosses as many targets as possible. Your phone shows your team’s beam live.',
  setup(ctx) {
    const layout = makeLayout(ctx);
    const teams = ctx.phase.teams ?? [];
    const closesAt = ctx.now() + BUILD_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt);
    return { ...layout, boards: teams.map(() => Array<Mirror>(SLOTS).fill('')), owners: teams.map(assignOwners), closesAt };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'mirror') return;
    const t = teamOf(ctx, seatId);
    const slot = Number(intent.slot);
    const m = intent.mirror as Mirror;
    if (t < 0 || d.owners[t]?.[slot] !== seatId || !['/', '\\', ''].includes(m)) return;
    d.boards[t]![slot] = m;
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    const scores = d.boards.map((b) => traceLaser(d, b).hits.length);
    ctx.finish({ kind: 'team', teamPlaces: teamPlaces(scores, 'high') }, 6000);
  },
  awaiting: () => true,
  botDelay: [3000, 9000],
  bot(ctx, d, seatId) {
    const t = teamOf(ctx, seatId);
    const mine = d.owners[t]!.map((o, i) => (o === seatId ? i : -1)).filter((i) => i >= 0);
    if (!mine.length) return null;
    const slot = ctx.rng.pick(mine);
    // Try each mirror in this slot and keep the best for the team.
    let best: Mirror = d.boards[t]![slot]!;
    let bestScore = -1;
    for (const m of ['', '/', '\\'] as Mirror[]) {
      const trial = [...d.boards[t]!];
      trial[slot] = m;
      const score = traceLaser(d, trial).hits.length;
      if (score > bestScore || (score === bestScore && ctx.rng.chance(0.3))) {
        best = m;
        bestScore = score;
      }
    }
    return { type: 'mirror', slot, mirror: best };
  },
  hostView: (ctx, d) => ({
    size: d.size,
    source: d.source,
    targets: d.targets,
    walls: d.walls,
    slots: d.slots,
    closesAt: d.closesAt,
    // Boards stay hidden until the reveal so teams can't copy each other.
    boards: ctx.phase.stage === 'reveal' ? d.boards : null,
    scores: ctx.phase.stage === 'reveal' ? d.boards.map((b) => traceLaser(d, b).hits.length) : null,
  }),
  playerView: (ctx, d, seatId) => {
    const t = teamOf(ctx, seatId);
    return { size: d.size, source: d.source, targets: d.targets, walls: d.walls, slots: d.slots, closesAt: d.closesAt, team: t, board: d.boards[t] ?? [], owners: d.owners[t] ?? [] };
  },
});
