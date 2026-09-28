/** Anti-autoclicker cap on counted taps per second: well above human mashing speed, below macros. */
export const MASH_CAP_PER_SEC = 30;

/** How long one input style keeps the lock after its last tap before another may take over. */
export const MASH_STYLE_LOCK_MS = 700;

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

/** The input styles that can mash: Space, the primary pointer (left click / one finger), or a pad's A button. */
export type MashStyle = 'space' | 'pointer' | 'pad';

/**
 * Mash fairness: taps count from one input style at a time (so nobody drums Space and the mouse
 * together, or several keys at once), capped at 30 a second. The style in use keeps the lock until
 * it has been idle for a moment, then any allowed style can take over.
 */
export class MashGate {
  private limiter: TapLimiter;
  private style: MashStyle | null = null;
  private lastAt = -Infinity;
  constructor(cap = MASH_CAP_PER_SEC, private readonly lockMs = MASH_STYLE_LOCK_MS) {
    this.limiter = new TapLimiter(cap);
  }
  accept(style: MashStyle, now: number): boolean {
    if (this.style !== null && style !== this.style && now - this.lastAt < this.lockMs) return false;
    this.style = style;
    this.lastAt = now;
    return this.limiter.accept(now);
  }
}

/**
 * Which mash style a key event is, if any: only Space on a keyboard (never auto-repeat or other
 * keys) and only the A/confirm button on a gamepad.
 */
export function mashStyleOfKey(e: { key: string; raw?: string; repeat?: boolean; source: 'keyboard' | 'gamepad' }): MashStyle | null {
  if (e.repeat) return null;
  if (e.source === 'gamepad') return e.key === 'confirm' ? 'pad' : null;
  return e.raw === ' ' ? 'space' : null;
}

/**
 * Whether a pointer press is a counted mash tap: the primary button only (left click, one finger,
 * pen tip), and not while another pointer is already held down (no multi-finger drumming).
 */
export function isMashPointer(e: { button: number; isPrimary: boolean }): boolean {
  return e.button === 0 && e.isPrimary;
}
