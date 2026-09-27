import { SESSION, type Format, type GameLength } from '@partygame/shared';
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

export interface GamePlayer {
  id: SeatId;
  coins: number;
  stars: number;
  /** Item ids, visible only to this player. */
  items: string[];
  stats: PlayerStats;
}

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
  const order = room.seats.map((s) => s.id);
  return {
    length,
    round: 0,
    rounds: SESSION[length].rounds,
    players: Object.fromEntries(order.map((id) => [id, newGamePlayer(id)])),
    order,
    decks: {},
    next: null,
    threat: 0,
    threatMax: 3,
    lastPayout: null,
    history: [],
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
