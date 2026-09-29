import { placesFromScores } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';

/**
 * Stopwatch Chicken: a clock runs on each controller for 3 s, then blanks. Stop it as close to
 * the target as you can, over or under: the closest stop wins. Timing is measured on the controller from the
 * frame that started the clock, so stream delay is irrelevant.
 */
export interface StopwatchData {
  target: number;
  startAt: number;
  visibleMs: number;
  closesAt: number;
  stops: Record<string, number>;
}

export const VISIBLE_MS = 3000;
const LATE_MS = 3000;

export function stopwatchScore(target: number, elapsed: number | undefined): number {
  if (elapsed === undefined) return 1e9;
  // Closest wins, early or late alike.
  return Math.abs(elapsed - target);
}

export const stopwatchChicken = defineMinigame<StopwatchData>({
  id: 'stopwatch-chicken',
  name: 'Stopwatch Chicken',
  formats: ['ffa', 'duel'],
  inputs: [{ kind: 'timing', what: 'Stop the clock' }],
  blurb: 'The clock shows for 3 seconds, then goes dark. Keep counting in your head and stop it as close to the target as you can. Early or late, the closest stop wins.',
  setup(ctx) {
    const target = ctx.rng.int(45, 90) * 100;
    const startAt = ctx.now() + 3500;
    const closesAt = startAt + target + LATE_MS;
    ctx.setTimer('deadline', closesAt + 400);
    ctx.phase.endsAt = closesAt;
    return { target, startAt, visibleMs: VISIBLE_MS, closesAt, stops: {} };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'stop' || seatId in d.stops) return;
    const ms = Number(intent.elapsedMs);
    if (!Number.isFinite(ms) || ms < 0 || ms > d.target + LATE_MS) return;
    // Can't stop before the clock started on the server's timeline (plus sync slack).
    if (ctx.now() < d.startAt + ms - 1500) return;
    d.stops[seatId] = Math.round(ms);
    if (ctx.phase.participants.every((id) => id in d.stops)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    const scores = Object.fromEntries(ctx.phase.participants.map((id) => [id, stopwatchScore(d.target, d.stops[id])]));
    ctx.finish({ kind: 'ffa', places: placesFromScores(scores, 'low') }, 6500);
  },
  awaiting: (_ctx, d, seatId) => !(seatId in d.stops),
  // Bots "stop" around when a person would, so the host's submitted ticks look natural.
  botDelay: (ctx, d) => {
    const at = d.startAt + d.target - ctx.now();
    return [at - 1200, at];
  },
  bot(ctx, d) {
    // A human-ish miss: usually within a second, early or late.
    const off = (ctx.rng.next() + ctx.rng.next() - 1) * 1400;
    return { type: 'stop', elapsedMs: Math.max(0, Math.round(d.target + off)) };
  },
  hostView: (ctx, d) => ({
    target: d.target,
    startAt: d.startAt,
    visibleMs: d.visibleMs,
    closesAt: d.closesAt,
    submitted: Object.keys(d.stops),
    stops: ctx.phase.stage === 'reveal' ? d.stops : null,
  }),
  playerView: (_ctx, d, seatId) => ({ target: d.target, startAt: d.startAt, visibleMs: d.visibleMs, closesAt: d.closesAt, myStop: d.stops[seatId] ?? null }),
});
