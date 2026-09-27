import { STAR_PRICE, formatForSides, fourTeams, starCount, type Format } from '@partygame/shared';
import { definePhase, type PhaseBase } from '../phase.ts';
import type { RoomEngine } from '../room.ts';
import { dealAndShowRules, flowHooks } from '../game/flow.ts';
import { addCoins, game, isFinalStretch, type GameState } from '../game/state.ts';
import { generateBoard, isJunction, preview } from './generate.ts';
import { BOARD_EVENTS, applyBoardEvent } from './events.ts';
import { board, moveStar, type BoardState, type Spotlight } from './state.ts';
import { resolveItems, springTrap, starPriceFor, validateUse, type ItemUse } from '../game/items.ts';

export type { BoardState, Spotlight };

/** Per-player movement this turn. */
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

export interface BoardPhase extends PhaseBase {
  kind: 'board';
  stage: 'roll' | 'items' | 'move' | 'bid' | 'resolve';
  walks: Record<string, Walk>;
  /** Items queued secretly during the roll step, revealed together when it ends. */
  uses: Record<string, ItemUse>;
  itemLines: string[];
  contests: StarContest[];
  /** Coins from the landing space, for floating numbers. */
  landing: Record<string, number>;
  colours: Record<string, 'blue' | 'red'>;
  /** Players on neutral spaces, given a colour by coin flip. */
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
export const STEP_MS = 230;
export const SPOTLIGHT_MS = 3800;
export const LANDING_MS = 2600;
export const FLIP_MS = 2400;
export const SUMMARY_MS = 3000;
export const SIDES_MS = 2500;
export const SPOTLIGHT_CAP = 3;
export const ITEMS_REVEAL_MS = 4500;

// ------------------------------------------------------------------ setup

export function initBoard(room: RoomEngine, g: GameState): void {
  const def = generateBoard(g.order.length, room.rng);
  const slots = def.nodes.filter((nd) => nd.type === 'slot').map((nd) => nd.id);
  // First star away from the start, so nobody buys one on turn one.
  const far = slots.slice(Math.floor(slots.length / 3));
  const stars = room.rng.shuffle(far).slice(0, starCount(g.order.length));
  g.board = { def, positions: Object.fromEntries(g.order.map((id) => [id, def.start])), stars, starPrice: STAR_PRICE } satisfies BoardState;
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

/** End of the roll step: everyone's roll is locked, then queued items are revealed and resolved. */
function endRoll(room: RoomEngine, s: BoardPhase): void {
  room.clearPhaseTimer('rollEnd');
  for (const w of Object.values(s.walks)) if (w.roll === null) w.roll = rollDie(room);
  if (Object.keys(s.uses).length === 0) return startMove(room, s);
  const g = game(room);
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
    text: `${room.seat(id)?.name ?? 'Someone'} buys a star for ${cost} coins`,
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
  const name = (id: string) => room.seat(id)?.name ?? 'Someone';
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
  // Two players ending on the same space: a duel between them.
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

// ------------------------------------------------------------------ phase

export const boardPhase = definePhase<BoardPhase>({
  kind: 'board',
  enter(room, s) {
    const g = game(room);
    const b = board(g);
    s.stage = 'roll';
    s.walks = Object.fromEntries(g.order.map((id) => [id, { roll: null, start: b.positions[id]!, at: b.positions[id]!, remaining: 0, path: [], passedStars: [], junction: null, done: false, finalAt: null } satisfies Walk]));
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
    const w = s.walks[seatId];
    if (!w) return;
    if (intent.type === 'roll' && s.stage === 'roll' && w.roll === null) {
      w.roll = rollDie(room);
      if (Object.values(s.walks).every((x) => x.roll !== null)) room.setPhaseTimer('rollEnd', room.now() + 1600);
    } else if (intent.type === 'useItem' && s.stage === 'roll') {
      // Secret until the roll step ends; can be changed or cancelled until then.
      const g = game(room);
      const use = intent.item ? validateUse(g, board(g), seatId, intent as { item?: unknown; target?: unknown; space?: unknown }) : null;
      if (use) s.uses[seatId] = use;
      else delete s.uses[seatId];
    } else if (intent.type === 'branch' && s.stage === 'move' && w.junction) {
      const choice = w.junction.options.find((o) => o.next === Number(intent.next));
      if (!choice) return;
      room.clearPhaseTimer(`jn:${seatId}`);
      w.junction = null;
      step(board(game(room)), w, choice.next);
      walkOn(room, s, seatId);
    } else if (intent.type === 'bid' && s.stage === 'bid') {
      const c = s.contests.find((x) => x.bidders.includes(seatId));
      const coins = game(room).players[seatId]!.coins;
      const bid = Math.round(Number(intent.coins));
      if (!c || !Number.isFinite(bid)) return;
      c.bids[seatId] = Math.max(board(game(room)).starPrice, Math.min(coins, bid));
      if (s.contests.every((x) => x.bidders.every((id) => id in x.bids))) room.setPhaseTimer('bidEnd', room.now() + 800);
    }
  },
  timer(room, s, key) {
    if (key === 'rollEnd' && s.stage === 'roll') endRoll(room, s);
    else if (key === 'itemsDone' && s.stage === 'items') startMove(room, s);
    else if (key.startsWith('jn:')) {
      // Timer ran out at a junction: a random branch is taken.
      const id = key.slice(3);
      const w = s.walks[id];
      if (w?.junction) boardPhase.intent!(room, s, id, { type: 'branch', next: room.rng.pick(w.junction.options).next }, null);
    } else if (key === 'moved' && s.stage === 'move') settleStars(room, s);
    else if (key === 'bidEnd' && s.stage === 'bid') settleContests(room, s);
    else if (key === 'resolved' && s.stage === 'resolve') {
      const { format, teams } = formatFromColours(room, s.colours);
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
  awaiting(_room, s, seatId) {
    const w = s.walks[seatId];
    if (!w) return false;
    if (s.stage === 'roll') return w.roll === null;
    if (s.stage === 'move') return !!w.junction;
    if (s.stage === 'bid') return s.contests.some((c) => c.bidders.includes(seatId) && !(seatId in c.bids));
    return false;
  },
  botDelay: [700, 2500],
  bot(room, s, seatId) {
    const w = s.walks[seatId]!;
    if (s.stage === 'roll') {
      const g = game(room);
      const hand = g.players[seatId]!.items;
      if (hand.length && !s.uses[seatId] && room.rng.chance(0.5)) {
        const item = room.rng.pick(hand);
        const others = g.order.filter((x) => x !== seatId);
        const spaces = board(g).def.nodes.filter((nd) => nd.type !== 'slot').map((nd) => nd.id);
        return { type: 'useItem', item, target: room.rng.pick(others), space: room.rng.pick(spaces) };
      }
      return { type: 'roll' };
    }
    if (s.stage === 'move' && w.junction) {
      // Bots head for a star if one lies on a route.
      const b = board(game(room));
      const toStar = w.junction.options.find((o) => o.preview.some((n) => b.stars.includes(n)));
      return { type: 'branch', next: (toStar ?? room.rng.pick(w.junction.options)).next };
    }
    if (s.stage === 'bid') {
      const coins = game(room).players[seatId]!.coins;
      const price = board(game(room)).starPrice;
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
      walks: Object.fromEntries(
        Object.entries(s.walks).map(([id, w]) => [
          id,
          // Rolls are public (drawn on the host); routes appear once final, so choices stay private until then.
          { roll: w.roll, path: w.done ? w.path : [], start: w.start, finalAt: w.finalAt, deciding: !!w.junction },
        ]),
      ),
      positions: b.positions,
      contests: s.stage === 'bid' ? s.contests.map((c) => ({ star: c.star, bidders: c.bidders, submitted: Object.keys(c.bids) })) : [],
      landing: s.landing,
      colours: s.colours,
      flipped: s.flipped,
      spotlights: s.spotlights,
      summary: s.summary,
      itemLines: s.stage === 'items' ? s.itemLines : [],
      resolveAt: s.resolveAt,
      stepMs: STEP_MS,
      timeline: { landingMs: LANDING_MS, flipMs: s.flipped.length ? FLIP_MS : 0, spotlightMs: SPOTLIGHT_MS, summaryMs: s.summary.length ? SUMMARY_MS : 0 },
    };
  },
  playerView(room, s, seatId) {
    const g = game(room);
    const b = board(g);
    const w = s.walks[seatId];
    const contest = s.contests.find((c) => c.bidders.includes(seatId));
    return {
      stage: s.stage,
      def: w?.junction || s.stage === 'roll' ? b.def : null,
      stars: b.stars,
      position: b.positions[seatId],
      roll: w?.roll ?? null,
      junction: w?.junction ?? null,
      at: w?.at ?? null,
      remaining: w?.remaining ?? 0,
      done: w?.done ?? false,
      hand: g.players[seatId]?.items ?? [],
      use: s.uses[seatId] ?? null,
      trap: g.traps[seatId] ?? null,
      coupon: g.discounts.includes(seatId),
      bid: contest && s.stage === 'bid' ? { mine: contest.bids[seatId] ?? null, min: b.starPrice, max: g.players[seatId]!.coins, rivals: contest.bidders.filter((x) => x !== seatId) } : null,
      landing: s.landing[seatId] ?? null,
      colour: s.colours[seatId] ?? null,
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
