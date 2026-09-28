import { cleanAnswer, groupAnswers, placesFromScores, type AnswerGroup } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';
import { gamePlayerFor } from '../state.ts';
import { HERD_PROMPTS, UNIQUE_CATEGORIES } from '../packs.ts';

/**
 * Herd Mentality: answer with what you think most people will say; the biggest group scores.
 * Absorbs Category Word Chain as the unique-answers round, where only answers nobody else gave
 * score. Answers are grouped by fuzzy matching, and the room can vote to merge groups it missed.
 */
export interface HerdData {
  round: number;
  rounds: number;
  mode: 'herd' | 'unique';
  prompt: string;
  stage: 'answer' | 'review' | 'show';
  closesAt: number;
  answers: Record<string, string>;
  groups: AnswerGroup[];
  /** Merge proposals by player: fold group `from` into group `to` (by label). */
  merges: Record<string, { from: string; to: string }>;
  points: Record<string, number>;
  roundPoints: Record<string, number>;
  used: string[];
  shownAt: number;
}

const ANSWER_MS = 25_000;
const REVIEW_MS = 12_000;
const SHOW_MS = 5500;

/** How many players must agree before a merge happens. */
export const mergeQuorum = (n: number): number => Math.max(2, Math.ceil(n / 3));

export function applyMerges(groups: AnswerGroup[], merges: Record<string, { from: string; to: string }>, n: number): AnswerGroup[] {
  const counts = new Map<string, number>();
  for (const m of Object.values(merges)) counts.set(`${m.from}\u0000${m.to}`, (counts.get(`${m.from}\u0000${m.to}`) ?? 0) + 1);
  let out = groups;
  for (const [key, c] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    if (c < mergeQuorum(n)) continue;
    const [from, to] = key.split('\u0000') as [string, string];
    const fi = out.findIndex((g) => g.label === from);
    const ti = out.findIndex((g) => g.label === to);
    if (fi < 0 || ti < 0 || fi === ti) continue;
    out = out.map((g, i) => (i === ti ? { label: g.label, ids: [...g.ids, ...out[fi]!.ids] } : g)).filter((_, i) => i !== fi);
  }
  return out.sort((a, b) => b.ids.length - a.ids.length);
}

/** Herd: the single biggest group scores 1 each (a tie for biggest scores nobody). Unique: lone answers score. */
export function scoreHerd(groups: AnswerGroup[], mode: 'herd' | 'unique'): Record<string, number> {
  const out: Record<string, number> = {};
  if (mode === 'unique') {
    for (const g of groups) if (g.ids.length === 1) out[g.ids[0]!] = 1;
    return out;
  }
  const top = groups[0];
  if (!top || top.ids.length < 2 || groups[1]?.ids.length === top.ids.length) return out;
  for (const id of top.ids) out[id] = 1;
  return out;
}

function startRound(ctx: MgContext, d: HerdData): void {
  d.round++;
  d.mode = d.round === d.rounds ? 'unique' : 'herd';
  const pool = (d.mode === 'herd' ? HERD_PROMPTS : UNIQUE_CATEGORIES).filter((p) => !d.used.includes(p));
  d.prompt = ctx.rng.pick(pool);
  d.used.push(d.prompt);
  d.stage = 'answer';
  d.answers = {};
  d.groups = [];
  d.merges = {};
  d.roundPoints = {};
  d.closesAt = ctx.now() + ANSWER_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

const BOT_WORDS = ['Blue', 'Pizza', 'Dog', 'Apple', 'Football', 'Summer', 'Chocolate', 'Cat', 'Red', 'Banana', 'Car', 'Tea'];

export const herdMentality = defineMinigame<HerdData>({
  id: 'herd-mentality',
  name: 'Herd Mentality',
  formats: ['ffa'],
  inputs: [{ kind: 'text', what: 'Answer' }, { kind: 'vote', what: 'Merge answers that mean the same' }],
  blurb: 'Write what you think most people will say: the biggest group scores. In the last round it flips: only answers nobody else gave score!',
  minPlayers: 3,
  setup(ctx) {
    const d: HerdData = { round: 0, rounds: 3, mode: 'herd', prompt: '', stage: 'answer', closesAt: 0, answers: {}, groups: [], merges: {}, points: {}, roundPoints: {}, used: [], shownAt: 0 };
    startRound(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type === 'answer' && d.stage === 'answer') {
      const text = cleanAnswer(intent.text);
      if (!text) return;
      d.answers[seatId] = text;
      if (ctx.phase.participants.every((id) => id in d.answers)) ctx.hurry('deadline', 1000);
    } else if (intent.type === 'merge' && d.stage === 'review') {
      const from = String(intent.from ?? '');
      const to = String(intent.to ?? '');
      if (from === to || !d.groups.some((g) => g.label === from) || !d.groups.some((g) => g.label === to)) delete d.merges[seatId];
      else d.merges[seatId] = { from, to };
    }
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'answer') {
      d.groups = groupAnswers(d.answers);
      d.stage = 'review';
      d.closesAt = ctx.now() + REVIEW_MS;
      ctx.phase.endsAt = d.closesAt;
      ctx.setTimer('deadline', d.closesAt);
    } else if (key === 'deadline' && d.stage === 'review') {
      d.groups = applyMerges(d.groups, d.merges, ctx.n);
      d.roundPoints = scoreHerd(d.groups, d.mode);
      for (const [id, p] of Object.entries(d.roundPoints)) {
        d.points[id] = (d.points[id] ?? 0) + p;
        const gp = gamePlayerFor(ctx.room, id);
        if (gp && d.mode === 'herd') gp.stats.crowdScore += p;
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
  awaiting: (_ctx, d, seatId) => d.stage === 'answer' && !(seatId in d.answers),
  // Bots answer late, often copying what the herd already said.
  botDelay: [9000, 20_000],
  bot(ctx, d) {
    const seen = Object.values(d.answers);
    if (d.mode === 'herd' && seen.length && ctx.rng.chance(0.6)) return { type: 'answer', text: ctx.rng.pick(seen) };
    return { type: 'answer', text: `${ctx.rng.pick(BOT_WORDS)}${d.mode === 'unique' ? ` ${ctx.rng.int(1, 99)}` : ''}` };
  },
  hostView: (_ctx, d) => ({
    round: d.round,
    rounds: d.rounds,
    mode: d.mode,
    prompt: d.prompt,
    stage: d.stage,
    closesAt: d.closesAt,
    submitted: Object.keys(d.answers),
    groups: d.stage === 'answer' ? [] : d.groups,
    mergeVotes: Object.values(d.merges).length,
    roundPoints: d.stage === 'show' ? d.roundPoints : {},
    points: d.points,
    shownAt: d.shownAt,
  }),
  playerView: (_ctx, d, seatId) => ({
    round: d.round,
    rounds: d.rounds,
    mode: d.mode,
    prompt: d.prompt,
    stage: d.stage,
    closesAt: d.closesAt,
    myAnswer: d.answers[seatId] ?? null,
    groups: d.stage === 'review' ? d.groups.map((g) => ({ label: g.label, size: g.ids.length, mine: g.ids.includes(seatId) })) : [],
    myMerge: d.merges[seatId] ?? null,
    gained: d.stage === 'show' ? d.roundPoints[seatId] ?? 0 : null,
    points: d.points[seatId] ?? 0,
    shownAt: d.shownAt,
  }),
});
