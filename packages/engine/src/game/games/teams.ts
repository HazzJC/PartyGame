import { placesFromScores } from '@partygame/shared';
import type { MgContext } from '../minigame.ts';

/** Team index for a seat, or -1. */
export function teamOf(ctx: MgContext, seatId: string): number {
  return ctx.phase.teams?.findIndex((t) => t.includes(seatId)) ?? -1;
}

/** Team games place teams by a per-team score; a higher score is better unless told otherwise. */
export function teamPlaces(scores: number[], better: 'high' | 'low' = 'high'): number[] {
  const places = placesFromScores(Object.fromEntries(scores.map((s, i) => [String(i), s])), better);
  return scores.map((_, i) => places[String(i)]!);
}

/** Uneven teams are scored by per-player average, never by total. */
export function perPlayerAverage(total: number, members: number): number {
  return members > 0 ? total / members : 0;
}
