import { placesFromScores } from '@partygame/shared';
import { defineMinigame, type MgContext } from '../minigame.ts';

/**
 * Raft Gamble: the raft picks up treasure at every island. At each island, bank what you carry
 * and step off, or stay for more. After everyone decides, the hazard rolls: if the raft sinks,
 * everyone still aboard loses what they carry. Players who banked make side bets on the next leg.
 * Decisions happen in separate steps, so lag can't matter.
 */
export interface RaftData {
  island: number;
  maxIslands: number;
  stage: 'decide' | 'show';
  closesAt: number;
  aboard: string[];
  carry: Record<string, number>;
  banked: Record<string, number>;
  decisions: Record<string, 'bank' | 'stay'>;
  sideBets: Record<string, 'safe' | 'sink'>;
  sideWins: Record<string, number>;
  /** Result of the last hazard roll. */
  sank: boolean;
  chance: number;
  shownAt: number;
}

const DECIDE_MS = 10_000;
const SHOW_MS = 4500;
export const SIDE_BET_WIN = 3;

export const islandReward = (island: number): number => 2 + island * 2;
export const hazardChance = (island: number): number => Math.min(0.75, 0.12 * island);

function arrive(ctx: MgContext, d: RaftData): void {
  d.island++;
  for (const id of d.aboard) d.carry[id] = (d.carry[id] ?? 0) + islandReward(d.island);
  d.stage = 'decide';
  d.decisions = {};
  d.sideBets = {};
  d.chance = hazardChance(d.island);
  d.closesAt = ctx.now() + DECIDE_MS;
  ctx.phase.endsAt = d.closesAt;
  ctx.setTimer('deadline', d.closesAt + 400);
  ctx.room.scheduleBots();
}

function finish(ctx: MgContext, d: RaftData): void {
  // Anyone still aboard at the last island banks automatically.
  for (const id of d.aboard) d.banked[id] = (d.banked[id] ?? 0) + (d.carry[id] ?? 0);
  d.aboard = [];
  const scores = Object.fromEntries(ctx.phase.participants.map((id) => [id, (d.banked[id] ?? 0) + (d.sideWins[id] ?? 0)]));
  ctx.finish({ kind: 'ffa', places: placesFromScores(scores, 'high') }, SHOW_MS + 1500);
}

function resolve(ctx: MgContext, d: RaftData): void {
  for (const id of d.aboard) {
    if ((d.decisions[id] ?? 'stay') === 'bank') {
      d.banked[id] = (d.banked[id] ?? 0) + (d.carry[id] ?? 0);
      d.carry[id] = 0;
    }
  }
  d.aboard = d.aboard.filter((id) => d.decisions[id] !== 'bank');
  d.sank = d.aboard.length > 0 && ctx.rng.chance(d.chance);
  for (const [id, bet] of Object.entries(d.sideBets)) if ((bet === 'sink') === d.sank) d.sideWins[id] = (d.sideWins[id] ?? 0) + SIDE_BET_WIN;
  if (d.sank) for (const id of d.aboard) d.carry[id] = 0;
  d.stage = 'show';
  d.shownAt = ctx.now();
  if (d.sank) d.aboard = [];
  if (d.aboard.length === 0 || d.island >= d.maxIslands) return finish(ctx, d);
  ctx.phase.endsAt = ctx.now() + SHOW_MS;
  ctx.setTimer('next', ctx.now() + SHOW_MS);
}

export const raftGamble = defineMinigame<RaftData>({
  id: 'raft-gamble',
  name: 'Raft Gamble',
  formats: ['ffa'],
  inputs: [{ kind: 'pick', what: 'Bank or stay' }],
  blurb: 'Every island adds treasure to the raft. Bank yours and step off, or stay for more. If the raft sinks, everyone aboard loses what they carry. Banked players bet on the next leg.',
  setup(ctx) {
    const d: RaftData = { island: 0, maxIslands: 6, stage: 'decide', closesAt: 0, aboard: [...ctx.phase.participants], carry: {}, banked: {}, decisions: {}, sideBets: {}, sideWins: {}, sank: false, chance: 0, shownAt: 0 };
    arrive(ctx, d);
    return d;
  },
  intent(ctx, d, seatId, intent) {
    if (d.stage !== 'decide') return;
    if (intent.type === 'raft' && d.aboard.includes(seatId) && (intent.choice === 'bank' || intent.choice === 'stay')) d.decisions[seatId] = intent.choice;
    else if (intent.type === 'sideBet' && !d.aboard.includes(seatId) && (intent.bet === 'safe' || intent.bet === 'sink')) d.sideBets[seatId] = intent.bet;
    else return;
    if (d.aboard.every((id) => id in d.decisions)) ctx.hurry('deadline', 800);
  },
  timer(ctx, d, key) {
    if (key === 'deadline' && d.stage === 'decide') resolve(ctx, d);
    else if (key === 'next' || (key === 'deadline' && d.stage === 'show')) arrive(ctx, d);
  },
  awaiting: (_ctx, d, seatId) => d.stage === 'decide' && (d.aboard.includes(seatId) ? !(seatId in d.decisions) : !(seatId in d.sideBets)),
  botDelay: [1000, 6000],
  bot(ctx, d, seatId) {
    if (!d.aboard.includes(seatId)) return { type: 'sideBet', bet: ctx.rng.chance(d.chance) ? 'sink' : 'safe' };
    // Greedier early, cautious as the danger grows.
    return { type: 'raft', choice: ctx.rng.chance(d.chance + 0.1) ? 'bank' : 'stay' };
  },
  hostView: (_ctx, d) => ({
    island: d.island,
    maxIslands: d.maxIslands,
    stage: d.stage,
    closesAt: d.closesAt,
    aboard: d.aboard,
    carry: d.carry,
    banked: d.banked,
    chance: d.chance,
    sank: d.stage === 'show' ? d.sank : null,
    submitted: [...Object.keys(d.decisions), ...Object.keys(d.sideBets)],
    // Who banked is revealed with the roll, not before.
    decisions: d.stage === 'show' ? d.decisions : null,
    shownAt: d.shownAt,
    reward: islandReward(d.island + 1),
  }),
  playerView: (_ctx, d, seatId) => ({
    island: d.island,
    maxIslands: d.maxIslands,
    stage: d.stage,
    closesAt: d.closesAt,
    aboard: d.aboard.includes(seatId),
    carry: d.carry[seatId] ?? 0,
    banked: d.banked[seatId] ?? 0,
    sideWins: d.sideWins[seatId] ?? 0,
    chance: d.chance,
    myChoice: d.decisions[seatId] ?? null,
    myBet: d.sideBets[seatId] ?? null,
    shownAt: d.shownAt,
    sank: d.stage === 'show' ? d.sank : null,
  }),
});
