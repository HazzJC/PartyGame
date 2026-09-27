/**
 * Server-side timing rules. Controllers own the countdowns and timestamp inputs locally; the
 * server only checks that results are possible and submissions beat their deadline.
 */

/** Delivery grace after a deadline, for a submission whose synced timestamp was in time. */
export const DEADLINE_GRACE_MS = 400;
/** Anything faster than this is a false start: nobody reacts in under 100 ms. */
export const MIN_REACTION_MS = 100;

export function inTime(deadline: number, arrivedAt: number, sentAt: number | null): boolean {
  if (arrivedAt > deadline + DEADLINE_GRACE_MS) return false;
  if (sentAt === null) return arrivedAt <= deadline + DEADLINE_GRACE_MS;
  // A client can't claim it sent something after it arrived, or long before (clock abuse).
  const claimed = Math.min(sentAt, arrivedAt);
  return claimed <= deadline;
}

export type ReactionResult = { ms: number } | { falseStart: true } | { missed: true };

export function judgeReaction(input: { ms?: unknown; falseStart?: unknown }, windowMs: number): ReactionResult {
  if (input.falseStart === true) return { falseStart: true };
  const ms = typeof input.ms === 'number' && Number.isFinite(input.ms) ? Math.round(input.ms) : NaN;
  if (Number.isNaN(ms)) return { missed: true };
  if (ms < MIN_REACTION_MS) return { falseStart: true };
  if (ms > windowMs) return { missed: true };
  return { ms };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Stream delay = how late the host screen reaches this player, minus their own reaction time.
 * `streamTaps[i]` answers `flashes[i]`, both in server time; `localReactions` are in ms.
 */
export function estimateStreamDelay(flashes: number[], streamTaps: number[], localReactions: number[]): number | null {
  const n = Math.min(flashes.length, streamTaps.length);
  if (n < 2 || localReactions.length === 0) return null;
  const lags = Array.from({ length: n }, (_, i) => streamTaps[i]! - flashes[i]!);
  return Math.max(0, Math.round(median(lags) - median(localReactions)));
}
