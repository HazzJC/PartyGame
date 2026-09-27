import { defineMinigame } from '../minigame.ts';
import { teamOf, teamPlaces } from './teams.ts';

/**
 * Synchronised Pulse (team): a beat flashes on every phone at scheduled server times. Tap on the
 * beat. The first beats are a tap-along calibration that measures each device's own lag; after
 * that, each tap's error (corrected by the calibration) is sent. The team with the tightest
 * per-player average timing pulls the marker their way.
 */
export interface PulseData {
  startAt: number;
  period: number;
  practice: number;
  beats: number;
  closesAt: number;
  /** Per player: absolute timing error (ms) for each scored beat. */
  errors: Record<string, Record<number, number>>;
}

export const PULSE_PERIOD = 650;
export const PRACTICE_BEATS = 4;
export const SCORED_BEATS = 16;
/** A miss counts as this much error. */
export const MISS_MS = 300;

export function teamTiming(errors: PulseData['errors'], team: string[], scored: number): number {
  if (team.length === 0) return MISS_MS;
  const perPlayer = team.map((id) => {
    const e = errors[id] ?? {};
    let sum = 0;
    for (let k = 0; k < scored; k++) sum += Math.min(MISS_MS, e[k] ?? MISS_MS);
    return sum / scored;
  });
  return perPlayer.reduce((a, b) => a + b, 0) / perPlayer.length;
}

export const synchronisedPulse = defineMinigame<PulseData>({
  id: 'synchronised-pulse',
  name: 'Synchronised Pulse',
  formats: ['team'],
  inputs: [{ kind: 'timing', what: 'Tap on the beat' }],
  blurb: 'Tap on every flash of the beat. The first four are practice, to tune your phone. The team with the tightest timing wins.',
  setup(ctx) {
    const startAt = ctx.now() + 3000;
    const closesAt = startAt + (PRACTICE_BEATS + SCORED_BEATS) * PULSE_PERIOD + 1200;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 600);
    return { startAt, period: PULSE_PERIOD, practice: PRACTICE_BEATS, beats: SCORED_BEATS, closesAt, errors: {} };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'pulse' || teamOf(ctx, seatId) < 0) return;
    const k = Number(intent.beat);
    const err = Math.abs(Number(intent.errorMs));
    if (!Number.isInteger(k) || k < 0 || k >= d.beats || !Number.isFinite(err)) return;
    (d.errors[seatId] ??= {})[k] = Math.min(MISS_MS, Math.round(err));
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    const teams = ctx.phase.teams ?? [];
    const timing = teams.map((t) => teamTiming(d.errors, t, d.beats));
    ctx.finish({ kind: 'team', teamPlaces: teamPlaces(timing, 'low') }, 5000);
  },
  awaiting: (ctx, d, seatId) => ctx.now() >= d.startAt && Object.keys(d.errors[seatId] ?? {}).length < d.beats,
  botDelay: [PULSE_PERIOD - 60, PULSE_PERIOD + 60],
  bot(ctx, d, seatId) {
    const k = Math.floor((ctx.now() - d.startAt) / d.period) - d.practice;
    if (k < 0 || k >= d.beats || (d.errors[seatId] ?? {})[k] !== undefined) return null;
    const err = Math.abs((ctx.rng.next() + ctx.rng.next() + ctx.rng.next() - 1.5) * 90);
    return { type: 'pulse', beat: k, errorMs: Math.round(err) };
  },
  hostView: (ctx, d) => {
    const teams = ctx.phase.teams ?? [];
    // Live marker: each team's average error so far, over the beats already played.
    const played = Math.max(0, Math.min(d.beats, Math.floor((ctx.now() - d.startAt) / d.period) - d.practice));
    const timing = teams.map((t) => (played > 0 ? teamTiming(d.errors, t, played) : MISS_MS));
    return { startAt: d.startAt, period: d.period, practice: d.practice, beats: d.beats, closesAt: d.closesAt, timing };
  },
  playerView: (ctx, d, seatId) => ({ startAt: d.startAt, period: d.period, practice: d.practice, beats: d.beats, closesAt: d.closesAt, team: teamOf(ctx, seatId), scored: Object.keys(d.errors[seatId] ?? {}).length }),
});
