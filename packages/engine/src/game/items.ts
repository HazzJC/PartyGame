import { ITEMS, MAX_ITEMS, STAR_DISCOUNT, STEAL_AMOUNT, TRAP_AMOUNT, type ItemId } from '@partygame/shared';
import type { RoomEngine } from '../room.ts';
import type { BoardState } from '../board/state.ts';
import { addCoins, type GameState } from './state.ts';

/** An item a player has queued during the roll step. Revealed and resolved together. */
export interface ItemUse {
  item: ItemId;
  target?: string;
  space?: number;
}

/** Checks the player owns the item and its target makes sense; returns a clean use or null. */
export function validateUse(g: GameState, b: BoardState, id: string, raw: { item?: unknown; target?: unknown; space?: unknown }): ItemUse | null {
  const item = raw.item as ItemId;
  if (!item || !(item in ITEMS) || !g.players[id]?.items.includes(item)) return null;
  const needs = ITEMS[item].target;
  if (needs === true) {
    const target = String(raw.target ?? '');
    if (!g.players[target] || target === id) return null;
    return { item, target };
  }
  if (needs === 'space') {
    const space = Number(raw.space);
    const node = b.def.nodes[space];
    if (!node || node.type === 'slot') return null;
    return { item, space };
  }
  return { item };
}

function consume(g: GameState, id: string, item: ItemId): void {
  const items = g.players[id]!.items;
  const i = items.indexOf(item);
  if (i >= 0) items.splice(i, 1);
}

export interface WalkLike {
  roll: number | null;
  start: number;
  at: number;
}

/**
 * Resolves every queued item in the doc's order: movement, then position, then coins.
 * Mutual swaps cancel. Returns public reveal lines (hidden traps say only that one was hidden).
 */
export function resolveItems(room: RoomEngine, g: GameState, b: BoardState, walks: Record<string, WalkLike>, uses: Record<string, ItemUse>, rollDie: () => number): string[] {
  const name = (id: string) => room.seat(id)?.name ?? 'Someone';
  const lines: string[] = [];
  const ids = Object.keys(uses);
  for (const id of ids) consume(g, id, uses[id]!.item);

  // 1. Movement
  const spaces = b.def.nodes.filter((nd) => nd.type !== 'slot').map((nd) => nd.id);
  for (const id of ids) {
    const u = uses[id]!;
    const w = walks[id]!;
    if (u.item === 'doubleRoll') {
      const extra = rollDie();
      w.roll = (w.roll ?? rollDie()) + extra;
      lines.push(`${name(id)} used Double Roll: +${extra}`);
    } else if (u.item === 'warp') {
      const to = room.rng.pick(spaces);
      w.start = w.at = b.positions[id] = to;
      lines.push(`${name(id)} warped across the board`);
    }
  }

  // 2. Position: swaps. Two players swapping with each other both cancel.
  const swaps = ids.filter((id) => uses[id]!.item === 'swap');
  for (const id of swaps) {
    const target = uses[id]!.target!;
    if (uses[target]?.item === 'swap' && uses[target]!.target === id) {
      if (id < target) lines.push(`${name(id)} and ${name(target)} tried to swap with each other. Both cancel!`);
      continue;
    }
    const a = walks[id]!;
    const t = walks[target]!;
    [a.start, t.start] = [t.start, a.start];
    [a.at, t.at] = [t.at, a.at];
    b.positions[id] = a.at;
    b.positions[target] = t.at;
    lines.push(`${name(id)} swapped places with ${name(target)}`);
  }

  // 3. Coins
  for (const id of ids) {
    const u = uses[id]!;
    if (u.item === 'steal') {
      const taken = -addCoins(g, u.target!, -STEAL_AMOUNT);
      addCoins(g, id, taken);
      lines.push(`${name(id)} stole ${taken} coins from ${name(u.target!)}`);
    }
  }

  // 4. Everything else
  for (const id of ids) {
    const u = uses[id]!;
    if (u.item === 'starDiscount') {
      if (!g.discounts.includes(id)) g.discounts.push(id);
      lines.push(`${name(id)} clipped a star coupon`);
    } else if (u.item === 'trap') {
      // One active trap per player: a new one replaces the old.
      g.traps[id] = u.space!;
      lines.push(`${name(id)} hid a trap somewhere…`);
    } else if (u.item === 'duelTicket') {
      g.pendingDuels.push({ a: id, b: u.target!, reason: 'ticket' });
      lines.push(`${name(id)} challenged ${name(u.target!)} to a duel!`);
    }
  }
  return lines;
}

/** Price of the next star for this player (star coupon applied), never below 5. */
export function starPriceFor(g: GameState, b: BoardState, id: string): number {
  return g.discounts.includes(id) ? Math.max(5, b.starPrice - STAR_DISCOUNT) : b.starPrice;
}

/** Springs any other player's trap on this space. Returns [owner, coins] if one fired. */
export function springTrap(g: GameState, lander: string, space: number): [string, number] | null {
  for (const [owner, at] of Object.entries(g.traps)) {
    if (owner === lander || at !== space) continue;
    const paid = -addCoins(g, lander, -TRAP_AMOUNT);
    addCoins(g, owner, paid);
    delete g.traps[owner];
    return [owner, paid];
  }
  return null;
}

export function buyItem(g: GameState, id: string, item: ItemId): boolean {
  const p = g.players[id];
  if (!p || !(item in ITEMS) || p.items.length >= MAX_ITEMS || p.coins < ITEMS[item].price) return false;
  addCoins(g, id, -ITEMS[item].price);
  p.items.push(item);
  return true;
}
