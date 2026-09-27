import { placesFromScores } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Crumble Tower: rows of three blocks. Each round everyone secretly removes a block; higher
 * blocks score more. Removals resolve lowest block first, and the removal that first makes a row
 * unstable topples the tower: that player is at fault and the game ends.
 */
export interface TowerData {
  /** rows[r] = [left, middle, right] present? Row 0 is the bottom. */
  rows: [boolean, boolean, boolean][];
  round: number;
  maxRounds: number;
  stage: 'pick' | 'show';
  closesAt: number;
  picks: Record<string, [number, number]>;
  /** Resolution log for the host animation. */
  log: { id: string; row: number; col: number; outcome: 'took' | 'bumped' | 'toppled' }[];
  scores: Record<string, number>;
  fault: string | null;
  shownAt: number;
}

const PICK_MS = 12_000;
const SHOW_MS = 5500;

export const towerRows = (n: number): number => Math.min(30, Math.ceil((4 * n) / 3) + 3);
export const blockPoints = (row: number): number => 1 + Math.floor(row / 2);

/** A row stands if its middle block is there, or both side blocks are. */
export function rowStable(row: [boolean, boolean, boolean]): boolean {
  return row[1] || (row[0] && row[2]);
}

export function resolveTower(d: Pick<TowerData, 'rows' | 'picks' | 'scores'>): { log: TowerData['log']; fault: string | null } {
  const log: TowerData['log'] = [];
  const order = Object.entries(d.picks).sort(([, a], [, b]) => a[0] - b[0] || a[1] - b[1]);
  const taken = new Set<string>();
  // Two players pulling the same block both come away empty-handed.
  const clash = new Set<string>();
  const seen = new Map<string, number>();
  for (const [, [r, c]] of order) seen.set(`${r},${c}`, (seen.get(`${r},${c}`) ?? 0) + 1);
  for (const [k, n] of seen) if (n > 1) clash.add(k);
  for (const [id, [r, c]] of order) {
    const key = `${r},${c}`;
    const row = d.rows[r];
    if (!row || !row[c] || clash.has(key) || taken.has(key)) {
      log.push({ id, row: r, col: c, outcome: 'bumped' });
      continue;
    }
    row[c] = false;
    taken.add(key);
    if (!rowStable(row)) {
      log.push({ id, row: r, col: c, outcome: 'toppled' });
      return { log, fault: id };
    }
    d.scores[id] = (d.scores[id] ?? 0) + blockPoints(r);
    log.push({ id, row: r, col: c, outcome: 'took' });
  }
  return { log, fault: null };
}

function startRound(ctx: MgContext, d: TowerData): void {
  d.round++;
  d.stage = 'pick';
  d.picks = {};
  d.closesAt = ctx.now() + PICK_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function finish(ctx: MgContext, d: TowerData): void {
  const scores = Object.fromEntries(ctx.phase.participants.map((id) => [id, id === d.fault ? -1 : d.scores[id] ?? 0]));
  ctx.finish({ kind: 'ffa', places: placesFromScores(scores, 'high') }, SHOW_MS + 1500);
}

export const crumbleTower = defineMinigame<TowerData>({
  id: 'crumble-tower',
  name: 'Crumble Tower',
  formats: ['ffa'],
  inputs: [{ kind: 'pick', what: 'Pull a block' }],
  blurb: 'Pull one block each round. Higher blocks score more. A row falls if it loses its middle block and a side block. The first pull that topples the tower loses everything.',
  setup(ctx) {
    const d: TowerData = {
      rows: Array.from({ length: towerRows(ctx.n) }, () => [true, true, true] as [boolean, boolean, boolean]),
      round: 0,
      maxRounds: 4,
      stage: 'pick',
      closesAt: 0,
      picks: {},
      log: [],
      scores: {},
      fault: null,
      shownAt: 0,
    };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'block' || d.stage !== 'pick') return;
    const r = Number(intent.row);
    const c = Number(intent.col);
    // The top row can't be pulled.
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= d.rows.length - 1 || c < 0 || c > 2 || !d.rows[r]![c]) return;
    d.picks[seatId] = [r, c];
    if (ctx.phase.participants.every((id) => id in d.picks)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'pick') {
      const { log, fault } = resolveTower(d);
      d.log = log;
      d.fault = fault;
      d.stage = 'show';
      d.shownAt = ctx.now();
      if (fault || d.round >= d.maxRounds) return finish(ctx, d);
      ctx.phase.endsAt = ctx.now() + SHOW_MS;
      ctx.setTimer('next', ctx.now() + SHOW_MS);
    } else if (key === 'next' || (key === 'deadline' && d.stage === 'show')) startRound(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'pick' && !(seatId in d.picks),
  botDelay: [1500, 8000],
  bot(ctx, d) {
    const options: [number, number][] = [];
    d.rows.forEach((row, r) => {
      if (r >= d.rows.length - 1) return;
      row.forEach((present, c) => {
        if (!present) return;
        const after: [boolean, boolean, boolean] = [...row];
        after[c] = false;
        // Bots usually avoid obviously fatal pulls.
        if (rowStable(after) || ctx.rng.chance(0.15)) options.push([r, c]);
      });
    });
    const [row, col] = options.length ? ctx.rng.pick(options) : [0, 0];
    return { type: 'block', row, col };
  },
  hostView: (_ctx, d) => ({ rows: d.rows, round: d.round, maxRounds: d.maxRounds, stage: d.stage, closesAt: d.closesAt, submitted: Object.keys(d.picks), log: d.stage === 'show' ? d.log : [], fault: d.fault, scores: d.scores, shownAt: d.shownAt }),
  playerView: (_ctx, d, seatId) => ({ rows: d.rows, round: d.round, maxRounds: d.maxRounds, stage: d.stage, closesAt: d.closesAt, myPick: d.picks[seatId] ?? null, myScore: d.scores[seatId] ?? 0, shownAt: d.shownAt, fault: d.fault === seatId }),
});
