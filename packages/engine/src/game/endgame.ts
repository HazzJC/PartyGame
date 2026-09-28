import { ITEM_IDS, MAX_ITEMS, SESSION, STAR_PRICE, type ItemId } from '@partygame/shared';
import { definePhase, type PhaseBase } from '../phase.ts';
import type { RoomEngine } from '../room.ts';
import { board, moveStar } from '../board/state.ts';
import { flowHooks, nextRound } from './flow.ts';
import { addCoins, entityOf, game, standings, type GameState } from './state.ts';

// ------------------------------------------------------------------ final-stretch twist

export const TWISTS = {
  cheapStars: { name: 'Bargain stars', text: 'Stars cost 15 coins for the rest of the game.' },
  starMoves: { name: 'Restless star', text: 'The star moves to a new spot after every round.' },
  bottomItems: { name: 'Care package', text: 'Everyone in the bottom half gets a free item.' },
} as const;
export type TwistId = keyof typeof TWISTS;

/** Last place: fewest stars, then fewest coins; ties broken at random. */
export function lastPlace(room: RoomEngine, g: GameState): string {
  const order = standings(g);
  const last = g.players[order[order.length - 1]!]!;
  const tied = order.filter((id) => g.players[id]!.stars === last.stars && g.players[id]!.coins === last.coins);
  return room.rng.pick(tied);
}

export function giveItem(g: GameState, id: string, item: ItemId): boolean {
  const p = g.players[id];
  if (!p || p.items.length >= MAX_ITEMS) return false;
  p.items.push(item);
  return true;
}

function applyTwist(room: RoomEngine, g: GameState, twist: TwistId): void {
  g.twist = twist;
  if (twist === 'cheapStars') board(g).starPrice = STAR_PRICE - 5;
  if (twist === 'bottomItems') {
    const order = standings(g);
    for (const id of order.slice(Math.floor(order.length / 2))) giveItem(g, id, room.rng.pick(ITEM_IDS));
  }
}

export interface TwistPhase extends PhaseBase {
  kind: 'twist';
  chooser: string;
  choice: TwistId | null;
}

const TWIST_PICK_MS = 15_000;
const TWIST_SHOW_MS = 5000;

export const twistPhase = definePhase<TwistPhase>({
  kind: 'twist',
  enter(room, s) {
    s.chooser = lastPlace(room, game(room));
    s.choice = null;
    s.endsAt = room.now() + TWIST_PICK_MS;
    room.setPhaseTimer('pick', s.endsAt);
  },
  intent(room, s, seatId, intent) {
    if (intent.type !== 'twist' || s.choice) return;
    // Any member of the last-place team may choose (the timer passes the chooser id itself).
    if (seatId !== s.chooser && entityOf(game(room), seatId) !== s.chooser) return;
    const id = String(intent.twist) as TwistId;
    if (!(id in TWISTS)) return;
    s.choice = id;
    applyTwist(room, game(room), id);
    s.endsAt = room.now() + TWIST_SHOW_MS;
    room.setPhaseTimer('pick', s.endsAt);
  },
  timer(room, s, key) {
    if (key !== 'pick') return;
    if (!s.choice) {
      // Timed out: a random twist, shown briefly.
      twistPhase.intent!(room, s, s.chooser, { type: 'twist', twist: room.rng.pick(Object.keys(TWISTS)) }, null);
      return;
    }
    flowHooks.afterRoundIntro()(room);
  },
  hostAction(room, s, action) {
    if (action.action !== 'skip') return false;
    room.setPhaseTimer('pick', room.now());
    return true;
  },
  awaiting: (room, s, seatId) => entityOf(game(room), seatId) === s.chooser && !s.choice,
  bot: (room) => ({ type: 'twist', twist: room.rng.pick(Object.keys(TWISTS)) }),
  hostView: (_room, s) => ({ chooser: s.chooser, choice: s.choice, twists: TWISTS }),
  playerView: (room, s, seatId) => ({ chooser: s.chooser, choosing: entityOf(game(room), seatId) === s.chooser, choice: s.choice, twists: TWISTS }),
});

// ------------------------------------------------------------------ threat meter

export interface ThreatPhase extends PhaseBase {
  kind: 'threat';
  losses: Record<string, number>;
}

export const THREAT_LOSS = 5;

export const threatPhase = definePhase<ThreatPhase>({
  kind: 'threat',
  enter(room, s) {
    const g = game(room);
    // Failed co-op games filled the meter: a bad event hits every player, then it resets.
    s.losses = Object.fromEntries(g.order.map((id) => [id, -addCoins(g, id, -THREAT_LOSS)]));
    g.threat = 0;
    s.endsAt = room.now() + 6000;
    room.setPhaseTimer('done', s.endsAt);
  },
  timer(room, _s, key) {
    if (key === 'done') afterThreat(room);
  },
  hostAction(room, _s, action) {
    if (action.action !== 'skip') return false;
    afterThreat(room);
    return true;
  },
  hostView: (_room, s) => ({ losses: s.losses, amount: THREAT_LOSS }),
  playerView: (room, s, seatId) => ({ lost: s.losses[entityOf(game(room), seatId)] ?? 0, amount: THREAT_LOSS }),
});

function afterThreat(room: RoomEngine): void {
  const g = game(room);
  if (g.twist === 'starMoves' && g.board) {
    const b = board(g);
    for (const star of [...b.stars]) moveStar(room, b, star);
  }
  nextRound(room);
}

// ------------------------------------------------------------------ bonus stars

export const BONUS_STARS = {
  minigame: { name: 'Mini game star', text: 'Most coins won in mini games', stat: 'minigameCoins' },
  richest: { name: 'Richest', text: 'Highest coin total at any point', stat: 'maxCoins' },
  wanderer: { name: 'Wanderer', text: 'Most spaces moved', stat: 'spacesMoved' },
  teamPlayer: { name: 'Team player', text: 'Most co-op wins', stat: 'coopWins' },
  crowdReader: { name: 'Crowd reader', text: 'Best at reading the room', stat: 'crowdScore' },
  gambler: { name: 'Gambler', text: 'Most coins won from bets', stat: 'betWinnings' },
  unlucky: { name: 'Unlucky', text: 'Most red spaces landed on', stat: 'redSpaces' },
} as const;
export type BonusId = keyof typeof BONUS_STARS;

/** Draws bonus stars at random (so nobody can play for them), skipping any nobody qualifies for. */
export function drawBonusStars(room: RoomEngine, g: GameState, count: number): { id: BonusId; winners: string[]; value: number }[] {
  const pool = (Object.keys(BONUS_STARS) as BonusId[]).filter((id) => {
    const stat = BONUS_STARS[id].stat;
    return Math.max(...g.order.map((p) => g.players[p]!.stats[stat])) > 0;
  });
  return room.rng
    .shuffle(pool)
    .slice(0, count)
    .map((id) => {
      const stat = BONUS_STARS[id].stat;
      const value = Math.max(...g.order.map((p) => g.players[p]!.stats[stat]));
      // Tied players all receive the star.
      return { id, value, winners: g.order.filter((p) => g.players[p]!.stats[stat] === value) };
    });
}

export interface BonusPhase extends PhaseBase {
  kind: 'bonus';
  awards: { id: BonusId; winners: string[]; value: number }[];
  /** Server time each award is revealed on the host. */
  revealAt: number[];
}

const BONUS_INTRO_MS = 3500;
const BONUS_EACH_MS = 6000;

export const bonusPhase = definePhase<BonusPhase>({
  kind: 'bonus',
  enter(room, s) {
    const g = game(room);
    s.awards = drawBonusStars(room, g, SESSION[g.length].bonusStars);
    for (const a of s.awards) for (const id of a.winners) g.players[id]!.stars++;
    g.bonus = s.awards.map((a) => ({ id: a.id, winners: a.winners }));
    s.revealAt = s.awards.map((_, i) => room.now() + BONUS_INTRO_MS + i * BONUS_EACH_MS);
    s.endsAt = room.now() + BONUS_INTRO_MS + s.awards.length * BONUS_EACH_MS + 1500;
    room.setPhaseTimer('done', s.endsAt);
  },
  timer(room, _s, key) {
    if (key === 'done') room.goto({ kind: 'podium' });
  },
  hostAction(room, _s, action) {
    if (action.action !== 'skip') return false;
    room.goto({ kind: 'podium' });
    return true;
  },
  hostView: (_room, s) => ({ awards: s.awards, revealAt: s.revealAt, info: BONUS_STARS }),
  playerView: (room, s, seatId) => {
    const me = entityOf(game(room), seatId);
    return { revealAt: s.revealAt, awards: s.awards.map((a) => ({ id: a.id, mine: a.winners.includes(me) })), info: BONUS_STARS };
  },
});

// ------------------------------------------------------------------ wiring

const boardStep = flowHooks.afterRoundIntro();
flowHooks.setAfterRoundIntro((room) => {
  const g = game(room);
  const firstFinalRound = g.rounds - SESSION[g.length].finalStretch + 1;
  if (g.round === firstFinalRound && g.twist === undefined && !room.state.settings.forceGame) {
    g.twist = null;
    room.goto({ kind: 'twist' });
  } else boardStep(room);
});

flowHooks.setAfterPayout((room) => {
  const g = game(room);
  if (g.threat >= g.threatMax) room.goto({ kind: 'threat' });
  else afterThreat(room);
});

flowHooks.setAfterLastRound((room) => room.goto({ kind: 'bonus' }));
