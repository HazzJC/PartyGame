import { cleanAnswer, imposters as imposterCount, placesFromScores } from '@partygame/shared';
import { defineMinigame } from '../minigame.ts';
import { ODD_PAIRS } from '../packs.ts';

/**
 * Odd One Out: everyone gets a secret word on their phone, except the imposter(s), who get a
 * similar one — and don't know they're the odd one out. Everyone gives a one-word clue, then
 * votes. Catch the imposter to score; an imposter who slips through scores big.
 */
export interface OddData {
  pair: [string, string];
  imposters: string[];
  stage: 'clue' | 'vote' | 'show';
  closesAt: number;
  clues: Record<string, string>;
  votes: Record<string, string>;
  accused: string[];
  points: Record<string, number>;
}

const CLUE_MS = 35_000;
const VOTE_MS = 25_000;
const REVEAL_MS = 7000;

/** Most-voted players are accused (a tie accuses all of them). */
export function accusedFrom(votes: Record<string, string>): string[] {
  const counts = new Map<string, number>();
  for (const t of Object.values(votes)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const max = Math.max(0, ...counts.values());
  return max === 0 ? [] : [...counts.entries()].filter(([, c]) => c === max).map(([id]) => id);
}

export function scoreOdd(participants: string[], imposters: string[], votes: Record<string, string>, accused: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of participants) {
    if (imposters.includes(id)) out[id] = accused.includes(id) ? 0 : 4;
    else out[id] = imposters.includes(votes[id] ?? '') ? 2 : 0;
  }
  return out;
}

const BOT_CLUES = ['Big', 'Fun', 'Old', 'Loud', 'Tasty', 'Useful', 'Wet', 'Fast', 'Soft', 'Bright', 'Busy', 'Tall'];

export const oddOneOut = defineMinigame<OddData>({
  id: 'odd-one-out',
  name: 'Odd One Out',
  formats: ['ffa'],
  minPlayers: 4,
  inputs: [{ kind: 'text', what: 'Clue' }, { kind: 'vote', what: 'Vote for the odd one out' }],
  blurb: 'Everyone gets a secret word, but someone has a slightly different one and doesn’t know it. Give a one-word clue, then vote for who you think is the odd one out.',
  setup(ctx) {
    const pair = ctx.rng.pick(ODD_PAIRS);
    const imposters = ctx.rng.shuffle(ctx.phase.participants).slice(0, imposterCount(ctx.n));
    const closesAt = ctx.now() + CLUE_MS;
    ctx.phase.endsAt = closesAt;
    ctx.setTimer('deadline', closesAt + 400);
    return { pair, imposters, stage: 'clue', closesAt, clues: {}, votes: {}, accused: [], points: {} };
  },
  intent(ctx, d, seatId, intent) {
    if (intent.type === 'clue' && d.stage === 'clue') {
      const text = cleanAnswer(intent.text).split(' ').slice(0, 3).join(' ');
      if (!text) return;
      d.clues[seatId] = text;
      if (ctx.phase.participants.every((id) => id in d.clues)) ctx.hurry('deadline', 1000);
    } else if (intent.type === 'vote' && d.stage === 'vote') {
      const target = String(intent.target ?? '');
      if (target === seatId || !ctx.phase.participants.includes(target)) return;
      d.votes[seatId] = target;
      if (ctx.phase.participants.every((id) => id in d.votes)) ctx.hurry('deadline', 1000);
    }
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    if (d.stage === 'clue') {
      for (const id of ctx.phase.participants) d.clues[id] ??= '…';
      d.stage = 'vote';
      d.closesAt = ctx.now() + VOTE_MS;
      ctx.phase.endsAt = d.closesAt;
      ctx.setTimer('deadline', d.closesAt + 400);
      ctx.room.scheduleBots();
    } else if (d.stage === 'vote') {
      d.accused = accusedFrom(d.votes);
      d.points = scoreOdd(ctx.phase.participants, d.imposters, d.votes, d.accused);
      d.stage = 'show';
      ctx.finish({ kind: 'ffa', places: placesFromScores(Object.fromEntries(ctx.phase.participants.map((id) => [id, d.points[id] ?? 0])), 'high') }, REVEAL_MS);
    }
  },
  awaiting: (_ctx, d, seatId) => (d.stage === 'clue' ? !(seatId in d.clues) : d.stage === 'vote' && !(seatId in d.votes)),
  botDelay: [4000, 15_000],
  bot(ctx, d, seatId) {
    if (d.stage === 'clue') return { type: 'clue', text: ctx.rng.pick(BOT_CLUES) };
    return { type: 'vote', target: ctx.rng.pick(ctx.phase.participants.filter((id) => id !== seatId)) };
  },
  hostView: (ctx, d) => ({
    stage: d.stage,
    closesAt: d.closesAt,
    submitted: d.stage === 'clue' ? Object.keys(d.clues) : Object.keys(d.votes),
    // Clues become public at the vote; words and imposters only at the reveal.
    clues: d.stage === 'clue' ? {} : d.clues,
    votes: ctx.phase.stage === 'reveal' ? d.votes : null,
    imposters: ctx.phase.stage === 'reveal' ? d.imposters : null,
    words: ctx.phase.stage === 'reveal' ? d.pair : null,
    accused: ctx.phase.stage === 'reveal' ? d.accused : [],
  }),
  playerView: (_ctx, d, seatId) => ({
    stage: d.stage,
    closesAt: d.closesAt,
    word: d.imposters.includes(seatId) ? d.pair[1] : d.pair[0],
    myClue: d.clues[seatId] ?? null,
    myVote: d.votes[seatId] ?? null,
    clues: d.stage === 'vote' ? d.clues : {},
  }),
});
