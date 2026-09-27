import { cleanAnswer, placesFromScores } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';
import { WHO_WROTE_PROMPTS } from '../packs.ts';

/**
 * Who Wrote That?: everyone answers a prompt, then a random 6 to 8 of the answers are shown
 * anonymously and everyone guesses who wrote each. +1 per correct guess; writers earn +1 for
 * each person they fool.
 */
export interface WhoData {
  prompt: string;
  stage: 'write' | 'match' | 'show';
  closesAt: number;
  answers: Record<string, string>;
  /** Writers of the cards shown, in card order. Kept server-side; cards are anonymous. */
  cards: string[];
  /** guesser → card index → guessed writer. */
  guesses: Record<string, Record<number, string>>;
  points: Record<string, number>;
}

const WRITE_MS = 40_000;
const MATCH_MS = 50_000;

export function scoreWho(cards: string[], guesses: WhoData['guesses']): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [guesser, g] of Object.entries(guesses))
    for (const [i, guess] of Object.entries(g)) {
      const writer = cards[Number(i)];
      if (!writer || writer === guesser) continue;
      if (guess === writer) out[guesser] = (out[guesser] ?? 0) + 1;
      else out[writer] = (out[writer] ?? 0) + 1;
    }
  return out;
}

const BOT_LINES = ['Something about cheese', 'Absolutely not', 'A tiny hat', 'Dancing badly', 'Seventeen ducks', 'My nan', 'The moon, obviously', 'Soup'];

export const whoWroteThat = defineMinigame<WhoData>({
  id: 'who-wrote-that',
  name: 'Who Wrote That?',
  formats: ['ffa'],
  minPlayers: 3,
  inputs: [{ kind: 'text', what: 'Write an answer' }, { kind: 'pick', what: 'Guess who wrote each answer' }],
  blurb: 'Answer the prompt. Then guess who wrote each anonymous answer. You score for right guesses, and for every friend you fool.',
  setup(ctx) {
    const closesAt = ctx.now() + WRITE_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 400);
    return { prompt: ctx.rng.pick(WHO_WROTE_PROMPTS), stage: 'write', closesAt, answers: {}, cards: [], guesses: {}, points: {} };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type === 'write' && d.stage === 'write') {
      const text = cleanAnswer(intent.text);
      if (!text) return;
      d.answers[seatId] = text;
      if (ctx.phase.participants.every((id) => id in d.answers)) ctx.hurry('deadline', 1000);
    } else if (intent.type === 'guess' && d.stage === 'match') {
      const i = Number(intent.card);
      const who = String(intent.writer ?? '');
      if (!Number.isInteger(i) || !d.cards[i] || d.cards[i] === seatId || who === seatId || !ctx.phase.participants.includes(who)) return;
      (d.guesses[seatId] ??= {})[i] = who;
      const needed = (id: string) => d.cards.filter((w) => w !== id).length;
      if (ctx.phase.participants.every((id) => Object.keys(d.guesses[id] ?? {}).length >= needed(id))) ctx.hurry('deadline', 1200);
    }
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    if (d.stage === 'write') {
      const writers = Object.keys(d.answers);
      d.cards = ctx.rng.shuffle(writers).slice(0, Math.min(writers.length, ctx.rng.int(6, 8)));
      d.stage = 'match';
      d.closesAt = ctx.now() + MATCH_MS;
      ctx.phase.endsAt = d.closesAt;
      ctx.setTimer('deadline', d.closesAt + 400);
      ctx.room.scheduleBots();
      if (d.cards.length === 0) ctx.setTimer('deadline', ctx.now());
    } else if (d.stage === 'match') {
      d.points = scoreWho(d.cards, d.guesses);
      d.stage = 'show';
      ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((id) => [id, d.points[id] ?? 0])), 'high') }, 3000 + d.cards.length * 1400);
    }
  },
  awaiting: (_ctx, d, seatId) => (d.stage === 'write' ? !(seatId in d.answers) : d.stage === 'match' && Object.keys(d.guesses[seatId] ?? {}).length < d.cards.filter((w) => w !== seatId).length),
  botDelay: [3000, 12_000],
  bot(ctx, d, seatId) {
    if (d.stage === 'write') return { type: 'write', text: ctx.rng.pick(BOT_LINES) };
    const open = d.cards.map((w, i) => [w, i] as const).filter(([w, i]) => w !== seatId && !(i in (d.guesses[seatId] ?? {})));
    if (!open.length) return null;
    const [, i] = ctx.rng.pick(open);
    return { type: 'guess', card: i, writer: ctx.rng.pick(ctx.phase.participants.filter((id) => id !== seatId)) };
  },
  hostView: (ctx, d) => ({
    prompt: d.prompt,
    stage: d.stage,
    closesAt: d.closesAt,
    submitted: d.stage === 'write' ? Object.keys(d.answers) : Object.keys(d.guesses),
    cards: d.stage === 'write' ? [] : d.cards.map((w) => d.answers[w]!),
    writers: ctx.phase.stage === 'reveal' ? d.cards : null,
    // Per card: who guessed right, once revealed.
    correct: ctx.phase.stage === 'reveal' ? d.cards.map((w, i) => Object.entries(d.guesses).filter(([, g]) => g[i] === w).map(([id]) => id)) : null,
  }),
  playerView: (_ctx, d, seatId) => ({
    prompt: d.prompt,
    stage: d.stage,
    closesAt: d.closesAt,
    myAnswer: d.answers[seatId] ?? null,
    // Your own card is left out so you can't guess yourself.
    cards: d.stage === 'match' ? d.cards.map((w, i) => ({ i, text: d.answers[w]!, mine: w === seatId })).filter((c) => !c.mine).map(({ i, text }) => ({ i, text })) : [],
    myGuesses: d.guesses[seatId] ?? {},
  }),
});
