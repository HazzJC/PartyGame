import { placesFromScores } from '@partygame/shared';
import { judgeReaction, type ReactionResult } from '../../timing.ts';
import { makeCues, type Cue } from '../../toys/reaction.ts';
import { defineMinigame } from '../minigame.ts';

/**
 * Quick Draw: hold your holster, and let go on "FIRE!". Fake-out cues make deciding count for
 * more than raw speed (the doc's parity rule). Cues are drawn on each controller at a server
 * time and the reaction is measured there.
 */
export interface QuickDrawData {
  cues: Cue[];
  closesAt: number;
  results: Record<string, ReactionResult>;
}

const WINDOW_MS = 2000;

export function quickDrawScore(r: ReactionResult | undefined): number {
  if (!r || 'missed' in r) return 2e6;
  if ('falseStart' in r) return 1e6;
  return r.ms;
}

export const quickDraw = defineMinigame<QuickDrawData>({
  id: 'quick-draw',
  name: 'Quick Draw',
  formats: ['ffa', 'duel'],
  inputs: [{ kind: 'timing', what: 'Draw', release: true }],
  blurb: 'Hold your holster. Let go the instant it says FIRE! Let go on a fake and you shoot your own foot.',
  setup(ctx) {
    const cues = makeCues(ctx.room, ctx.now() + 2000);
    const go = cues.find((c) => c.real)!.at;
    const closesAt = go + WINDOW_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 400);
    return { cues, closesAt, results: {} };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type !== 'react' || seatId in d.results) return;
    d.results[seatId] = judgeReaction(intent as { ms?: unknown; falseStart?: unknown }, WINDOW_MS);
    if (ctx.phase.participants.every((id) => id in d.results)) ctx.setTimer('deadline', ctx.now() + 600);
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    const scores = Object.fromEntries(ctx.phase.participants.map((id) => [id, quickDrawScore(d.results[id])]));
    ctx.finish({ kind: 'ffa', places: placesFromScores(scores, 'low') }, 5000);
  },
  awaiting: (_ctx, d, seatId) => !(seatId in d.results),
  botDelay: (ctx, d) => {
    const go = d.cues.find((c) => c.real)!.at - ctx.now();
    return [go + 250, go + 500];
  },
  bot: (ctx) => (ctx.rng.chance(0.06) ? { type: 'react', falseStart: true } : { type: 'react', ms: ctx.rng.int(220, 480) }),
  hostView: (ctx, d) => ({ cues: d.cues, closesAt: d.closesAt, submitted: Object.keys(d.results), results: ctx.phase.stage === 'reveal' ? d.results : null }),
  playerView: (_ctx, d, seatId) => ({ cues: d.cues, closesAt: d.closesAt, mine: d.results[seatId] ?? null }),
});
