import type { CoopGrade } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Runaway Switchboard (co-op): payloads roll down a branching track to a numbered exit. Each
 * junction belongs to a player (several each in small rooms); flip yours so every payload reaches
 * its destination. At 10+ players two payloads run at once.
 */
export const DEPTH = 3;
/** Junction ids 0..6 in a binary tree: children of j are 2j+1 and 2j+2; exits are 0..7. */
export const JUNCTIONS = 2 ** DEPTH - 1;
export const EXITS = 2 ** DEPTH;

export interface Payload {
  id: number;
  dest: number;
  /** Junction index while travelling, or null once it reached an exit. */
  at: number | null;
  exit: number | null;
  startAt: number;
}

export interface SwitchData {
  switches: (0 | 1)[];
  owners: string[];
  payloads: Payload[];
  total: number;
  delivered: number;
  missed: number;
  stepMs: number;
  closesAt: number;
}

const STEP_MS = 1800;

/** Next position after a junction given its switch (0 = left, 1 = right). */
export function nextNode(j: number, sw: 0 | 1): { junction: number | null; exit: number | null } {
  const child = 2 * j + 1 + sw;
  if (child < JUNCTIONS) return { junction: child, exit: null };
  return { junction: null, exit: child - JUNCTIONS };
}

/** The switch settings a payload needs to reach an exit, from the root. */
export function routeTo(exit: number): { junction: number; sw: 0 | 1 }[] {
  const out: { junction: number; sw: 0 | 1 }[] = [];
  let node = exit + JUNCTIONS;
  while (node > 0) {
    const parent = Math.floor((node - 1) / 2);
    out.unshift({ junction: parent, sw: (node - (2 * parent + 1)) as 0 | 1 });
    node = parent;
  }
  return out;
}

export function switchGrade(delivered: number, total: number): CoopGrade {
  const r = delivered / Math.max(1, total);
  return r >= 0.99 ? 'gold' : r >= 0.66 ? 'silver' : r >= 0.33 ? 'bronze' : 'fail';
}

function launch(ctx: MgContext, id: number, at: number): Payload {
  return { id, dest: ctx.rng.int(0, EXITS - 1), at: null, exit: null, startAt: at };
}

export const runawaySwitchboard = defineMinigame<SwitchData>({
  id: 'runaway-switchboard',
  name: 'Runaway Switchboard',
  formats: ['coop'],
  inputs: [{ kind: 'pick', what: 'Flip your junctions' }],
  blurb: 'Payloads roll down the tracks. Each of you controls some junctions: flip them so every payload reaches its numbered exit.',
  setup(ctx) {
    const ids = ctx.rng.shuffle(ctx.phase.participants);
    const owners = Array.from({ length: JUNCTIONS }, (_, j) => ids[j % ids.length]!);
    const twoAtOnce = ctx.n >= 10;
    const total = twoAtOnce ? 6 : 4;
    const first = ctx.now() + 4000;
    const payloads: Payload[] = [];
    const d: SwitchData = { switches: Array.from({ length: JUNCTIONS }, () => (ctx.rng.chance(0.5) ? 1 : 0)), owners, payloads, total, delivered: 0, missed: 0, stepMs: STEP_MS, closesAt: 0 };
    for (let i = 0; i < total; i++) {
      // Singles every 6 steps; at 10+ players, pairs two steps apart.
      const at = twoAtOnce ? first + Math.floor(i / 2) * STEP_MS * 6 + (i % 2) * STEP_MS * 2 : first + i * STEP_MS * 5;
      payloads.push(launch(ctx, i, at));
    }
    d.closesAt = Math.max(...payloads.map((p) => p.startAt)) + STEP_MS * (DEPTH + 2);
    ctx.phase.endsAt = d.closesAt;
    ctx.setTimer('step', first);
    ctx.setTimer('deadline', d.closesAt + 500);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'flip') return;
    const j = Number(intent.junction);
    if (!Number.isInteger(j) || d.owners[j] !== seatId) return;
    d.switches[j] = d.switches[j] === 1 ? 0 : 1;
  },
  timer(ctx, d, key) {
    if (key === 'step') {
      const now = ctx.now();
      for (const p of d.payloads) {
        if (p.exit !== null || now < p.startAt) continue;
        if (p.at === null) {
          p.at = 0;
          continue;
        }
        const next = nextNode(p.at, d.switches[p.at]!);
        p.at = next.junction;
        if (next.exit !== null) {
          p.exit = next.exit;
          if (p.exit === p.dest) d.delivered++;
          else d.missed++;
        }
      }
      if (d.payloads.every((p) => p.exit !== null)) return ctx.setTimer('deadline', ctx.now() + 800);
      ctx.setTimer('step', ctx.now() + STEP_MS);
    } else if (key === 'deadline') ctx.finish({ kind: 'coop', grade: switchGrade(d.delivered, d.total) }, 4000);
  },
  awaiting: (_ctx, d, seatId) => d.owners.includes(seatId) && d.payloads.some((p) => p.exit === null),
  botDelay: [700, 1600],
  bot(ctx, d, seatId) {
    // Bots set their junctions for the next payload that will reach them, mostly correctly.
    const live = d.payloads.filter((p) => p.exit === null).sort((a, b) => a.startAt - b.startAt);
    for (const p of live) {
      for (const step of routeTo(p.dest)) {
        if (d.owners[step.junction] !== seatId) continue;
        const reached = p.at !== null && step.junction < p.at;
        if (!reached && d.switches[step.junction] !== step.sw && ctx.rng.chance(0.8)) return { type: 'flip', junction: step.junction };
      }
    }
    return null;
  },
  hostView: (_ctx, d) => ({ switches: d.switches, owners: d.owners, payloads: d.payloads, total: d.total, delivered: d.delivered, missed: d.missed, stepMs: d.stepMs, closesAt: d.closesAt }),
  playerView: (_ctx, d, seatId) => ({ switches: d.switches, owners: d.owners, mine: d.owners.map((o, j) => (o === seatId ? j : -1)).filter((j) => j >= 0), payloads: d.payloads, total: d.total, delivered: d.delivered, missed: d.missed, stepMs: d.stepMs, closesAt: d.closesAt }),
});
