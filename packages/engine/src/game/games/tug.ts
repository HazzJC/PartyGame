import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Tug of War (team): mash to pull. Hazard windows — drawn on every controller at a scheduled
 * server time — make taps pull your own team backwards. Teams are compared by per-player
 * average, so uneven teams are fair.
 */
export interface Hazard {
  at: number;
  until: number;
}

export interface TugData {
  /** -1 = team 0 wins, +1 = team 1 wins. */
  marker: number;
  startAt: number;
  closesAt: number;
  hazards: Hazard[];
  /** Taps since the last tick, per team: good pulls and hazard slips. */
  pending: [number, number][];
  lastTickAt: number;
  taps: Record<string, number>;
  winner: number | null;
}

export const TUG_MS = 20_000;
/** How far one tap per second per player moves the marker, per second. */
const PULL = 0.018;

export const tugOfWar = defineMinigame<TugData>({
  id: 'tug-of-war',
  name: 'Tug of War',
  formats: ['team'],
  teamCounts: [2],
  inputs: [{ kind: 'mash', what: 'Pull' }],
  blurb: 'Mash to pull the rope your way. When the rope flashes red it is slippery: every tap then pulls you backwards!',
  minPlayers: 2,
  setup(ctx) {
    const startAt = ctx.now() + 3000;
    const closesAt = startAt + TUG_MS;
    const hazards: Hazard[] = [];
    let t = startAt + ctx.rng.int(2500, 4500);
    while (t < closesAt - 2500) {
      const len = ctx.rng.int(1300, 2200);
      hazards.push({ at: t, until: t + len });
      t += len + ctx.rng.int(2500, 4500);
    }
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 300);
    const teams = ctx.phase.teams?.length ?? 2;
    return { marker: 0, startAt, closesAt, hazards, pending: Array.from({ length: teams }, () => [0, 0] as [number, number]), lastTickAt: startAt, taps: {}, winner: null };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'mash' || ctx.now() < d.startAt - 500) return;
    const team = ctx.phase.teams?.findIndex((t) => t.includes(seatId)) ?? -1;
    if (team < 0) return;
    // The controller caps taps at 10/s and splits them into good pulls and hazard slips locally.
    const good = Math.max(0, Math.min(10, Math.round(Number(intent.good) || 0)));
    const bad = Math.max(0, Math.min(10, Math.round(Number(intent.bad) || 0)));
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
    // Per-player average pull rate for each team.
    const rate = d.pending.map(([good, bad], i) => (good - bad * 1.5) / Math.max(1, teams[i]?.length ?? 1) / Math.max(dt, 0.1));
    d.pending = d.pending.map(() => [0, 0]);
    const delta = ((rate[1] ?? 0) - (rate[0] ?? 0)) * PULL * dt;
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
  hostView: (_ctx, d) => ({ marker: d.marker, startAt: d.startAt, closesAt: d.closesAt, hazards: d.hazards, winner: d.winner }),
  playerView: (ctx, d, seatId) => ({
    marker: d.marker,
    startAt: d.startAt,
    closesAt: d.closesAt,
    hazards: d.hazards,
    team: ctx.phase.teams?.findIndex((t) => t.includes(seatId)) ?? -1,
    myTaps: d.taps[seatId] ?? 0,
  }),
});

function finish(ctx: MgContext, d: TugData): void {
  if (d.winner !== null) return;
  d.winner = d.marker < 0 ? 0 : d.marker > 0 ? 1 : -1;
  const teamPlaces = d.winner === -1 ? [1, 1] : d.winner === 0 ? [1, 2] : [2, 1];
  ctx.finish({ kind: 'team', teamPlaces }, 4500);
}
