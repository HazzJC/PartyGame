import type { RoomEngine } from '../room.ts';
import type { GameState } from '../game/state.ts';
import type { BoardDef } from './generate.ts';

export interface BoardState {
  def: BoardDef;
  positions: Record<string, number>;
  /** Slot node ids currently holding a star. */
  stars: number[];
  /** Current star price (items and the final-stretch twist change it). */
  starPrice: number;
}

/** A notable moment that gets its own card on the host screen (capped per round). */
export interface Spotlight {
  kind: 'star' | 'contest' | 'event' | 'flip' | 'duel';
  seats: string[];
  title: string;
  text: string;
  /** Extra data for the host card (e.g. bids). */
  data?: unknown;
}

export function board(g: GameState): BoardState {
  return g.board as BoardState;
}

/** A bought star moves to a new slot. */
export function moveStar(room: RoomEngine, b: BoardState, from: number): void {
  const slots = b.def.nodes.filter((nd) => nd.type === 'slot' && !b.stars.includes(nd.id)).map((nd) => nd.id);
  b.stars = b.stars.filter((x) => x !== from);
  if (slots.length) b.stars.push(room.rng.pick(slots));
}
