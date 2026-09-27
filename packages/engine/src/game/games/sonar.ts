import { placesFromScores, sonarSide } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Deep Sea Sonar: drop a net on a cell; tangled nets (two or more on one cell) catch nothing.
 * The shared screen shows a blurry public sonar map; each phone privately gets an exact reading
 * of one small patch, so the private screen carries real information. Two rounds.
 */
export interface SonarData {
  side: number;
  /** Fish per cell, 0 to 9. Hidden until each round resolves. */
  fish: number[];
  round: number;
  rounds: number;
  stage: 'pick' | 'show';
  closesAt: number;
  nets: Record<string, number>;
  shown: Record<string, number> | null;
  gains: Record<string, number>;
  scores: Record<string, number>;
  /** Private readings: player → [cell, fish] for a 3×3 patch. */
  readings: Record<string, [number, number][]>;
  shownAt: number;
}

export const SONAR_ROUNDS = 2;
const PICK_MS = 15_000;
const SHOW_MS = 5000;

/** Public blurry map: each cell's reading is the average of its neighbourhood, rounded. */
export function blurred(fish: number[], side: number): number[] {
  return fish.map((_, i) => {
    const x = i % side;
    const y = Math.floor(i / side);
    let sum = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
        sum += fish[ny * side + nx]!;
        n++;
      }
    return Math.round(sum / n);
  });
}

export function scoreNets(fish: number[], nets: Record<string, number>): Record<string, number> {
  const counts = new Map<number, number>();
  for (const c of Object.values(nets)) counts.set(c, (counts.get(c) ?? 0) + 1);
  return Object.fromEntries(Object.entries(nets).map(([id, c]) => [id, counts.get(c)! > 1 ? 0 : fish[c] ?? 0]));
}

function newSea(ctx: MgContext, d: SonarData): void {
  const cells = d.side * d.side;
  // A few rich shoals on a mostly poor sea.
  d.fish = Array.from({ length: cells }, () => (ctx.rng.chance(0.6) ? ctx.rng.int(0, 2) : ctx.rng.int(3, 6)));
  for (let i = 0; i < Math.max(2, Math.round(cells / 12)); i++) d.fish[ctx.rng.int(0, cells - 1)] = ctx.rng.int(7, 9);
  d.readings = {};
  for (const id of ctx.phase.participants) {
    const cx = ctx.rng.int(1, d.side - 2);
    const cy = ctx.rng.int(1, d.side - 2);
    const patch: [number, number][] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) patch.push([(cy + dy) * d.side + cx + dx, d.fish[(cy + dy) * d.side + cx + dx]!]);
    d.readings[id] = patch;
  }
}

function startRound(ctx: MgContext, d: SonarData): void {
  d.round++;
  d.stage = 'pick';
  d.nets = {};
  newSea(ctx, d);
  d.closesAt = ctx.now() + PICK_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

export const deepSeaSonar = defineMinigame<SonarData>({
  id: 'deep-sea-sonar',
  name: 'Deep Sea Sonar',
  formats: ['ffa'],
  inputs: [{ kind: 'grid', what: 'Drop your net' }],
  blurb: 'Drop a net on the sea. The shared sonar is blurry, but your phone has an exact reading of one patch. Two nets in the same spot tangle and catch nothing.',
  setup(ctx) {
    const side = sonarSide(ctx.n);
    const d: SonarData = { side, fish: [], round: 0, rounds: SONAR_ROUNDS, stage: 'pick', closesAt: 0, nets: {}, shown: null, gains: {}, scores: {}, readings: {}, shownAt: 0 };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'net' || d.stage !== 'pick') return;
    const c = Number(intent.cell);
    if (!Number.isInteger(c) || c < 0 || c >= d.side * d.side) return;
    d.nets[seatId] = c;
    if (ctx.phase.participants.every((id) => id in d.nets)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'pick') {
      d.gains = scoreNets(d.fish, d.nets);
      for (const id of ctx.phase.participants) d.scores[id] = (d.scores[id] ?? 0) + (d.gains[id] ?? 0);
      d.shown = d.nets;
      d.stage = 'show';
      d.shownAt = ctx.now();
      if (d.round >= d.rounds) {
        ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((id) => [id, d.scores[id] ?? 0])), 'high') }, SHOW_MS + 1500);
        return;
      }
      ctx.phase.endsAt = ctx.now() + SHOW_MS;
      ctx.setTimer('next', ctx.now() + SHOW_MS);
    } else if (key === 'next' || (key === 'deadline' && d.stage === 'show')) startRound(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'pick' && !(seatId in d.nets),
  botDelay: [2000, 10_000],
  bot(ctx, d, seatId) {
    // Bots trust their private reading half the time, otherwise the blurry public map.
    const reading = d.readings[seatId] ?? [];
    if (reading.length && ctx.rng.chance(0.5)) {
      const best = [...reading].sort((a, b) => b[1] - a[1])[ctx.rng.int(0, 1)]!;
      return { type: 'net', cell: best[0] };
    }
    const blur = blurred(d.fish, d.side);
    const ranked = blur.map((v, i) => [i, v + ctx.rng.next() * 3] as const).sort((a, b) => b[1] - a[1]);
    return { type: 'net', cell: ranked[ctx.rng.int(0, 4)]![0] };
  },
  hostView: (_ctx, d) => ({
    side: d.side,
    round: d.round,
    rounds: d.rounds,
    stage: d.stage,
    closesAt: d.closesAt,
    sonar: blurred(d.fish, d.side),
    submitted: Object.keys(d.nets),
    fish: d.stage === 'show' ? d.fish : null,
    nets: d.stage === 'show' ? d.shown : null,
    gains: d.stage === 'show' ? d.gains : null,
    scores: d.scores,
    shownAt: d.shownAt,
  }),
  playerView: (_ctx, d, seatId) => ({
    side: d.side,
    round: d.round,
    rounds: d.rounds,
    stage: d.stage,
    closesAt: d.closesAt,
    sonar: blurred(d.fish, d.side),
    reading: d.readings[seatId] ?? [],
    myNet: d.nets[seatId] ?? null,
    myGain: d.stage === 'show' ? d.gains[seatId] ?? 0 : null,
    myScore: d.scores[seatId] ?? 0,
    shownAt: d.shownAt,
  }),
});
