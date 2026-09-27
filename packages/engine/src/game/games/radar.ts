import { defineMinigame, type MgContext } from '../minigame.ts';
import { teamOf, teamPlaces } from './teams.ts';

/**
 * Radar Beacon (team): a beacon is hidden on the map. Each team gets 3 pings, taken in rotation
 * by different teammates; each ping reports the distance to the beacon. Then every teammate drops
 * a final marker and the team's guess is their average. Within the tolerance radius counts as a
 * direct hit. A fixed ping count means bigger teams gain nothing.
 */
export interface RadarData {
  target: { x: number; y: number };
  tolerance: number;
  stage: 'ping' | 'guess';
  ping: number;
  pings: number;
  closesAt: number;
  /** Per team: pings taken so far, with the distance they returned. */
  results: { x: number; y: number; dist: number; by: string }[][];
  guesses: Record<string, { x: number; y: number }>;
}

export const MAP = 100;
const PING_MS = 12_000;
const GUESS_MS = 15_000;

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Who pings next for a team: teammates take turns. */
export function pinger(team: string[], ping: number): string | undefined {
  return team[ping % Math.max(1, team.length)];
}

export function teamGuess(team: string[], guesses: RadarData['guesses']): { x: number; y: number } | null {
  const gs = team.map((id) => guesses[id]).filter((g): g is { x: number; y: number } => !!g);
  if (!gs.length) return null;
  return { x: gs.reduce((s, g) => s + g.x, 0) / gs.length, y: gs.reduce((s, g) => s + g.y, 0) / gs.length };
}

function startPing(ctx: MgContext, d: RadarData): void {
  d.stage = 'ping';
  d.closesAt = ctx.now() + PING_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function allPinged(ctx: MgContext, d: RadarData): boolean {
  return (ctx.phase.teams ?? []).every((_, t) => (d.results[t]?.length ?? 0) > d.ping);
}

const clamp = (v: unknown) => Math.max(0, Math.min(MAP, Math.round(Number(v))));

export const radarBeacon = defineMinigame<RadarData>({
  id: 'radar-beacon',
  name: 'Radar Beacon',
  formats: ['team'],
  inputs: [{ kind: 'grid', what: 'Ping, then guess' }],
  blurb: 'Take turns to ping the map: each ping tells your team how far away the hidden beacon is. After three pings, everyone drops a marker. Closest team wins.',
  setup(ctx) {
    const teams = ctx.phase.teams ?? [];
    const d: RadarData = { target: { x: ctx.rng.int(12, 88), y: ctx.rng.int(12, 88) }, tolerance: 6, stage: 'ping', ping: 0, pings: 3, closesAt: 0, results: teams.map(() => []), guesses: {} };
    startPing(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    const t = teamOf(ctx, seatId);
    if (t < 0) return;
    const at = { x: clamp(intent.x), y: clamp(intent.y) };
    if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) return;
    if (intent.type === 'ping' && d.stage === 'ping') {
      const team = ctx.phase.teams![t]!;
      if (pinger(team, d.ping) !== seatId || (d.results[t]?.length ?? 0) > d.ping) return;
      d.results[t]!.push({ ...at, dist: Math.round(dist(at, d.target) * 10) / 10, by: seatId });
      if (allPinged(ctx, d)) ctx.hurry('deadline', 1500);
    } else if (intent.type === 'guess' && d.stage === 'guess') {
      d.guesses[seatId] = at;
      if (ctx.phase.participants.every((id) => id in d.guesses)) ctx.hurry('deadline', 1000);
    }
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    if (d.stage === 'ping') {
      d.ping++;
      if (d.ping < d.pings) return startPing(ctx, d);
      d.stage = 'guess';
      d.closesAt = ctx.now() + GUESS_MS;
      ctx.phase.endsAt = d.closesAt;
      ctx.setTimer('deadline', d.closesAt + 400);
      ctx.room.scheduleBots();
      return;
    }
    const teams = ctx.phase.teams ?? [];
    const scores = teams.map((team) => {
      const g = teamGuess(team, d.guesses);
      if (!g) return 999;
      const e = dist(g, d.target);
      return e <= d.tolerance ? 0 : e;
    });
    ctx.finish({ kind: 'team', teamPlaces: teamPlaces(scores, 'low') }, 6000);
  },
  awaiting: (ctx, d, seatId) => {
    const t = teamOf(ctx, seatId);
    if (t < 0) return false;
    if (d.stage === 'ping') return pinger(ctx.phase.teams![t]!, d.ping) === seatId && (d.results[t]?.length ?? 0) <= d.ping;
    return !(seatId in d.guesses);
  },
  botDelay: [2000, 8000],
  bot(ctx, d, seatId) {
    const t = teamOf(ctx, seatId);
    const res = d.results[t] ?? [];
    if (d.stage === 'ping') return { type: 'ping', x: ctx.rng.int(10, 90), y: ctx.rng.int(10, 90) };
    // Guess: the point that best fits the pings (a coarse search), plus a little error.
    let best = { x: 50, y: 50 };
    let bestErr = Infinity;
    for (let x = 0; x <= MAP; x += 4)
      for (let y = 0; y <= MAP; y += 4) {
        const err = res.reduce((s, r) => s + Math.abs(dist({ x, y }, r) - r.dist), 0);
        if (err < bestErr) {
          bestErr = err;
          best = { x, y };
        }
      }
    return { type: 'guess', x: best.x + ctx.rng.int(-6, 6), y: best.y + ctx.rng.int(-6, 6) };
  },
  hostView: (ctx, d) => ({
    stage: d.stage,
    ping: d.ping,
    pings: d.pings,
    closesAt: d.closesAt,
    tolerance: d.tolerance,
    pinged: d.results.map((r) => r.length),
    submitted: Object.keys(d.guesses),
    // Everything shows at the reveal: the beacon, every ping, every team's guess.
    target: ctx.phase.stage === 'reveal' ? d.target : null,
    results: ctx.phase.stage === 'reveal' ? d.results : null,
    guesses: ctx.phase.stage === 'reveal' ? (ctx.phase.teams ?? []).map((team) => teamGuess(team, d.guesses)) : null,
  }),
  playerView: (ctx, d, seatId) => {
    const t = teamOf(ctx, seatId);
    const team = ctx.phase.teams?.[t] ?? [];
    return {
      stage: d.stage,
      ping: d.ping,
      pings: d.pings,
      closesAt: d.closesAt,
      tolerance: d.tolerance,
      team: t,
      myTurn: d.stage === 'ping' && pinger(team, d.ping) === seatId && (d.results[t]?.length ?? 0) <= d.ping,
      pingerId: d.stage === 'ping' ? pinger(team, d.ping) ?? null : null,
      results: d.results[t] ?? [],
      myGuess: d.guesses[seatId] ?? null,
      teamGuesses: team.map((id) => d.guesses[id]).filter(Boolean),
    };
  },
});
