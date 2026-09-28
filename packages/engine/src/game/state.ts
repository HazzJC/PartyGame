import { TEAM_AVATAR_BASE, SESSION, type Format, type GameLength } from '@partygame/shared';
import type { RoomEngine } from '../room.ts';
import type { SeatId } from '../types.ts';

/** Stats behind the end-of-game bonus stars. */
export interface PlayerStats {
  minigameCoins: number;
  maxCoins: number;
  spacesMoved: number;
  coopWins: number;
  crowdScore: number;
  betWinnings: number;
  redSpaces: number;
}

/**
 * A board entity: normally one player, or a whole team in team board mode. Coins, stars, items,
 * the pawn and the stats all belong to entities; seats act for them.
 */
export interface GamePlayer {
  id: SeatId;
  coins: number;
  stars: number;
  /** Item ids, visible only to this player (or team). */
  items: string[];
  stats: PlayerStats;
  /** Movement-card variant: three cards valued 1 to 6. */
  cards?: number[];
}

export interface TeamBoard {
  /** Entity ids ('t0'…), names and member seats, index-aligned. */
  ids: string[];
  names: string[];
  teams: SeatId[][];
}

/** Team board mode needs a big room: at least this many seats. */
export const TEAM_BOARD_MIN = 8;
export const TEAM_NAMES = ['Red team', 'Blue team', 'Green team', 'Gold team'];

export interface NextMinigame {
  gameId: string;
  format: Format;
  participants: SeatId[];
  /** Team games: participants split into teams. 1vN: [small, large]. */
  teams?: SeatId[][];
  /** True when the wanted format had no games, so FFA was dealt instead. */
  fallback?: boolean;
}

export interface GameState {
  length: GameLength;
  round: number;
  rounds: number;
  players: Record<SeatId, GamePlayer>;
  order: SeatId[];
  /** Per format, the mini game ids left in the shuffled deck (nothing repeats until it runs out). */
  decks: Partial<Record<Format, string[]>>;
  next: NextMinigame | null;
  threat: number;
  threatMax: number;
  /** Coins each player won in the last payout, for the scoreboard. */
  lastPayout: Record<SeatId, number> | null;
  history: { round: number; gameId: string; format: Format }[];
  /** Board state, added by the board module. */
  board?: any;
  /** The final-stretch twist the last-place player picked, once picked. */
  twist?: 'cheapStars' | 'starMoves' | 'bottomItems' | null;
  /** Bonus stars awarded at the end. */
  bonus?: { id: string; winners: string[] }[];
  /** Hidden traps: owner → space. Known only to the owner. */
  traps: Record<SeatId, number>;
  /** Players holding a star discount for their next star. */
  discounts: SeatId[];
  /** Duels waiting to be played (extra duels carry over to the next round). */
  pendingDuels: PendingDuel[];
  /** Players who landed on a shop this round (the shop opens on their phone at payout). */
  shoppers: SeatId[];
  /** Spotlight moments used this round (the cap is 3, shared with duels). */
  spotlightsThisRound: number;
  /** The duel being played, between its setup and its result. */
  duel?: import('./duels.ts').DuelState | null;
  duelsThisRound?: number;
  /** Team board mode (null in normal games). */
  teamBoard?: TeamBoard | null;
  /** Seat → entity. Identity in normal games. */
  entityOf?: Record<SeatId, string>;
  /** The how-to-play intro has been shown this game. */
  tutorialDone?: boolean;
  /** Coins each entity gains from the mini game being revealed (kept off the rail until payout). */
  revealPayout?: Record<string, number> | null;
}

export interface PendingDuel {
  a: SeatId;
  /** Null: the challenger picks an opponent (duel space). */
  b: SeatId | null;
  reason: 'space' | 'meet' | 'ticket';
}

export function newGamePlayer(id: SeatId): GamePlayer {
  return {
    id,
    coins: 10,
    stars: 0,
    items: [],
    stats: { minigameCoins: 0, maxCoins: 10, spacesMoved: 0, coopWins: 0, crowdScore: 0, betWinnings: 0, redSpaces: 0 },
  };
}

export function createGameState(room: RoomEngine): GameState {
  const length = room.state.settings.length;
  const seats = room.seats.map((s) => s.id);
  let order = seats;
  let teamBoard: TeamBoard | null = null;
  let entityMap: Record<SeatId, string> = Object.fromEntries(seats.map((id) => [id, id]));
  if (room.state.settings.teamBoard && seats.length >= TEAM_BOARD_MIN) {
    // Four teams, dealt at random, sharing one pawn, purse, item hand and star count.
    const shuffled = room.rng.shuffle(seats);
    const teams = [0, 1, 2, 3].map((t) => shuffled.filter((_, i) => i % 4 === t));
    teamBoard = { ids: teams.map((_, t) => `t${t}`), names: TEAM_NAMES.slice(0, 4), teams };
    order = teamBoard.ids;
    entityMap = Object.fromEntries(teams.flatMap((team, t) => team.map((id) => [id, `t${t}`])));
  }
  const cards = room.state.settings.movement === 'cards';
  const players = Object.fromEntries(order.map((id) => [id, { ...newGamePlayer(id), ...(cards ? { cards: [0, 1, 2].map(() => room.rng.int(1, 6)) } : {}) }]));
  return {
    length,
    round: 0,
    rounds: SESSION[length].rounds,
    players,
    order,
    teamBoard,
    entityOf: entityMap,
    decks: {},
    next: null,
    threat: 0,
    threatMax: 3,
    lastPayout: null,
    history: [],
    traps: {},
    discounts: [],
    pendingDuels: [],
    shoppers: [],
    spotlightsThisRound: 0,
  };
}

export function game(room: RoomEngine): GameState {
  if (!room.state.game) throw new Error('No game in progress');
  return room.state.game as GameState;
}

/** Adds (or removes) coins, never below zero, and tracks the richest-ever stat. Returns the actual change. */
export function addCoins(g: GameState, id: SeatId, delta: number): number {
  const p = g.players[id];
  if (!p) return 0;
  const before = p.coins;
  p.coins = Math.max(0, p.coins + delta);
  p.stats.maxCoins = Math.max(p.stats.maxCoins, p.coins);
  return p.coins - before;
}

/** Standings: most stars, then most coins. */
export function standings(g: GameState): SeatId[] {
  return [...g.order].sort((a, b) => {
    const pa = g.players[a]!;
    const pb = g.players[b]!;
    return pb.stars - pa.stars || pb.coins - pa.coins;
  });
}

export function isFinalStretch(g: GameState): boolean {
  return g.round > g.rounds - SESSION[g.length].finalStretch;
}

/** The entity (player, or team in team board mode) a seat plays for. */
export function entityOf(g: GameState, seatId: SeatId): string {
  return g.entityOf?.[seatId] ?? seatId;
}

/** Seats acting for an entity. */
export function membersOf(g: GameState, entityId: string): SeatId[] {
  if (!g.teamBoard) return [entityId];
  return g.teamBoard.teams[g.teamBoard.ids.indexOf(entityId)] ?? [];
}

/** Display name for an entity: the player's name, or the team's. */
export function entityName(room: RoomEngine, g: GameState, id: string): string {
  if (g.teamBoard) {
    const i = g.teamBoard.ids.indexOf(id);
    if (i >= 0) return g.teamBoard.names[i]!;
  }
  return room.seat(id)?.name ?? 'Someone';
}

/** A member who should act for an entity: a connected human if there is one. */
export function actingMember(room: RoomEngine, g: GameState, entityId: string): SeatId {
  const members = membersOf(g, entityId);
  return members.find((id) => room.seat(id)?.connected && !room.seat(id)?.isBot) ?? members[0] ?? entityId;
}

/** Public info about every entity, for clients to draw pawns, rails and standings. */
export function entityList(room: RoomEngine, g: GameState): { id: string; name: string; avatar: number; team: number | null; members: SeatId[] }[] {
  return g.order.map((id) => {
    const members = membersOf(g, id);
    const team = g.teamBoard ? g.teamBoard.ids.indexOf(id) : null;
    return { id, name: entityName(room, g, id), avatar: team !== null ? TEAM_AVATAR_BASE + team : (room.seat(id)?.avatar ?? 0), team, members };
  });
}

/** The game record a seat's coins and stats go to (its team's, in team board mode). */
export function gamePlayerFor(room: RoomEngine, seatId: SeatId): GamePlayer | undefined {
  const g = room.state.game as GameState | null | undefined;
  return g?.players?.[entityOf(g, seatId)];
}
