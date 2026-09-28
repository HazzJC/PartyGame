import { placesFromScores } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';
import { gamePlayerFor } from '../state.ts';
import { PREDICT_QUESTIONS } from '../packs.ts';

/**
 * Predict the Crowd: answer a four-option question, and rank the four options by how you think
 * the room voted (ranking, not percentages). Score for each option you put in the right place.
 */
export interface PredictData {
  round: number;
  rounds: number;
  q: string;
  options: string[];
  stage: 'answer' | 'show';
  closesAt: number;
  choices: Record<string, number>;
  ranks: Record<string, number[]>;
  counts: number[];
  roundPoints: Record<string, number>;
  points: Record<string, number>;
  used: string[];
  shownAt: number;
}

const ANSWER_MS = 25_000;
const SHOW_MS = 6500;

/** Actual rank position (0 = most votes) for each option, ties sharing the better place. */
export function actualRanks(counts: number[]): number[] {
  return counts.map((c) => counts.filter((x) => x > c).length);
}

/** +1 per option placed at its actual rank (any rank within a tie counts), +1 more for the top pick. */
export function scorePrediction(order: number[], counts: number[]): number {
  const ranks = actualRanks(counts);
  let score = 0;
  order.forEach((option, pos) => {
    const r = ranks[option]!;
    const tiedSize = counts.filter((x) => x === counts[option]).length;
    if (pos >= r && pos < r + tiedSize) score++;
  });
  if (order[0] !== undefined && ranks[order[0]] === 0) score++;
  return score;
}

function startRound(ctx: MgContext, d: PredictData): void {
  d.round++;
  const pool = PREDICT_QUESTIONS.filter((x) => !d.used.includes(x.q));
  const pick = ctx.rng.pick(pool);
  d.used.push(pick.q);
  d.q = pick.q;
  d.options = [...pick.options];
  d.stage = 'answer';
  d.choices = {};
  d.ranks = {};
  d.roundPoints = {};
  d.closesAt = ctx.now() + ANSWER_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

export const predictTheCrowd = defineMinigame<PredictData>({
  id: 'predict-the-crowd',
  name: 'Predict the Crowd',
  formats: ['ffa'],
  minPlayers: 3,
  inputs: [{ kind: 'pick', what: 'Your answer' }, { kind: 'rank', what: 'Rank how the room voted' }],
  blurb: 'Pick your own answer, then rank all four by how you think everyone voted. Score for each one you put in the right place.',
  setup(ctx) {
    const d: PredictData = { round: 0, rounds: 3, q: '', options: [], stage: 'answer', closesAt: 0, choices: {}, ranks: {}, counts: [0, 0, 0, 0], roundPoints: {}, points: {}, used: [], shownAt: 0 };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (d.stage !== 'answer') return;
    if (intent.type === 'choose') {
      const c = Number(intent.option);
      if (Number.isInteger(c) && c >= 0 && c < 4) d.choices[seatId] = c;
    } else if (intent.type === 'rank' && Array.isArray(intent.order)) {
      const order = intent.order.map(Number);
      if (order.length === 4 && new Set(order).size === 4 && order.every((x) => x >= 0 && x < 4)) d.ranks[seatId] = order;
    } else return;
    if (ctx.phase.participants.every((id) => id in d.choices && id in d.ranks)) ctx.hurry('deadline', 1000);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'answer') {
      d.counts = [0, 1, 2, 3].map((o) => Object.values(d.choices).filter((c) => c === o).length);
      for (const id of ctx.phase.participants) {
        const order = d.ranks[id];
        const p = order ? scorePrediction(order, d.counts) : 0;
        d.roundPoints[id] = p;
        d.points[id] = (d.points[id] ?? 0) + p;
        const gp = gamePlayerFor(ctx.room, id);
        if (gp) gp.stats.crowdScore += p;
      }
      d.stage = 'show';
      d.shownAt = ctx.now();
      if (d.round >= d.rounds) {
        ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((id) => [id, d.points[id] ?? 0])), 'high') }, SHOW_MS + 1500);
        return;
      }
      ctx.phase.endsAt = ctx.now() + SHOW_MS;
      ctx.setTimer('next', ctx.now() + SHOW_MS);
    } else if (key === 'next' || (key === 'deadline' && d.stage === 'show')) startRound(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'answer' && (!(seatId in d.choices) || !(seatId in d.ranks)),
  botDelay: [2000, 10_000],
  bot(ctx, d, seatId) {
    if (!(seatId in d.choices)) return { type: 'choose', option: Math.min(ctx.rng.int(0, 3), ctx.rng.int(0, 3)) };
    return { type: 'rank', order: ctx.rng.shuffle([0, 1, 2, 3]) };
  },
  hostView: (_ctx, d) => ({
    round: d.round,
    rounds: d.rounds,
    q: d.q,
    options: d.options,
    stage: d.stage,
    closesAt: d.closesAt,
    submitted: Object.keys(d.ranks).filter((id) => id in d.choices),
    counts: d.stage === 'show' ? d.counts : null,
    roundPoints: d.stage === 'show' ? d.roundPoints : {},
    shownAt: d.shownAt,
  }),
  playerView: (_ctx, d, seatId) => ({
    round: d.round,
    rounds: d.rounds,
    q: d.q,
    options: d.options,
    stage: d.stage,
    closesAt: d.closesAt,
    myChoice: d.choices[seatId] ?? null,
    myRank: d.ranks[seatId] ?? null,
    gained: d.stage === 'show' ? d.roundPoints[seatId] ?? 0 : null,
    points: d.points[seatId] ?? 0,
    shownAt: d.shownAt,
  }),
});
