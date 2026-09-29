import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Tug of War (team): mash to pull. Hazard windows — drawn on every controller at a scheduled
 * server time — make taps pull your own team backwards. Every individual carries the same
 * weight: a team's pull is its members' average, so each pull on a smaller team counts for more
 * (3 against 5: each pull counts 5/3 as much) and uneven teams are fair.
 *
 * It runs until the rope reaches one end. Every pull starts weak and pull power doubles every
 * POWER_DOUBLING_S seconds: early on it takes a big tapping advantage to win ground, later even a
 * small edge swings it, and a tiny wobble that grows with power settles perfectly matched teams.
 */
export interface Hazard {
  at: number;
  until: number;
}

export interface TugData {
  /** -1 = team 0 wins, +1 = team 1 wins. */
  marker: number;
  startAt: number;
  hazards: Hazard[];
  /** Current pull multiplier (grows over time), shown on the screens. */
  power: number;
  /** Taps since the last tick, per team: good pulls and hazard slips. */
  pending: [number, number][];
  lastTickAt: number;
  taps: Record<string, number>;
  winner: number | null;
}

/** Pull power doubles this often, so a close game always reaches an end. */
export const POWER_DOUBLING_S = 8;
/** Starting pull: a 5 taps/s-per-player lead takes about 12 s to win; a 0.5 taps/s edge about 40 s. */
const PULL = 0.0107;
/** A small random wobble (scaled by power) so perfectly matched teams still finish. */
const WOBBLE = 0.004;
/** A safety net: if the rope still hasn't reached an end, the side it's on wins. */
export const TUG_MAX_MS = 120_000;

export const tugPower = (elapsedMs: number): number => Math.pow(2, Math.max(0, elapsedMs) / 1000 / POWER_DOUBLING_S);

/** How much each pull counts per team, relative to the largest team (the smaller side's pulls count for more). */
export function tugWeights(sizes: number[]): number[] {
  const largest = Math.max(1, ...sizes);
  return sizes.map((n) => largest / Math.max(1, n));
}

/**
 * Each team's pull rate per player this tick: good pulls minus slips (which cost 1.5), weighted
 * so every individual counts the same whatever the team sizes.
 */
export function tugRates(pending: [number, number][], sizes: number[], dt: number): number[] {
  const largest = Math.max(1, ...sizes);
  const w = tugWeights(sizes);
  return pending.map(([good, bad], i) => ((good - bad * 1.5) * (w[i] ?? 1)) / largest / Math.max(dt, 0.1));
}

export const tugOfWar = defineMinigame<TugData>({
  id: 'tug-of-war',
  name: 'Tug of War',
  formats: ['team'],
  teamCounts: [2],
  inputs: [{ kind: 'mash', what: 'Pull' }],
  blurb: 'Mash to pull the rope all the way to your side. Pulls get stronger as the game goes on, so never let up. When the rope flashes red it is slippery: every tap then pulls you backwards!',
  minPlayers: 2,
  setup(ctx) {
    const startAt = ctx.now() + 3000;
    const hazards: Hazard[] = [];
    let t = startAt + ctx.rng.int(2500, 4500);
    while (t < startAt + TUG_MAX_MS) {
      const len = ctx.rng.int(1300, 2200);
      hazards.push({ at: t, until: t + len });
      t += len + ctx.rng.int(2500, 4500);
    }
    // No countdown: the game ends when the rope does.
    ctx.phase.endsAt = null;
    // Wake the room when the pull starts, so the ticker and the bots begin even before anyone taps.
    ctx.setTimer('go', startAt);
    ctx.setTimer('deadline', startAt + TUG_MAX_MS);
    const teams = ctx.phase.teams?.length ?? 2;
    return { marker: 0, startAt, hazards, power: 1, pending: Array.from({ length: teams }, () => [0, 0] as [number, number]), lastTickAt: startAt, taps: {}, winner: null };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'mash' || ctx.now() < d.startAt - 500) return;
    const team = ctx.phase.teams?.findIndex((t) => t.includes(seatId)) ?? -1;
    if (team < 0) return;
    // The phone counts taps locally (one input style, capped at 30/s), judges good pulls vs
    // hazard slips by synced time, and sends ~250 ms batches; 40 per batch allows a delayed one.
    const good = Math.max(0, Math.min(40, Math.round(Number(intent.good) || 0)));
    const bad = Math.max(0, Math.min(40, Math.round(Number(intent.bad) || 0)));
    d.pending[team]![0] += good;
    d.pending[team]![1] += bad;
    d.taps[seatId] = (d.taps[seatId] ?? 0) + good;
  },
  tickHz: (ctx, d) => (ctx.now() >= d.startAt && d.winner === null ? 10 : 0),
  tick(ctx, d) {
    const now = ctx.now();
    const dt = Math.max(0, Math.min(0.5, (now - d.lastTickAt) / 1000));
    d.lastTickAt = now;
    const teams = ctx.phase.teams ?? [];
    // Every individual counts the same: the smaller team's pulls are weighted up.
    const rate = tugRates(d.pending, d.pending.map((_, i) => teams[i]?.length ?? 1), dt);
    d.pending = d.pending.map(() => [0, 0]);
    d.power = tugPower(now - d.startAt);
    const wobble = (ctx.rng.next() - 0.5) * 2 * WOBBLE * d.power * Math.sqrt(dt);
    const delta = ((rate[1] ?? 0) - (rate[0] ?? 0)) * PULL * d.power * dt + wobble;
    d.marker = Math.max(-1, Math.min(1, Math.round((d.marker + delta) * 1000) / 1000));
    if (Math.abs(d.marker) >= 1) finish(ctx, d);
    return undefined;
  },
  timer(ctx, d, key) {
    if (key === 'deadline') finish(ctx, d);
  },
  awaiting: (ctx, d) => ctx.now() >= d.startAt - 200 && d.winner === null,
  botDelay: [240, 260],
  bot(ctx, d) {
    const now = ctx.now();
    const inHazard = d.hazards.some((h) => now >= h.at && now < h.until);
    const taps = ctx.rng.int(1, 3);
    // Bots mostly notice the hazard, but not always.
    return inHazard ? (ctx.rng.chance(0.75) ? null : { type: 'mash', good: 0, bad: 1 }) : { type: 'mash', good: taps, bad: 0 };
  },
  hostView: (ctx, d) => ({ marker: d.marker, startAt: d.startAt, power: d.power, hazards: d.hazards, winner: d.winner, weights: tugWeights((ctx.phase.teams ?? []).map((t) => t.length)) }),
  playerView: (ctx, d, seatId) => ({
    marker: d.marker,
    startAt: d.startAt,
    power: d.power,
    hazards: d.hazards,
    team: ctx.phase.teams?.findIndex((t) => t.includes(seatId)) ?? -1,
    myTaps: d.taps[seatId] ?? 0,
    weights: tugWeights((ctx.phase.teams ?? []).map((t) => t.length)),
  }),
});

function finish(ctx: MgContext, d: TugData): void {
  if (d.winner !== null) return;
  d.winner = d.marker < 0 ? 0 : d.marker > 0 ? 1 : -1;
  const teamPlaces = d.winner === -1 ? [1, 1] : d.winner === 0 ? [1, 2] : [2, 1];
  ctx.finish({ kind: 'team', teamPlaces }, 4500);
}
