import { HEIST_DIRS, heistBlocked, placesFromScores, previewRoute, type HeistStep } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Planned Movement Heist: program 5 steps, then every route plays out at once on a floor plan.
 * Grab gems; bump into another thief and you both stop; step into a guard and you drop what you
 * grabbed this round. In the 1-vs-many Guard variant, the small side programs the guards.
 */
export type Step = HeistStep;
export const STEPS = 5;

export interface HeistActor {
  x: number;
  y: number;
}

export interface HeistData {
  variant: 'ffa' | 'guard';
  size: number;
  walls: number[];
  gems: Record<number, number>;
  thieves: Record<string, HeistActor>;
  /** Guards keyed by controller id ('npc0'… for computer guards). */
  guards: Record<string, HeistActor & { route: Step[] }>;
  round: number;
  maxRounds: number;
  stage: 'plan' | 'play';
  closesAt: number;
  programs: Record<string, Step[]>;
  /** Positions after each step of the last playback: step → id → [x, y]. */
  frames: Record<string, [number, number]>[];
  events: { step: number; id: string; kind: 'gem' | 'bump' | 'caught'; value?: number }[];
  score: Record<string, number>;
  caught: string[];
  shownAt: number;
}

const PLAN_MS = 25_000;
export const STEP_PLAY_MS = 650;
const DIRS = HEIST_DIRS;

export const heistSize = (n: number): number => (n <= 8 ? 7 : 9);

const cell = (size: number, x: number, y: number) => y * size + x;

function blocked(d: Pick<HeistData, 'size' | 'walls'>, x: number, y: number): boolean {
  return heistBlocked(d.size, d.walls, x, y);
}

export { previewRoute };

/** Plays every programme at once, step by step. Thieves who want the same cell both stay put. */
export function playHeist(d: HeistData): void {
  d.frames = [];
  d.events = [];
  const snap = () => d.frames.push(Object.fromEntries([...Object.entries(d.thieves), ...Object.entries(d.guards)].map(([id, a]) => [id, [a.x, a.y] as [number, number]])));
  snap();
  const roundGems: Record<string, number> = {};
  const frozen = new Set<string>(d.caught);
  for (let step = 0; step < STEPS; step++) {
    // Guards move first along their routes.
    for (const g of Object.values(d.guards)) {
      const [dx, dy] = DIRS[g.route[step] ?? 'W'];
      if (!blocked(d, g.x + dx, g.y + dy)) {
        g.x += dx;
        g.y += dy;
      }
    }
    const wants = new Map<string, [number, number]>();
    for (const [id, t] of Object.entries(d.thieves)) {
      if (frozen.has(id)) {
        wants.set(id, [t.x, t.y]);
        continue;
      }
      const [dx, dy] = DIRS[d.programs[id]?.[step] ?? 'W'];
      wants.set(id, blocked(d, t.x + dx, t.y + dy) ? [t.x, t.y] : [t.x + dx, t.y + dy]);
    }
    // Bumps: two thieves heading for the same cell both stay.
    const byCell = new Map<string, string[]>();
    for (const [id, [x, y]] of wants) byCell.set(`${x},${y}`, [...(byCell.get(`${x},${y}`) ?? []), id]);
    for (const ids of byCell.values()) {
      if (ids.length < 2) continue;
      for (const id of ids) {
        const t = d.thieves[id]!;
        wants.set(id, [t.x, t.y]);
        if (!frozen.has(id)) d.events.push({ step, id, kind: 'bump' });
      }
    }
    for (const [id, [x, y]] of wants) {
      const t = d.thieves[id]!;
      t.x = x;
      t.y = y;
    }
    for (const [id, t] of Object.entries(d.thieves)) {
      if (frozen.has(id)) continue;
      if (Object.values(d.guards).some((g) => g.x === t.x && g.y === t.y)) {
        frozen.add(id);
        d.caught.push(id);
        d.events.push({ step, id, kind: 'caught', value: roundGems[id] ?? 0 });
        d.score[id] = (d.score[id] ?? 0) - (roundGems[id] ?? 0);
        continue;
      }
      const c = cell(d.size, t.x, t.y);
      const gem = d.gems[c];
      if (gem && Object.entries(d.thieves).filter(([, o]) => o.x === t.x && o.y === t.y).length === 1) {
        delete d.gems[c];
        roundGems[id] = (roundGems[id] ?? 0) + gem;
        d.score[id] = (d.score[id] ?? 0) + gem;
        d.events.push({ step, id, kind: 'gem', value: gem });
      }
    }
    snap();
  }
}

function scatterGems(ctx: MgContext, d: HeistData, count: number): void {
  const taken = new Set([...d.walls, ...Object.values(d.thieves).map((t) => cell(d.size, t.x, t.y)), ...Object.keys(d.gems).map(Number)]);
  const free = ctx.rng.shuffle(Array.from({ length: d.size * d.size }, (_, i) => i).filter((i) => !taken.has(i)));
  for (let i = 0; i < count && i < free.length; i++) d.gems[free[i]!] = ctx.rng.int(1, 3);
}

function startRound(ctx: MgContext, d: HeistData): void {
  d.round++;
  d.stage = 'plan';
  d.programs = {};
  // Free-for-all: caught thieves are back next round (they already dropped their gems).
  // The Guard variant keeps them out, since catching half of them is the guards' goal.
  if (d.variant === 'ffa') d.caught = [];
  scatterGems(ctx, d, Math.max(4, Object.keys(d.thieves).length + 2) - Object.keys(d.gems).length);
  if (d.variant === 'ffa') for (const g of Object.values(d.guards)) g.route = patrol(ctx);
  d.closesAt = ctx.now() + PLAN_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function patrol(ctx: MgContext): Step[] {
  const axis = ctx.rng.chance(0.5) ? (['L', 'R'] as Step[]) : (['U', 'D'] as Step[]);
  const first = ctx.rng.pick(axis);
  const back = first === axis[0] ? axis[1]! : axis[0]!;
  return [first, first, 'W', back, back];
}

function controllers(d: HeistData): string[] {
  return d.variant === 'guard' ? [...Object.keys(d.thieves), ...Object.keys(d.guards)] : Object.keys(d.thieves);
}

function makeHeist(id: string, name: string, variant: 'ffa' | 'guard') {
  return defineMinigame<HeistData>({
    id,
    name,
    formats: variant === 'ffa' ? ['ffa'] : ['1vN'],
    minPlayers: variant === 'ffa' ? 2 : 3,
    inputs: [{ kind: 'sequence', steps: STEPS, what: variant === 'ffa' ? 'Plan 5 moves' : 'Plan 5 moves (thief or guard)' }],
    blurb:
      variant === 'ffa'
        ? 'Plan five moves in secret, then everyone moves at once. Grab gems, avoid the guards, and don’t walk into another thief: you’ll both stop dead.'
        : 'The guards plan their patrols in secret; the thieves plan their routes. Catch half the thieves in two rounds and the guards win.',
    setup(ctx) {
      const size = heistSize(ctx.n);
      const [small = [], large = []] = ctx.phase.teams ?? [];
      const thiefIds = variant === 'ffa' ? ctx.phase.participants : large;
      // Start positions around the edge.
      const edge: [number, number][] = [];
      for (let i = 0; i < size; i++) edge.push([i, 0], [size - 1, i], [size - 1 - i, size - 1], [0, size - 1 - i]);
      const starts = ctx.rng.shuffle([...new Map(edge.map((p) => [`${p[0]},${p[1]}`, p])).values()]);
      const thieves: Record<string, HeistActor> = {};
      thiefIds.forEach((tid, i) => {
        const [x, y] = starts[i % starts.length]!;
        thieves[tid] = { x, y };
      });
      // A few interior walls, never on the edge ring.
      const walls: number[] = [];
      const inner = ctx.rng.shuffle(Array.from({ length: (size - 2) * (size - 2) }, (_, i) => cell(size, 1 + (i % (size - 2)), 1 + Math.floor(i / (size - 2)))));
      for (let i = 0; i < Math.round(size * size * 0.08); i++) walls.push(inner[i]!);
      const free = inner.slice(walls.length);
      const guards: HeistData['guards'] = {};
      const guardIds = variant === 'guard' ? small : Array.from({ length: Math.max(1, Math.floor(ctx.n / 4)) }, (_, i) => `npc${i}`);
      guardIds.forEach((gid, i) => {
        const c = free[i * 3]!;
        guards[gid] = { x: c % size, y: Math.floor(c / size), route: ['W', 'W', 'W', 'W', 'W'] };
      });
      const d: HeistData = { variant, size, walls, gems: {}, thieves, guards, round: 0, maxRounds: 2, stage: 'plan', closesAt: 0, programs: {}, frames: [], events: [], score: {}, caught: [], shownAt: 0 };
      startRound(ctx, d);
      return d;
    },
    intent(ctx, d, seatId, intent) {
      if (intent.type !== 'program' || d.stage !== 'plan' || !controllers(d).includes(seatId) || d.caught.includes(seatId)) return;
      if (!Array.isArray(intent.steps)) return;
      const steps = intent.steps.filter((s): s is Step => typeof s === 'string' && s in DIRS).slice(0, STEPS);
      while (steps.length < STEPS) steps.push('W');
      if (seatId in d.guards) d.guards[seatId]!.route = steps;
      else d.programs[seatId] = steps;
    },
    timer(ctx, d, key) {
      if (key === 'deadline' && d.stage === 'plan') {
        playHeist(d);
        d.stage = 'play';
        d.shownAt = ctx.now();
        const playMs = (STEPS + 1) * STEP_PLAY_MS + 1500;
        const thieves = Object.keys(d.thieves);
        const over = d.round >= d.maxRounds || thieves.every((t) => d.caught.includes(t));
        if (over) {
          if (d.variant === 'guard') ctx.finish({ kind: '1vN', smallWins: d.caught.length * 2 >= thieves.length }, playMs + 2000);
          else ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((pid) => [pid, d.score[pid] ?? 0])), 'high') }, playMs + 2000);
          return;
        }
        ctx.phase.endsAt = ctx.now() + playMs;
        ctx.setTimer('next', ctx.now() + playMs);
      } else if (key === 'next' || (key === 'deadline' && d.stage === 'play')) startRound(ctx, d);
    },
    awaiting: (_ctx, d, seatId) => d.stage === 'plan' && controllers(d).includes(seatId) && !d.caught.includes(seatId) && !(seatId in d.programs) && !(seatId in d.guards && d.guards[seatId]!.route.some((s) => s !== 'W')),
    botDelay: [3000, 14_000],
    bot(ctx, d, seatId) {
      // Head for the nearest gem (guards: the nearest thief), then a random wiggle.
      const me = d.thieves[seatId] ?? d.guards[seatId]!;
      const targets = seatId in d.guards ? Object.values(d.thieves) : Object.keys(d.gems).map((c) => ({ x: Number(c) % d.size, y: Math.floor(Number(c) / d.size) }));
      const steps: Step[] = [];
      let { x, y } = me;
      const t = targets.sort((a, b) => Math.abs(a.x - x) + Math.abs(a.y - y) - (Math.abs(b.x - x) + Math.abs(b.y - y)))[0];
      for (let i = 0; i < STEPS; i++) {
        let s: Step = ctx.rng.pick(['U', 'D', 'L', 'R'] as Step[]);
        if (t && ctx.rng.chance(0.8)) s = t.x > x ? 'R' : t.x < x ? 'L' : t.y > y ? 'D' : t.y < y ? 'U' : 'W';
        const [dx, dy] = DIRS[s];
        if (!blocked(d, x + dx, y + dy)) {
          x += dx;
          y += dy;
        }
        steps.push(s);
      }
      return { type: 'program', steps };
    },
    hostView: (_ctx, d) => ({
      variant: d.variant,
      size: d.size,
      walls: d.walls,
      gems: d.gems,
      thieves: d.thieves,
      guards: Object.fromEntries(Object.entries(d.guards).map(([gid, g]) => [gid, { x: g.x, y: g.y }])),
      round: d.round,
      maxRounds: d.maxRounds,
      stage: d.stage,
      closesAt: d.closesAt,
      submitted: [...Object.keys(d.programs), ...Object.entries(d.guards).filter(([, g]) => g.route.some((s) => s !== 'W')).map(([gid]) => gid)],
      frames: d.stage === 'play' ? d.frames : [],
      events: d.stage === 'play' ? d.events : [],
      score: d.score,
      caught: d.caught,
      shownAt: d.shownAt,
      stepMs: STEP_PLAY_MS,
    }),
    playerView: (_ctx, d, seatId) => ({
      variant: d.variant,
      size: d.size,
      walls: d.walls,
      gems: d.stage === 'plan' ? d.gems : {},
      me: d.stage === 'plan' ? d.thieves[seatId] ?? d.guards[seatId] ?? null : null,
      role: seatId in d.guards ? 'guard' : d.caught.includes(seatId) ? 'caught' : 'thief',
      guards: d.stage === 'plan' && d.variant === 'ffa' ? Object.values(d.guards).map((g) => ({ x: g.x, y: g.y, route: g.route })) : [],
      round: d.round,
      maxRounds: d.maxRounds,
      stage: d.stage,
      closesAt: d.closesAt,
      myProgram: d.programs[seatId] ?? (seatId in d.guards && d.guards[seatId]!.route.some((s) => s !== 'W') ? d.guards[seatId]!.route : null),
      myScore: d.score[seatId] ?? 0,
      shownAt: d.shownAt,
      playMs: (STEPS + 1) * STEP_PLAY_MS,
    }),
  });
}

export const heist = makeHeist('heist', 'Planned Movement Heist', 'ffa');
export const heistGuard = makeHeist('heist-guard', 'Heist: Guard', 'guard');
