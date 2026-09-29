import type { RoomEngine } from '../room.ts';
import type { Pace } from '../types.ts';

/**
 * How long the in-between moments last (banners, rules cards, reveals, spotlights, standings).
 * Play itself is never slowed: only the time people get to read, understand and enjoy results.
 */
export const PACE_SCALE: Record<Pace, number> = { relaxed: 1.4, normal: 1, quick: 0.8 };

export const paceOf = (room: RoomEngine): Pace => room.state.settings.pace ?? 'relaxed';

/** A duration scaled by the room's pace setting. */
export function paced(room: RoomEngine, ms: number): number {
  return Math.round(ms * PACE_SCALE[paceOf(room)]);
}
