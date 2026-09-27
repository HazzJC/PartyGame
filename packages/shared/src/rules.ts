/**
 * Every count, threshold and payout from the design doc, written as a function of the player
 * count N. Unit-tested against the doc's own tables at 6, 8 and 16 players.
 */

export type GameLength = 'quick' | 'standard' | 'long';

/** Standard school rounding: 1.5 → 2, 2.5 → 3. */
export const roundHalfUp = (x: number): number => Math.floor(x + 0.5);

// ------------------------------------------------------------------ session

export const SESSION = {
  quick: { rounds: 8, finalStretch: 3, bonusStars: 2 },
  standard: { rounds: 12, finalStretch: 4, bonusStars: 3 },
  long: { rounds: 20, finalStretch: 5, bonusStars: 3 },
} as const satisfies Record<GameLength, { rounds: number; finalStretch: number; bonusStars: number }>;

export const STAR_PRICE = 20;
export const MAX_ITEMS = 3;

// ------------------------------------------------------------------ placements

/**
 * Standard competition ranking ("1, 2, 2, 4"): tied players share the better place.
 * `better` says whether a higher or lower score wins. Players missing from `scores` are not placed.
 */
export function placesFromScores(scores: Record<string, number>, better: 'high' | 'low'): Record<string, number> {
  const ids = Object.keys(scores).sort((a, b) => (better === 'high' ? scores[b]! - scores[a]! : scores[a]! - scores[b]!));
  const places: Record<string, number> = {};
  ids.forEach((id, i) => {
    const prev = ids[i - 1];
    places[id] = prev !== undefined && scores[prev] === scores[id] ? places[prev]! : i + 1;
  });
  return places;
}

// ------------------------------------------------------------------ payouts

/** FFA placement bands: 1st 10, rest of the top quarter 7, second quarter 5, bottom half 2. */
export function ffaCoinsForPlace(place: number, n: number): number {
  const quarter = roundHalfUp(n / 4);
  const half = roundHalfUp(n / 2);
  if (place <= 1) return 10;
  if (place <= quarter) return 7;
  if (place <= half) return 5;
  return 2;
}

/** Tied players all receive the higher band's coins (a shared place is the better one). */
export function ffaPayouts(places: Record<string, number>, n: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [id, place] of Object.entries(places)) out[id] = ffaCoinsForPlace(place, n);
  return out;
}

export const TEAM_PAYOUT = { two: [8, 2], four: [8, 5, 3, 2] } as const;
export const ONE_VS_MANY_PAYOUT = { smallWins: 15, largeWins: 4 } as const;
export const COOP_PAYOUT = { gold: 8, silver: 5, bronze: 3, fail: 0 } as const;
export type CoopGrade = keyof typeof COOP_PAYOUT;

/** Team payouts are per player, so a smaller team isn't penalised. `place` is 1-based. */
export function teamCoins(place: number, teams: number): number {
  const table = teams >= 4 ? TEAM_PAYOUT.four : TEAM_PAYOUT.two;
  return table[Math.min(place, table.length) - 1]!;
}

/** Average payout per player for a whole FFA field (the doc's economy check). */
export function averageFfaPayout(n: number): number {
  let total = 0;
  for (let p = 1; p <= n; p++) total += ffaCoinsForPlace(p, n);
  return total / n;
}

// ------------------------------------------------------------------ format selection

export type Format = 'ffa' | 'team' | '1vN' | 'coop' | 'duel';

/** 1-vs-many band: smaller side of 1 to max(1, ⌊N/5⌋). */
export const oneVsManyMax = (n: number): number => Math.max(1, Math.floor(n / 5));
/** Team band: smaller side of ⌈N/3⌉ or more. */
export const teamMin = (n: number): number => Math.ceil(n / 3);

/** Chooses the mini game format from how many players are on each colour. */
export function formatForSides(red: number, blue: number): 'ffa-or-coop' | '1vN' | 'ffa' | 'team' {
  const n = red + blue;
  const s = Math.min(red, blue);
  if (s === 0) return 'ffa-or-coop';
  if (s <= oneVsManyMax(n)) return '1vN';
  if (s >= teamMin(n)) return 'team';
  return 'ffa';
}

/** At 12 or more players the team format splits each colour in two. */
export const fourTeams = (n: number): boolean => n >= 12;
/** A second star appears on the board at 12 or more players. */
export const starCount = (n: number): number => (n >= 12 ? 2 : 1);

// ------------------------------------------------------------------ per-game scaling

/** Lowest Unique Number range is 1 to N + 4. */
export const lunRange = (n: number): number => n + 4;
/** Silent Trample: a zone collapses at ⌈N/4⌉ + 1 or more players. */
export const trampleCollapse = (n: number): number => Math.ceil(n / 4) + 1;
/** Land Grab: 36 cells per player, as a square. */
export const landGrabSide = (n: number): number => Math.ceil(Math.sqrt(36 * n));
/** Deep Sea Sonar: 6×6 up to 8 players, 8×8 above. */
export const sonarSide = (n: number): number => (n <= 8 ? 6 : 8);
/** Odd One Out: 1 imposter up to 8 players, 2 above. */
export const imposters = (n: number): number => (n <= 8 ? 1 : 2);
/** Meteor Shield: arc width = 360°/N × 0.8, in radians. */
export const meteorArc = (n: number): number => ((Math.PI * 2) / n) * 0.8;
/** Count to N: the target grows with the room. */
export const countTarget = (n: number): number => Math.min(30, Math.max(12, Math.round(n * 1.25 + 10)));
