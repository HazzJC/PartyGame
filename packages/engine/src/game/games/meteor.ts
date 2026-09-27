import { meteorArc, type CoopGrade } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';

/**
 * Meteor Shield Array (co-op, real-time): the only fully real-time game. Each player turns a
 * shield arc around the planet (arc width = 360°/N × 0.8). Meteors fall slowly; when one reaches
 * the shield, the server decides whether any arc covers it, with a generous margin.
 */
export interface Meteor {
  id: number;
  angle: number;
  /** Distance from the centre, 1 = spawn edge, SHIELD_R = shield line. */
  r: number;
  speed: number;
  state: 'falling' | 'blocked' | 'hit';
  at: number;
}

export interface MeteorData {
  angles: Record<string, number>;
  arc: number;
  meteors: Meteor[];
  nextId: number;
  startAt: number;
  closesAt: number;
  hits: number;
  blocked: number;
  lastTickAt: number;
  spawnEvery: number;
  nextSpawnAt: number;
}

export const SHIELD_R = 0.42;
const TIME_MS = 40_000;
const MARGIN = (8 * Math.PI) / 180;

const angDiff = (a: number, b: number) => {
  const d = Math.abs(((a - b) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return Math.min(d, Math.PI * 2 - d);
};

export function covered(angles: Record<string, number>, arc: number, meteorAngle: number): boolean {
  return Object.values(angles).some((a) => angDiff(a, meteorAngle) <= arc / 2 + MARGIN);
}

export function meteorGrade(hits: number): CoopGrade {
  return hits <= 1 ? 'gold' : hits <= 3 ? 'silver' : hits <= 5 ? 'bronze' : 'fail';
}

export const meteorShield = defineMinigame<MeteorData>({
  id: 'meteor-shield',
  name: 'Meteor Shield Array',
  formats: ['coop'],
  inputs: [{ kind: 'rotate', what: 'Turn your shield' }],
  blurb: 'Meteors are falling on your planet! Each of you turns one piece of the shield. Cover every meteor before it lands.',
  setup(ctx) {
    const ids = ctx.phase.participants;
    const angles = Object.fromEntries(ids.map((id, i) => [id, Math.round(((i / ids.length) * Math.PI * 2) * 1000) / 1000]));
    const startAt = ctx.now() + 3000;
    const closesAt = startAt + TIME_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 4000);
    // More players, more meteors, so everyone stays busy.
    const spawnEvery = Math.max(700, 2600 - ctx.n * 110);
    return { angles, arc: meteorArc(ctx.n), meteors: [], nextId: 0, startAt, closesAt, hits: 0, blocked: 0, lastTickAt: startAt, spawnEvery, nextSpawnAt: startAt };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'angle' || !(seatId in d.angles)) return;
    const a = Number(intent.a);
    if (Number.isFinite(a)) d.angles[seatId] = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  },
  tickHz: (ctx, d) => (ctx.now() >= d.startAt && (ctx.now() < d.closesAt || d.meteors.some((m) => m.state === 'falling')) ? 20 : 0),
  tick(ctx, d) {
    const now = ctx.now();
    const dt = Math.min(0.2, (now - d.lastTickAt) / 1000);
    d.lastTickAt = now;
    if (now < d.closesAt && now >= d.nextSpawnAt) {
      d.meteors.push({ id: d.nextId++, angle: Math.round(ctx.rng.next() * Math.PI * 2 * 1000) / 1000, r: 1, speed: 0.1 + ctx.rng.next() * 0.05, state: 'falling', at: now });
      d.nextSpawnAt = now + d.spawnEvery * (0.7 + ctx.rng.next() * 0.6);
    }
    for (const m of d.meteors) {
      if (m.state !== 'falling') continue;
      m.r = Math.round((m.r - m.speed * dt) * 1000) / 1000;
      if (m.r <= SHIELD_R) {
        // The server decides every hit.
        m.state = covered(d.angles, d.arc, m.angle) ? 'blocked' : 'hit';
        m.at = now;
        if (m.state === 'blocked') d.blocked++;
        else d.hits++;
      }
    }
    // Keep only recent history.
    d.meteors = d.meteors.filter((m) => m.state === 'falling' || now - m.at < 1200);
    if (now >= d.closesAt && d.meteors.every((m) => m.state !== 'falling')) ctx.hurry('deadline', 600);
    return undefined;
  },
  timer(ctx, d, key) {
    if (key === 'deadline') ctx.finish({ kind: 'coop', grade: meteorGrade(d.hits) }, 4000);
  },
  awaiting: (ctx, d) => ctx.now() >= d.startAt && d.meteors.some((m) => m.state === 'falling'),
  botDelay: [250, 500],
  bot(ctx, d, seatId) {
    // Bots guard the most dangerous uncovered meteor nearest to them.
    const mine = d.angles[seatId]!;
    const threats = d.meteors.filter((m) => m.state === 'falling' && !covered(Object.fromEntries(Object.entries(d.angles).filter(([id]) => id !== seatId)), d.arc, m.angle));
    if (!threats.length) return null;
    const t = threats.sort((a, b) => a.r - b.r || angDiff(a.angle, mine) - angDiff(b.angle, mine))[0]!;
    const step = Math.min(angDiff(t.angle, mine), 0.35);
    const dir = ((t.angle - mine + Math.PI * 3) % (Math.PI * 2)) - Math.PI > 0 ? 1 : -1;
    return { type: 'angle', a: mine + dir * step + (ctx.rng.next() - 0.5) * 0.05 };
  },
  hostView: (_ctx, d) => ({ angles: d.angles, arc: d.arc, meteors: d.meteors, hits: d.hits, blocked: d.blocked, startAt: d.startAt, closesAt: d.closesAt, shieldR: SHIELD_R }),
  playerView: (_ctx, d, seatId) => ({ angles: d.angles, mine: d.angles[seatId] ?? 0, arc: d.arc, meteors: d.meteors, hits: d.hits, startAt: d.startAt, closesAt: d.closesAt, shieldR: SHIELD_R }),
});
