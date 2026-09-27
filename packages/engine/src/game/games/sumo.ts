import { placesFromScores } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Sumo Programming: everyone secretly commits a direction and force, then all pucks move at once.
 * Simulated once on the server (fixed step, seeded) and played back everywhere, so every screen
 * sees the same result. Fall off the platform and you're out. Up to 3 rounds.
 */
export interface Puck {
  x: number;
  y: number;
  alive: boolean;
}

export interface SumoMove {
  angle: number;
  force: number;
}

export interface SumoData {
  radius: number;
  pucks: Record<string, Puck>;
  round: number;
  maxRounds: number;
  stage: 'aim' | 'play';
  closesAt: number;
  moves: Record<string, SumoMove>;
  /** Last simulation, sampled at 20 fps: per frame, [id, x, y, alive]. */
  frames: [string, number, number, 0 | 1][][];
  outRound: Record<string, number>;
  shownAt: number;
}

export const PUCK_R = 34;
const AIM_MS = 15_000;
const FRAME_MS = 50;
const STEPS_PER_FRAME = 6;
const FRICTION = 260;
const SPEED_PER_FORCE = 120;

export const sumoRadius = (n: number): number => 280 + n * 18;

/**
 * Deterministic simulation: equal-mass elastic collisions, linear friction, and a fall when a puck's
 * centre leaves the platform. Returns sampled frames; mutates pucks to their final state.
 */
export function simulateSumo(pucks: Record<string, Puck>, moves: Record<string, SumoMove>, radius: number): SumoData['frames'] {
  const ids = Object.keys(pucks).sort();
  const vel = new Map<string, { x: number; y: number }>();
  for (const id of ids) {
    const m = moves[id];
    const p = pucks[id]!;
    if (!p.alive || !m) vel.set(id, { x: 0, y: 0 });
    else {
      const a = (m.angle * Math.PI) / 180;
      vel.set(id, { x: Math.cos(a) * m.force * SPEED_PER_FORCE, y: Math.sin(a) * m.force * SPEED_PER_FORCE });
    }
  }
  const frames: SumoData['frames'] = [];
  const dt = FRAME_MS / 1000 / STEPS_PER_FRAME;
  const snap = () => frames.push(ids.map((id) => [id, Math.round(pucks[id]!.x), Math.round(pucks[id]!.y), pucks[id]!.alive ? 1 : 0]));
  snap();
  for (let frame = 0; frame < 100; frame++) {
    for (let s = 0; s < STEPS_PER_FRAME; s++) {
      for (const id of ids) {
        const p = pucks[id]!;
        const v = vel.get(id)!;
        if (!p.alive) continue;
        p.x += v.x * dt;
        p.y += v.y * dt;
        const speed = Math.hypot(v.x, v.y);
        const slow = Math.max(0, speed - FRICTION * dt);
        if (speed > 0) {
          v.x = (v.x / speed) * slow;
          v.y = (v.y / speed) * slow;
        }
      }
      // Collisions between live pucks.
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const a = pucks[ids[i]!]!;
          const b = pucks[ids[j]!]!;
          if (!a.alive || !b.alive) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist >= PUCK_R * 2) continue;
          const nx = dx / dist;
          const ny = dy / dist;
          const va = vel.get(ids[i]!)!;
          const vb = vel.get(ids[j]!)!;
          const rel = (va.x - vb.x) * nx + (va.y - vb.y) * ny;
          if (rel > 0) {
            // Equal masses: exchange the normal components (a little extra bounce for drama).
            const k = rel * 1.05;
            va.x -= k * nx;
            va.y -= k * ny;
            vb.x += k * nx;
            vb.y += k * ny;
          }
          const push = (PUCK_R * 2 - dist) / 2;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      for (const id of ids) {
        const p = pucks[id]!;
        if (p.alive && Math.hypot(p.x, p.y) > radius) p.alive = false;
      }
    }
    snap();
    const moving = ids.some((id) => pucks[id]!.alive && Math.hypot(vel.get(id)!.x, vel.get(id)!.y) > 4);
    if (!moving) break;
  }
  return frames;
}

function startRound(ctx: MgContext, d: SumoData): void {
  d.round++;
  d.stage = 'aim';
  d.moves = {};
  d.closesAt = ctx.now() + AIM_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function finishSumo(ctx: MgContext, d: SumoData, revealMs: number): void {
  const scores = Object.fromEntries(ctx.phase.participants.map((id) => [id, d.pucks[id]!.alive ? 100 : d.outRound[id] ?? 0]));
  ctx.finish({ kind: 'ffa', places: placesFromScores(scores, 'high') }, revealMs);
}

export const sumoProgramming = defineMinigame<SumoData>({
  id: 'sumo-programming',
  name: 'Sumo Programming',
  formats: ['ffa'],
  inputs: [{ kind: 'aim', what: 'Set direction and force' }],
  blurb: 'Pick a direction and a force in secret. Then everyone moves at once. Knock rivals off the platform, and stay on yourself!',
  setup(ctx) {
    const radius = sumoRadius(ctx.n);
    const ids = ctx.rng.shuffle(ctx.phase.participants);
    const pucks: Record<string, Puck> = {};
    ids.forEach((id, i) => {
      const a = (i / ids.length) * Math.PI * 2;
      pucks[id] = { x: Math.round(Math.cos(a) * radius * 0.6), y: Math.round(Math.sin(a) * radius * 0.6), alive: true };
    });
    const d: SumoData = { radius, pucks, round: 0, maxRounds: 3, stage: 'aim', closesAt: 0, moves: {}, frames: [], outRound: {}, shownAt: 0 };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'move' || d.stage !== 'aim' || !d.pucks[seatId]?.alive) return;
    const angle = Math.round(Number(intent.angle));
    const force = Math.round(Number(intent.force));
    if (!Number.isFinite(angle) || force < 1 || force > 5) return;
    d.moves[seatId] = { angle: ((angle % 360) + 360) % 360, force };
    if (ctx.phase.participants.every((id) => !d.pucks[id]!.alive || id in d.moves)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'aim') {
      d.frames = simulateSumo(d.pucks, d.moves, d.radius);
      for (const id of ctx.phase.participants) if (!d.pucks[id]!.alive && !(id in d.outRound)) d.outRound[id] = d.round;
      d.stage = 'play';
      d.shownAt = ctx.now();
      const playMs = d.frames.length * FRAME_MS + 1500;
      const alive = ctx.phase.participants.filter((id) => d.pucks[id]!.alive).length;
      if (alive <= 1 || d.round >= d.maxRounds) return finishSumo(ctx, d, playMs + 2500);
      ctx.phase.endsAt = ctx.now() + playMs;
      ctx.setTimer('next', ctx.now() + playMs);
    } else if (key === 'next' || (key === 'deadline' && d.stage === 'play')) startRound(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'aim' && !!d.pucks[seatId]?.alive && !(seatId in d.moves),
  botDelay: [2000, 9000],
  bot(ctx, d, seatId) {
    const me = d.pucks[seatId]!;
    const rivals = Object.entries(d.pucks).filter(([id, p]) => id !== seatId && p.alive);
    // Charge the nearest rival, or retreat towards the middle when near the edge.
    if (Math.hypot(me.x, me.y) > d.radius * 0.75 || rivals.length === 0) {
      return { type: 'move', angle: Math.round((Math.atan2(-me.y, -me.x) * 180) / Math.PI), force: ctx.rng.int(2, 3) };
    }
    const [, t] = rivals.sort(([, a], [, b]) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y))[0]!;
    const angle = (Math.atan2(t.y - me.y, t.x - me.x) * 180) / Math.PI + ctx.rng.int(-15, 15);
    return { type: 'move', angle: Math.round(angle), force: ctx.rng.int(3, 5) };
  },
  hostView: (_ctx, d) => ({ radius: d.radius, pucks: d.pucks, round: d.round, maxRounds: d.maxRounds, stage: d.stage, closesAt: d.closesAt, submitted: Object.keys(d.moves), frames: d.stage === 'play' ? d.frames : [], shownAt: d.shownAt, frameMs: FRAME_MS, puckR: PUCK_R }),
  playerView: (_ctx, d, seatId) => ({
    radius: d.radius,
    pucks: d.stage === 'aim' ? d.pucks : {},
    round: d.round,
    maxRounds: d.maxRounds,
    stage: d.stage,
    closesAt: d.closesAt,
    alive: d.pucks[seatId]?.alive ?? false,
    myMove: d.moves[seatId] ?? null,
    shownAt: d.shownAt,
    playMs: d.frames.length * FRAME_MS,
    puckR: PUCK_R,
  }),
});
