import { FLIGHT_SAMPLE, GRAVITY, POWER_SCALE, flightPath, placesFromScores } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Artillery Trajectory: tanks lined up side-on. Set angle, power and direction in 15 s; every shot
 * lands at once. Wind changes each round and last round's shot paths stay visible. The Fortress
 * variant (1-vs-many) puts the small side in a fortress with a health bar against every other tank.
 */
export interface Tank {
  x: number;
  alive: boolean;
  hits: number;
}

export type Shot = import('@partygame/shared').ShotInput;

export interface ArtilleryData {
  variant: 'ffa' | 'fortress';
  width: number;
  tanks: Record<string, Tank>;
  fortress: { x: number; health: number; maxHealth: number } | null;
  crew: string[];
  wind: number;
  round: number;
  maxRounds: number;
  stage: 'aim' | 'fire';
  closesAt: number;
  shots: Record<string, Shot>;
  /** Paths of the last volley: shooter → flattened [x0, y0, x1, y1, …]. */
  paths: Record<string, number[]>;
  /** Who hit whom in the last volley (target id, or 'fortress'). */
  impacts: Record<string, string[]>;
  score: Record<string, number>;
  shownAt: number;
}

const AIM_MS = 15_000;
export const HIT_RADIUS = 48;
export const FORTRESS_RADIUS = 110;
const SAMPLE = FLIGHT_SAMPLE;

export const arenaWidth = (n: number): number => 1600 + n * 120;

function startRound(ctx: MgContext, d: ArtilleryData): void {
  d.round++;
  d.stage = 'aim';
  d.shots = {};
  d.wind = ctx.rng.int(-3, 3);
  d.closesAt = ctx.now() + AIM_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function shooters(d: ArtilleryData): string[] {
  return [...Object.entries(d.tanks).filter(([, t]) => t.alive).map(([id]) => id), ...d.crew];
}

function fire(ctx: MgContext, d: ArtilleryData): void {
  d.paths = {};
  d.impacts = {};
  for (const id of shooters(d)) {
    const shot = d.shots[id];
    if (!shot) continue;
    const from = d.crew.includes(id) ? d.fortress!.x : d.tanks[id]!.x;
    const path = flightPath(from, shot, d.wind);
    d.paths[id] = path;
    const landX = path[path.length - 2]!;
    const hits: string[] = [];
    if (d.fortress && !d.crew.includes(id) && Math.abs(landX - d.fortress.x) < FORTRESS_RADIUS) {
      d.fortress.health = Math.max(0, d.fortress.health - 1);
      hits.push('fortress');
    }
    for (const [tid, t] of Object.entries(d.tanks)) {
      if (!t.alive || Math.abs(landX - t.x) >= HIT_RADIUS) continue;
      if (tid === id) {
        d.score[id] = (d.score[id] ?? 0) - 2;
      } else {
        d.score[id] = (d.score[id] ?? 0) + 2;
        d.score[tid] = (d.score[tid] ?? 0) - 1;
      }
      t.hits++;
      // In the fortress game a hit tank is knocked out.
      if (d.variant === 'fortress' && d.crew.includes(id)) t.alive = false;
      hits.push(tid);
    }
    d.impacts[id] = hits;
  }
}

function makeArtillery(id: string, name: string, variant: 'ffa' | 'fortress') {
  return defineMinigame<ArtilleryData>({
    id,
    name,
    formats: variant === 'ffa' ? ['ffa'] : ['1vN'],
    minPlayers: variant === 'ffa' ? 2 : 3,
    inputs: [{ kind: 'aim', what: 'Angle and power' }, { kind: 'buttons', buttons: [{ id: 'left', label: 'Face left', key: 'Q' }, { id: 'right', label: 'Face right', key: 'E' }] }],
    blurb:
      variant === 'ffa'
        ? 'Set your angle, power and direction, then everyone fires at once. Mind the wind! Last round’s shots stay on screen to learn from.'
        : 'The fortress crew defends; every other tank attacks. Bring the fortress down in three volleys, or be picked off one by one.',
    setup(ctx) {
      const width = arenaWidth(ctx.n);
      const [small = [], large = []] = ctx.phase.teams ?? [];
      const drivers = variant === 'ffa' ? ctx.rng.shuffle(ctx.phase.participants) : ctx.rng.shuffle(large);
      const tanks: Record<string, Tank> = {};
      const margin = 140;
      const slots = drivers.length + (variant === 'fortress' ? 1 : 0);
      let slot = 0;
      let fortressX = 0;
      for (let i = 0; i < slots; i++) {
        const x = Math.round(margin + ((width - margin * 2) * i) / Math.max(1, slots - 1));
        if (variant === 'fortress' && i === Math.floor(slots / 2)) fortressX = x;
        else tanks[drivers[slot++]!] = { x, alive: true, hits: 0 };
      }
      const maxHealth = Math.max(2, Math.ceil(large.length * 1.2));
      const d: ArtilleryData = {
        variant,
        width,
        tanks,
        fortress: variant === 'fortress' ? { x: fortressX, health: maxHealth, maxHealth } : null,
        crew: variant === 'fortress' ? [...small] : [],
        wind: 0,
        round: 0,
        maxRounds: 3,
        stage: 'aim',
        closesAt: 0,
        shots: {},
        paths: {},
        impacts: {},
        score: {},
        shownAt: 0,
      };
      startRound(ctx, d);
      return d;
    },
    intent(ctx, d, seatId, intent) {
      if (intent.type !== 'aim' || d.stage !== 'aim' || !shooters(d).includes(seatId)) return;
      const angle = Math.max(5, Math.min(85, Math.round(Number(intent.angle))));
      const power = Math.max(10, Math.min(100, Math.round(Number(intent.power))));
      if (!Number.isFinite(angle) || !Number.isFinite(power)) return;
      d.shots[seatId] = { angle, power, dir: intent.dir === -1 ? -1 : 1 };
    },
    timer(ctx, d, key) {
      if (key === 'deadline' && d.stage === 'aim') {
        fire(ctx, d);
        d.stage = 'fire';
        d.shownAt = ctx.now();
        const longest = Math.max(0, ...Object.values(d.paths).map((p) => p.length / 2));
        const playMs = longest * SAMPLE * 1000 + 2500;
        const over = d.round >= d.maxRounds || (d.fortress && (d.fortress.health <= 0 || Object.values(d.tanks).every((t) => !t.alive)));
        if (over) {
          if (d.variant === 'fortress') ctx.finish({ kind: '1vN', smallWins: d.fortress!.health > 0 }, playMs + 2000);
          else ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((id) => [id, d.score[id] ?? 0])), 'high') }, playMs + 2000);
          return;
        }
        ctx.phase.endsAt = ctx.now() + playMs;
        ctx.setTimer('next', ctx.now() + playMs);
      } else if (key === 'next' || (key === 'deadline' && d.stage === 'fire')) startRound(ctx, d);
    },
    awaiting: (_ctx, d, seatId) => d.stage === 'aim' && shooters(d).includes(seatId) && !(seatId in d.shots),
    botDelay: [2000, 10_000],
    bot(ctx, d, seatId) {
      const from = d.crew.includes(seatId) ? d.fortress!.x : d.tanks[seatId]!.x;
      const targets = d.crew.includes(seatId)
        ? Object.values(d.tanks).filter((t) => t.alive).map((t) => t.x)
        : d.fortress
          ? [d.fortress.x]
          : Object.entries(d.tanks).filter(([id, t]) => id !== seatId && t.alive).map(([, t]) => t.x);
      const target = targets.length ? ctx.rng.pick(targets) : from + 400;
      const dir = target >= from ? 1 : -1;
      // Rough ballistic guess for a 45° shot, then some human error.
      const dist = Math.abs(target - from);
      const power = Math.sqrt(dist * GRAVITY) / POWER_SCALE;
      return { type: 'aim', angle: 45 + ctx.rng.int(-6, 6), power: Math.round(Math.min(100, Math.max(10, power + ctx.rng.int(-8, 8)))), dir };
    },
    hostView: (_ctx, d) => ({
      variant: d.variant,
      width: d.width,
      tanks: d.tanks,
      fortress: d.fortress,
      crew: d.crew,
      wind: d.wind,
      round: d.round,
      maxRounds: d.maxRounds,
      stage: d.stage,
      closesAt: d.closesAt,
      submitted: Object.keys(d.shots),
      paths: d.paths,
      impacts: d.stage === 'fire' ? d.impacts : {},
      score: d.score,
      shownAt: d.shownAt,
      sampleMs: SAMPLE * 1000,
    }),
    playerView: (_ctx, d, seatId) => ({
      variant: d.variant,
      width: d.width,
      tanks: d.stage === 'aim' ? d.tanks : {},
      fortress: d.fortress,
      role: d.crew.includes(seatId) ? 'crew' : d.tanks[seatId]?.alive ? 'tank' : 'out',
      myX: d.crew.includes(seatId) ? d.fortress!.x : d.tanks[seatId]?.x ?? 0,
      wind: d.wind,
      round: d.round,
      maxRounds: d.maxRounds,
      stage: d.stage,
      closesAt: d.closesAt,
      myShot: d.shots[seatId] ?? null,
      // Your own previous shot, to learn from.
      lastPath: d.stage === 'aim' ? d.paths[seatId] ?? null : null,
      shownAt: d.shownAt,
    }),
  });
}

export const artillery = makeArtillery('artillery', 'Artillery Trajectory', 'ffa');
export const artilleryFortress = makeArtillery('artillery-fortress', 'Artillery: Fortress', 'fortress');
