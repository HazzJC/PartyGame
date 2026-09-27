import { countTarget, type CoopGrade } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';

/**
 * Count to N (co-op): tap to say the next number. Nobody may say two in a row, and if two people
 * speak at nearly the same moment — judged by synced timestamps, not arrival order — the count
 * resets to zero.
 */
export interface CountData {
  target: number;
  count: number;
  lastBy: string | null;
  lastAt: number;
  resets: number;
  closesAt: number;
  /** Recent calls for the host screen: who said what, and whether it clashed. */
  log: { n: number; by: string; clash?: string }[];
  clashAt: number | null;
}

export const COLLIDE_MS = 350;
export const COUNT_TIME_MS = 60_000;

export function countGrade(resets: number): CoopGrade {
  return resets <= 1 ? 'gold' : resets <= 3 ? 'silver' : 'bronze';
}

export const countTo = defineMinigame<CountData>({
  id: 'count-to',
  name: 'Count Together',
  formats: ['coop'],
  inputs: [{ kind: 'buttons', buttons: [{ id: 'say', label: 'Say the next number', key: 'Space' }] }],
  blurb: 'Count up together, one tap at a time, without talking. Nobody says two in a row. If two of you tap at once, it starts again from zero.',
  setup(ctx) {
    const closesAt = ctx.now() + COUNT_TIME_MS;
    ctx.setTimer('deadline', closesAt);
    ctx.phase.endsAt = closesAt;
    return { target: countTarget(ctx.n), count: 0, lastBy: null, lastAt: 0, resets: 0, closesAt, log: [], clashAt: null };
  },
  intent(ctx, d, seatId, intent, sentAt) {
    if (intent.type !== 'say') return;
    if (d.lastBy === seatId) return;
    const t = sentAt !== null ? Math.min(sentAt, ctx.now()) : ctx.now();
    if (d.count > 0 && d.lastBy && Math.abs(t - d.lastAt) < COLLIDE_MS) {
      // Two voices at once: back to zero.
      d.log.push({ n: d.count, by: seatId, clash: d.lastBy });
      d.count = 0;
      d.lastBy = null;
      d.lastAt = t;
      d.resets++;
      d.clashAt = ctx.now();
    } else {
      d.count++;
      d.lastBy = seatId;
      d.lastAt = t;
      d.log.push({ n: d.count, by: seatId });
    }
    d.log = d.log.slice(-8);
    if (d.count >= d.target) ctx.finish({ kind: 'coop', grade: countGrade(d.resets) }, 4000);
  },
  timer(ctx, _d, key) {
    if (key === 'deadline') ctx.finish({ kind: 'coop', grade: 'fail' }, 3500);
  },
  awaiting: () => true,
  botDelay: [900, 4200],
  bot(ctx, d, seatId) {
    if (d.lastBy === seatId) return null;
    // Fewer bots speak up in a big room, so they don't clash every time.
    return ctx.rng.chance(Math.min(0.6, 2.5 / ctx.n)) ? { type: 'say' } : null;
  },
  hostView: (_ctx, d) => ({ target: d.target, count: d.count, resets: d.resets, closesAt: d.closesAt, log: d.log, lastBy: d.lastBy, clashAt: d.clashAt }),
  playerView: (_ctx, d, seatId) => ({ target: d.target, count: d.count, resets: d.resets, closesAt: d.closesAt, mineLast: d.lastBy === seatId, clashAt: d.clashAt }),
});
