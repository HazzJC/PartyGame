import { STAR_PRICE, formatForSides, fourTeams, starCount, type Format } from '@partygame/shared';
import { definePhase, type PhaseBase } from '../phase.ts';
import type { RoomEngine } from '../room.ts';
import { dealAndShowRules, flowHooks } from '../game/flow.ts';
import { addCoins, entityList, entityName, entityOf, game, isFinalStretch, membersOf, type GameState } from '../game/state.ts';
import { generateBoard, isJunction, preview } from './generate.ts';
import { BOARD_EVENTS, applyBoardEvent } from './events.ts';
import { board, moveStar, type BoardState, type Spotlight } from './state.ts';
import { resolveItems, springTrap, starPriceFor, validateUse, type ItemUse } from '../game/items.ts';

export type { BoardState, Spotlight };

/**
 * Per-entity movement this turn. An entity is one player, or a whole team in team board mode;
 * everything on the board belongs to entities, and seats act for them (by vote in team mode).
 */
export interface Walk {
  roll: number | null;
  /** Where the pawn started this turn (the host animates from here). */
  start: number;
  at: number;
  remaining: number;
  path: number[];
  passedStars: number[];
  /** Waiting for a branch choice at this junction (options are next node ids). */
  junction: { node: number; options: { next: number; preview: number[] }[]; since: number } | null;
  done: boolean;
  /** When the path became final: the host starts animating this pawn then. */
  finalAt: number | null;
}

export interface StarContest {
  star: number;
  bidders: string[];
  bids: Record<string, number>;
  closesAt: number;
}

/** What each seat has voted for (team board mode) or chosen (normal games). */
export interface SeatVote {
  card?: number;
  branch?: number;
  bid?: number;
  item?: ItemUse | null;
}

export interface BoardPhase extends PhaseBase {
  kind: 'board';
  stage: 'roll' | 'items' | 'move' | 'bid' | 'resolve';
  walks: Record<string, Walk>;
  votes: Record<string, SeatVote>;
  /** Items queued secretly during the roll step, revealed together when it ends. */
  uses: Record<string, ItemUse>;
  itemLines: string[];
  contests: StarContest[];
  /** Coins from the landing space, for floating numbers. */
  landing: Record<string, number>;
  colours: Record<string, 'blue' | 'red'>;
  /** Entities on neutral spaces, given a colour by coin flip. */
  flipped: string[];
  spotlights: Spotlight[];
  summary: string[];
  /** Resolve timeline start (server time): landing numbers, then spotlights. */
  resolveAt: number | null;
}

export const ROLL_MS = 10_000;
export const BRANCH_MS = 10_000;
export const BID_MS = 10_000;
/** Host animation speed per node; the phase waits for the longest walk. */
export const STEP_MS = 340;
export const SPOTLIGHT_MS = 3800;
export const LANDING_MS = 2600;
export const FLIP_MS = 2400;
export const SUMMARY_MS = 3000;
export const SIDES_MS = 2500;
export const SPOTLIGHT_CAP = 3;
export const ITEMS_REVEAL_MS = 4500;

// ------------------------------------------------------------------ setup

export function initBoard(room: RoomEngine, g: GameState): void {
  // The board is sized by the number of people, even when teams share pawns.
  const def = generateBoard(room.seats.length, room.rng);
  const slots = def.nodes.filter((nd) => nd.type === 'slot').map((nd) => nd.id);
  // First star away from the start, so nobody buys one on turn one.
  const far = slots.slice(Math.floor(slots.length / 3));
  const stars = room.rng.shuffle(far).slice(0, starCount(room.seats.length));
  g.board = { def, positions: Object.fromEntries(g.order.map((id) => [id, def.start])), stars, starPrice: STAR_PRICE } satisfies BoardState;
}

// ------------------------------------------------------------------ voting

/** Most common value among members' votes (ties at random), or undefined if nobody voted. */
function majority<T>(room: RoomEngine, values: T[], key: (v: T) => string = String): T | undefined {
  if (!values.length) return undefined;
  const counts = new Map<string, { v: T; n: number }>();
  for (const v of values) {
    const k = key(v);
    counts.set(k, { v, n: (counts.get(k)?.n ?? 0) + 1 });
  }
  const top = Math.max(...[...counts.values()].map((c) => c.n));
  return room.rng.pick([...counts.values()].filter((c) => c.n === top)).v;
}

function voted(s: BoardPhase, g: GameState, entity: string, field: keyof SeatVote): boolean {
  return membersOf(g, entity).every((m) => s.votes[m]?.[field] !== undefined);
}

function votesFor<K extends keyof SeatVote>(s: BoardPhase, g: GameState, entity: string, field: K): NonNullable<SeatVote[K]>[] {
  return membersOf(g, entity)
    .map((m) => s.votes[m]?.[field])
    .filter((v): v is NonNullable<SeatVote[K]> => v !== undefined && v !== null);
}

// ------------------------------------------------------------------ movement

function walkOn(room: RoomEngine, s: BoardPhase, id: string): void {
  const g = game(room);
  const b = board(g);
  const w = s.walks[id]!;
  for (let guard = 0; guard < 300 && w.remaining > 0 && !w.junction; guard++) {
    const node = b.def.nodes[w.at]!;
    if (node.next.length > 1) {
      w.junction = {
        node: w.at,
        options: node.next.map((next) => ({ next, preview: preview(b.def, next, w.remaining) })),
        since: room.now(),
      };
      room.setPhaseTimer(`jn:${id}`, room.now() + BRANCH_MS);
      return;
    }
    step(b, w, node.next[0]!);
  }
  if (w.remaining <= 0 && !w.done) finishWalk(room, s, id);
}

function step(b: BoardState, w: Walk, to: number): void {
  w.at = to;
  w.path.push(to);
  const node = b.def.nodes[to]!;
  if (node.type === 'slot') {
    if (b.stars.includes(to)) w.passedStars.push(to);
  } else {
    w.remaining--;
  }
}

function takeBranch(room: RoomEngine, s: BoardPhase, id: string, next: number): void {
  const w = s.walks[id]!;
  if (!w.junction || !w.junction.options.some((o) => o.next === next)) return;
  room.clearPhaseTimer(`jn:${id}`);
  w.junction = null;
  // Clear the team's branch votes for the next junction.
  for (const m of membersOf(game(room), id)) if (s.votes[m]) delete s.votes[m]!.branch;
  step(board(game(room)), w, next);
  walkOn(room, s, id);
}

function finishWalk(room: RoomEngine, s: BoardPhase, id: string): void {
  const w = s.walks[id]!;
  w.done = true;
  w.finalAt = room.now();
  const g = game(room);
  g.players[id]!.stats.spacesMoved += w.roll ?? 0;
  board(g).positions[id] = w.at;
  if (Object.values(s.walks).every((x) => x.done)) {
    // Wait for the host to finish animating the longest walk, then settle stars.
    const lastEnd = Math.max(...Object.values(s.walks).map((x) => (x.finalAt ?? room.now()) + x.path.length * STEP_MS));
    room.setPhaseTimer('moved', lastEnd + 500);
  }
}

/** Movement-card variant: play a card (by index) and draw back up to three. */
function playCard(room: RoomEngine, g: GameState, id: string, w: Walk, index: number): void {
  const cards = g.players[id]!.cards;
  if (!cards?.length) return;
  const i = Math.max(0, Math.min(cards.length - 1, index));
  w.roll = cards[i]!;
  cards[i] = room.rng.int(1, 6);
}

function usesCards(g: GameState): boolean {
  return Object.values(g.players).some((p) => p.cards?.length);
}

/** End of the roll step: every roll is locked, then queued items are revealed and resolved. */
function endRoll(room: RoomEngine, s: BoardPhase): void {
  room.clearPhaseTimer('rollEnd');
  const g = game(room);
  for (const [id, w] of Object.entries(s.walks)) {
    if (w.roll !== null) continue;
    if (usesCards(g)) playCard(room, g, id, w, majority(room, votesFor(s, g, id, 'card')) ?? room.rng.int(0, 2));
    else w.roll = rollDie(room);
  }
  // Items: in team mode the team's most-voted item is played.
  if (g.teamBoard) {
    for (const id of g.order) {
      const use = majority(room, votesFor(s, g, id, 'item'), (u) => `${u.item}|${u.target ?? ''}|${u.space ?? ''}`);
      if (use) s.uses[id] = use;
    }
  }
  if (Object.keys(s.uses).length === 0) return startMove(room, s);
  s.itemLines = resolveItems(room, g, board(g), s.walks, s.uses, () => rollDie(room));
  s.stage = 'items';
  s.endsAt = room.now() + ITEMS_REVEAL_MS;
  room.setPhaseTimer('itemsDone', s.endsAt);
}

function startMove(room: RoomEngine, s: BoardPhase): void {
  s.stage = 'move';
  s.endsAt = null;
  for (const [id, w] of Object.entries(s.walks)) {
    w.remaining = w.roll ?? rollDie(room);
    walkOn(room, s, id);
  }
  room.scheduleBots();
}

function rollDie(room: RoomEngine): number {
  return room.rng.int(1, 6);
}

// ------------------------------------------------------------------ stars

function settleStars(room: RoomEngine, s: BoardPhase): void {
  const g = game(room);
  const b = board(g);
  const byStar = new Map<number, string[]>();
  for (const [id, w] of Object.entries(s.walks))
    for (const star of new Set(w.passedStars)) if (g.players[id]!.coins >= starPriceFor(g, b, id)) byStar.set(star, [...(byStar.get(star) ?? []), id]);

  for (const [star, ids] of byStar) {
    if (ids.length === 1) buyStar(room, s, ids[0]!, star, starPriceFor(g, b, ids[0]!));
    else s.contests.push({ star, bidders: ids, bids: {}, closesAt: room.now() + BID_MS });
  }
  if (s.contests.length) {
    s.stage = 'bid';
    s.endsAt = room.now() + BID_MS;
    room.setPhaseTimer('bidEnd', s.endsAt + 400);
    room.scheduleBots();
  } else {
    resolve(room, s);
  }
}

function buyStar(room: RoomEngine, s: BoardPhase, id: string, star: number, cost: number, contest?: StarContest): void {
  const g = game(room);
  const b = board(g);
  if (!b.stars.includes(star)) return;
  addCoins(g, id, -cost);
  g.players[id]!.stars++;
  // A star coupon is used up by the next star, whatever it cost.
  g.discounts = g.discounts.filter((x) => x !== id);
  moveStar(room, b, star);
  s.spotlights.push({
    kind: contest ? 'contest' : 'star',
    seats: contest ? contest.bidders : [id],
    title: contest ? 'Star contest!' : 'Star!',
    text: `${entityName(room, g, id)} buys a star for ${cost} coins`,
    data: contest ? { winner: id, bids: contest.bids } : { winner: id },
  });
}

function settleContests(room: RoomEngine, s: BoardPhase): void {
  const g = game(room);
  const price = board(g).starPrice;
  for (const c of s.contests) {
    const bids = c.bidders.map((id) => ({ id, bid: Math.max(price, Math.min(g.players[id]!.coins, c.bids[id] ?? price)) }));
    // Highest bid wins; ties go to the player with fewer stars, then at random.
    bids.sort((a, b2) => b2.bid - a.bid || g.players[a.id]!.stars - g.players[b2.id]!.stars || (room.rng.chance(0.5) ? 1 : -1));
    const win = bids[0]!;
    c.bids = Object.fromEntries(bids.map((x) => [x.id, x.bid]));
    buyStar(room, s, win.id, c.star, win.bid, c);
  }
  resolve(room, s);
}

// ------------------------------------------------------------------ resolve

function resolve(room: RoomEngine, s: BoardPhase): void {
  const g = game(room);
  const b = board(g);
  const final = isFinalStretch(g);
  const events: Spotlight[] = [];
  const name = (id: string) => entityName(room, g, id);
  for (const id of g.order) {
    const node = b.def.nodes[b.positions[id]!]!;
    const p = g.players[id]!;
    const sprung = springTrap(g, id, node.id);
    if (sprung) events.unshift({ kind: 'event', seats: [id, sprung[0]], title: 'Trap!', text: `${name(id)} sprang ${name(sprung[0])}'s hidden trap and paid ${sprung[1]} coins` });
    if (node.type === 'shop') g.shoppers.push(id);
    if (node.type === 'duel') g.pendingDuels.push({ a: id, b: null, reason: 'space' });
    if (node.type === 'blue') {
      s.landing[id] = addCoins(g, id, final ? 6 : 3);
      s.colours[id] = 'blue';
    } else if (node.type === 'red') {
      s.landing[id] = addCoins(g, id, final ? -6 : -3);
      s.colours[id] = 'red';
      p.stats.redSpaces++;
    } else {
      if (node.type === 'event') events.push(applyBoardEvent(room, id, room.rng.pick(BOARD_EVENTS)));
      // Neutral spaces: a coin flip on the host screen decides the colour.
      s.colours[id] = room.rng.chance(0.5) ? 'blue' : 'red';
      s.flipped.push(id);
    }
  }
  // Two pawns ending on the same space: a duel between them.
  const byNode = new Map<number, string[]>();
  for (const id of g.order) byNode.set(b.positions[id]!, [...(byNode.get(b.positions[id]!) ?? []), id]);
  for (const [node, ids] of byNode) {
    if (ids.length < 2 || node === b.def.start) continue;
    const [a, c] = room.rng.shuffle(ids);
    g.pendingDuels.push({ a: a!, b: c!, reason: 'meet' });
  }
  // Spotlight cap: star purchases first, then events; the rest resolve in a summary panel.
  // Duels run after the mini game and share the same cap.
  const all = [...s.spotlights, ...events];
  s.spotlights = all.slice(0, SPOTLIGHT_CAP);
  s.summary = all.slice(SPOTLIGHT_CAP).map((x) => x.text);
  g.spotlightsThisRound = s.spotlights.length;
  s.stage = 'resolve';
  s.resolveAt = room.now();
  const flipMs = s.flipped.length ? FLIP_MS : 0;
  // Always end on the Blue vs Red tally, which decides the mini game format.
  s.endsAt = room.now() + LANDING_MS + flipMs + s.spotlights.length * SPOTLIGHT_MS + (s.summary.length ? SUMMARY_MS : 0) + SIDES_MS;
  room.setPhaseTimer('resolved', s.endsAt);
}

/** Picks the mini game format from the colours players landed on, and the sides for team/1vN. */
export function formatFromColours(room: RoomEngine, colours: Record<string, 'blue' | 'red'>): { format: Format; teams?: string[][] } {
  const red = Object.keys(colours).filter((id) => colours[id] === 'red');
  const blue = Object.keys(colours).filter((id) => colours[id] === 'blue');
  const kind = formatForSides(red.length, blue.length);
  if (kind === 'ffa-or-coop') return { format: room.rng.chance(0.35) ? 'coop' : 'ffa' };
  if (kind === 'ffa') return { format: 'ffa' };
  const [small, large] = red.length <= blue.length ? [red, blue] : [blue, red];
  if (kind === '1vN') return { format: '1vN', teams: [small, large] };
  if (fourTeams(red.length + blue.length)) {
    const split = (xs: string[]) => {
      const sh = room.rng.shuffle(xs);
      return [sh.filter((_, i) => i % 2 === 0), sh.filter((_, i) => i % 2 === 1)];
    };
    return { format: 'team', teams: [...split(red), ...split(blue)] };
  }
  return { format: 'team', teams: [red, blue] };
}

/** Team board mode: 4-team games, co-op, or free-for-all scored by team average placement. */
export function teamBoardFormat(room: RoomEngine, g: GameState): { format: Format; teams?: string[][] } {
  const r = room.rng.next();
  if (r < 0.5) return { format: 'team', teams: g.teamBoard!.teams };
  if (r < 0.85) return { format: 'ffa' };
  return { format: 'coop' };
}

// ------------------------------------------------------------------ phase

export const boardPhase = definePhase<BoardPhase>({
  kind: 'board',
  enter(room, s) {
    const g = game(room);
    const b = board(g);
    s.stage = 'roll';
    s.walks = Object.fromEntries(g.order.map((id) => [id, { roll: null, start: b.positions[id]!, at: b.positions[id]!, remaining: 0, path: [], passedStars: [], junction: null, done: false, finalAt: null } satisfies Walk]));
    s.votes = {};
    s.contests = [];
    s.uses = {};
    s.itemLines = [];
    s.landing = {};
    s.colours = {};
    s.flipped = [];
    s.spotlights = [];
    s.summary = [];
    s.resolveAt = null;
    s.endsAt = room.now() + ROLL_MS;
    room.setPhaseTimer('rollEnd', s.endsAt + 300);
  },
  intent(room, s, seatId, intent) {
    const g = game(room);
    const id = entityOf(g, seatId);
    const w = s.walks[id];
    if (!w) return;
    const vote = (s.votes[seatId] ??= {});
    const team = !!g.teamBoard;
    if (intent.type === 'roll' && s.stage === 'roll' && w.roll === null && !usesCards(g)) {
      // In team mode the first teammate to tap rolls for the team.
      w.roll = rollDie(room);
    } else if (intent.type === 'card' && s.stage === 'roll' && w.roll === null && usesCards(g)) {
      const index = Math.round(Number(intent.index));
      if (!Number.isInteger(index) || index < 0 || index > 2) return;
      vote.card = index;
      if (!team) playCard(room, g, id, w, index);
      else if (voted(s, g, id, 'card')) playCard(room, g, id, w, majority(room, votesFor(s, g, id, 'card'))!);
    } else if (intent.type === 'useItem' && s.stage === 'roll') {
      // Secret until the roll step ends; can be changed or cancelled until then.
      const use = intent.item ? validateUse(g, board(g), id, intent as { item?: unknown; target?: unknown; space?: unknown }) : null;
      vote.item = use;
      if (!team) {
        if (use) s.uses[id] = use;
        else delete s.uses[id];
      }
      return;
    } else if (intent.type === 'branch' && s.stage === 'move' && w.junction) {
      const next = Number(intent.next);
      if (!w.junction.options.some((o) => o.next === next)) return;
      vote.branch = next;
      if (!team || voted(s, g, id, 'branch')) takeBranch(room, s, id, team ? majority(room, votesFor(s, g, id, 'branch'))! : next);
      return;
    } else if (intent.type === 'bid' && s.stage === 'bid') {
      const c = s.contests.find((x) => x.bidders.includes(id));
      const coins = g.players[id]!.coins;
      const bid = Math.round(Number(intent.coins));
      if (!c || !Number.isFinite(bid)) return;
      vote.bid = Math.max(board(g).starPrice, Math.min(coins, bid));
      // A team bids the highest amount any member proposes.
      c.bids[id] = Math.max(...votesFor(s, g, id, 'bid'));
      if (s.contests.every((x) => x.bidders.every((e) => voted(s, g, e, 'bid')))) room.setPhaseTimer('bidEnd', room.now() + 800);
      return;
    } else return;
    // Everyone has rolled: leave time for the last die to finish tumbling and show its number.
    if (Object.values(s.walks).every((x) => x.roll !== null)) room.setPhaseTimer('rollEnd', room.now() + 2600);
  },
  timer(room, s, key) {
    if (key === 'rollEnd' && s.stage === 'roll') endRoll(room, s);
    else if (key === 'itemsDone' && s.stage === 'items') startMove(room, s);
    else if (key.startsWith('jn:')) {
      // Timer ran out at a junction: the team's votes so far, or a random branch.
      const id = key.slice(3);
      const w = s.walks[id];
      if (!w?.junction) return;
      const g = game(room);
      takeBranch(room, s, id, majority(room, votesFor(s, g, id, 'branch')) ?? room.rng.pick(w.junction.options).next);
    } else if (key === 'moved' && s.stage === 'move') settleStars(room, s);
    else if (key === 'bidEnd' && s.stage === 'bid') settleContests(room, s);
    else if (key === 'resolved' && s.stage === 'resolve') {
      const g = game(room);
      const { format, teams } = g.teamBoard ? teamBoardFormat(room, g) : formatFromColours(room, s.colours);
      dealAndShowRules(room, format, teams);
    }
  },
  hostAction(room, s, action) {
    if (action.action !== 'skip') return false;
    if (s.stage === 'roll') endRoll(room, s);
    else if (s.stage === 'items') startMove(room, s);
    else if (s.stage === 'resolve') room.setPhaseTimer('resolved', room.now());
    return true;
  },
  awaiting(room, s, seatId) {
    const g = game(room);
    const id = entityOf(g, seatId);
    const w = s.walks[id];
    const v = s.votes[seatId] ?? {};
    if (!w) return false;
    if (s.stage === 'roll') return w.roll === null && (!usesCards(g) || v.card === undefined);
    if (s.stage === 'move') return !!w.junction && v.branch === undefined;
    if (s.stage === 'bid') return s.contests.some((c) => c.bidders.includes(id)) && v.bid === undefined;
    return false;
  },
  botDelay: [700, 2500],
  bot(room, s, seatId) {
    const g = game(room);
    const id = entityOf(g, seatId);
    const w = s.walks[id]!;
    // The autopilot for a dropped player makes random choices and uses no items (the doc's rule);
    // real bots are a little smarter.
    const realBot = !!room.seat(seatId)?.isBot;
    if (s.stage === 'roll') {
      const hand = g.players[id]!.items;
      if (realBot && hand.length && s.votes[seatId]?.item === undefined && room.rng.chance(0.5)) {
        const item = room.rng.pick(hand);
        const others = g.order.filter((x) => x !== id);
        const spaces = board(g).def.nodes.filter((nd) => nd.type !== 'slot').map((nd) => nd.id);
        return { type: 'useItem', item, target: room.rng.pick(others), space: room.rng.pick(spaces) };
      }
      return usesCards(g) ? { type: 'card', index: room.rng.int(0, 2) } : { type: 'roll' };
    }
    if (s.stage === 'move' && w.junction) {
      const b = board(g);
      const toStar = realBot ? w.junction.options.find((o) => o.preview.some((n) => b.stars.includes(n))) : undefined;
      return { type: 'branch', next: (toStar ?? room.rng.pick(w.junction.options)).next };
    }
    if (s.stage === 'bid') {
      const coins = g.players[id]!.coins;
      const price = board(g).starPrice;
      return { type: 'bid', coins: Math.min(coins, price + room.rng.int(0, Math.max(0, Math.floor((coins - price) / 2)))) };
    }
    return null;
  },
  hostView(room, s) {
    const g = game(room);
    const b = board(g);
    return {
      stage: s.stage,
      def: b.def,
      stars: b.stars,
      starPrice: b.starPrice,
      entities: entityList(room, g),
      walks: Object.fromEntries(
        Object.entries(s.walks).map(([id, w]) => [
          id,
          // Rolls are public (drawn on the host); routes appear once final, so choices stay private until then.
          { roll: w.roll, path: w.done ? w.path : [], start: w.start, finalAt: w.finalAt, deciding: !!w.junction },
        ]),
      ),
      positions: b.positions,
      contests: s.stage === 'bid' ? s.contests.map((c) => ({ star: c.star, bidders: c.bidders, submitted: c.bidders.filter((id) => voted(s, g, id, 'bid')) })) : [],
      landing: s.landing,
      colours: s.colours,
      flipped: s.flipped,
      spotlights: s.spotlights,
      summary: s.summary,
      itemLines: s.stage === 'items' ? s.itemLines : [],
      resolveAt: s.resolveAt,
      stepMs: STEP_MS,
      teamBoard: !!g.teamBoard,
      cards: usesCards(g),
      timeline: { landingMs: LANDING_MS, flipMs: s.flipped.length ? FLIP_MS : 0, spotlightMs: SPOTLIGHT_MS, summaryMs: s.summary.length ? SUMMARY_MS : 0 },
    };
  },
  playerView(room, s, seatId) {
    const g = game(room);
    const b = board(g);
    const id = entityOf(g, seatId);
    const w = s.walks[id];
    const v = s.votes[seatId] ?? {};
    const contest = s.contests.find((c) => c.bidders.includes(id));
    return {
      stage: s.stage,
      def: w?.junction || s.stage === 'roll' ? b.def : null,
      stars: b.stars,
      position: b.positions[id],
      roll: w?.roll ?? null,
      junction: w?.junction ?? null,
      at: w?.at ?? null,
      remaining: w?.remaining ?? 0,
      done: w?.done ?? false,
      cards: g.players[id]?.cards ?? null,
      myCard: v.card ?? null,
      myBranch: v.branch ?? null,
      hand: g.players[id]?.items ?? [],
      use: g.teamBoard ? (v.item ?? null) : (s.uses[id] ?? null),
      trap: g.traps[id] ?? null,
      coupon: g.discounts.includes(id),
      team: g.teamBoard ? { name: entityName(room, g, id), index: g.teamBoard.ids.indexOf(id) } : null,
      targets: entityList(room, g).filter((e) => e.id !== id),
      bid: contest && s.stage === 'bid' ? { mine: v.bid ?? null, min: b.starPrice, max: g.players[id]!.coins, rivals: contest.bidders.filter((x) => x !== id) } : null,
      landing: s.landing[id] ?? null,
      colour: s.colours[id] ?? null,
      resolveAt: s.resolveAt,
      /** When this player's own colour is known on the host (after the coin flip). */
      colourKnownAt: s.resolveAt === null ? null : s.resolveAt + LANDING_MS + (s.flipped.length ? FLIP_MS : 0),
      starPrice: b.starPrice,
    };
  },
});

// ------------------------------------------------------------------ wiring

// The single-game test harness (forceGame) skips the board to get straight to the game.
flowHooks.setAfterRoundIntro((room) => (room.state.settings.forceGame ? dealAndShowRules(room, 'ffa') : room.goto({ kind: 'board' })));
flowHooks.setOnGameStart((room, g) => initBoard(room, g));

export { isJunction };
