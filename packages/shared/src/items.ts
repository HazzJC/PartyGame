/**
 * Items: each player holds up to 3, visible only on their own controller. Prices and the exact
 * steal/discount amounts are playtest knobs; stars stay the most expensive thing in the game.
 */
export const ITEMS = {
  doubleRoll: { name: 'Double Roll', text: 'Roll twice and add the results.', price: 6, target: false },
  warp: { name: 'Warp', text: 'Move to a random space before rolling.', price: 5, target: false },
  swap: { name: 'Swap', text: 'Swap board positions with a player you choose.', price: 8, target: true },
  steal: { name: 'Steal', text: 'Take 6 coins from a player you choose.', price: 7, target: true },
  starDiscount: { name: 'Star Coupon', text: 'Your next star costs 8 coins less.', price: 6, target: false },
  trap: { name: 'Hidden Trap', text: 'Hide a trap on a space. Whoever lands there pays you 6 coins.', price: 5, target: 'space' },
  duelTicket: { name: 'Duel Ticket', text: 'Challenge a player you choose to a duel.', price: 4, target: true },
} as const;

export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

export const STEAL_AMOUNT = 6;
export const STAR_DISCOUNT = 8;
export const TRAP_AMOUNT = 6;
