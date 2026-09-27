/** Parity rule from the design doc: counted taps are capped at 8 to 10 per second per player. */
export const MASH_CAP_PER_SEC = 10;

/** Sliding one-second window that drops taps over the cap. Exported for unit tests. */
export class TapLimiter {
  private times: number[] = [];
  constructor(private readonly cap = MASH_CAP_PER_SEC) {}
  accept(now: number): boolean {
    while (this.times.length && now - this.times[0]! >= 1000) this.times.shift();
    if (this.times.length >= this.cap) return false;
    this.times.push(now);
    return true;
  }
}
