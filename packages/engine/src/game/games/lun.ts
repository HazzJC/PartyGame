import { lunRange } from '@partygame/shared';
import { inTime } from '../../timing.ts';
import { defineMinigame } from '../minigame.ts';

/**
 * Lowest Unique Number: everyone secretly picks a number; the lowest number nobody else picked
 * wins. Placement follows the unique numbers upwards; anyone who clashed shares last place.
 */
export interface LunData {
  max: number;
  closesAt: number;
  picks: Record<string, number>;
}

export const PICK_MS = 15_000;

export function lunPlaces(picks: Record<string, number>, participants: string[]): Record<string, number> {
  const counts = new Map<number, number>();
  for (const n of Object.values(picks)) counts.set(n, (counts.get(n) ?? 0) + 1);
  const uniques = [...counts.entries()].filter(([, c]) => c === 1).map(([n]) => n).sort((a, b) => a - b);
  const places: Record<string, number> = {};
  for (const id of participants) {
    const pick = picks[id];
    const i = pick === undefined ? -1 : uniques.indexOf(pick);
    places[id] = i >= 0 ? i + 1 : uniques.length + 1;
  }
  return places;
}

export const lowestUnique = defineMinigame<LunData>({
  id: 'lowest-unique',
  name: 'Lowest Unique Number',
  formats: ['ffa', 'duel'],
  inputs: [{ kind: 'pick', what: 'Pick a number' }],
  blurb: 'Pick a number in secret. The lowest number that nobody else picked wins. Clash with someone and you both score nothing.',
  setup(ctx) {
    const closesAt = ctx.now() + PICK_MS;
    ctx.setTimer('deadline', closesAt + 400);
    ctx.phase.endsAt = closesAt;
    // A 1v1 duel uses 1 to 5; otherwise the range scales with the room.
    return { max: ctx.phase.format === 'duel' ? 5 : lunRange(ctx.n), closesAt, picks: {} };
  },
  intent(ctx, d, seatId, intent, sentAt) {
    if (intent.type !== 'pick') return;
    const n = Number(intent.n);
    if (!Number.isInteger(n) || n < 1 || n > d.max) return;
    if (!inTime(d.closesAt, ctx.now(), sentAt)) return;
    d.picks[seatId] = n;
    if (ctx.phase.participants.every((id) => id in d.picks)) ctx.hurry('deadline', 1200);
  },
  timer(ctx, d, key) {
    if (key !== 'deadline') return;
    ctx.finish({ kind: 'ffa', places: lunPlaces(d.picks, ctx.phase.participants) }, 3000 + d.max * 350);
  },
  awaiting: (_ctx, d, seatId) => !(seatId in d.picks),
  botDelay: [1500, 9000],
  bot(ctx, d) {
    // Bots lean low, like people do.
    const hi = Math.max(2, Math.ceil(d.max * 0.6));
    return { type: 'pick', n: Math.min(ctx.rng.int(1, hi), ctx.rng.int(1, hi)) };
  },
  hostView: (ctx, d) => ({
    max: d.max,
    closesAt: d.closesAt,
    submitted: Object.keys(d.picks),
    picks: ctx.phase.stage === 'reveal' ? d.picks : null,
  }),
  playerView: (_ctx, d, seatId) => ({ max: d.max, closesAt: d.closesAt, myPick: d.picks[seatId] ?? null }),
});
