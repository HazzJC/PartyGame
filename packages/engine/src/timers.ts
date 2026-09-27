import type { Timer } from './types.ts';

/** Keyed one-shot timers stored in room state so they survive Durable Object eviction. */
export class Timers {
  constructor(private list: Timer[]) {}

  set(key: string, at: number): void {
    this.clear(key);
    this.list.push({ key, at });
  }

  clear(key: string): void {
    const i = this.list.findIndex((t) => t.key === key);
    if (i >= 0) this.list.splice(i, 1);
  }

  clearPrefix(prefix: string): void {
    for (let i = this.list.length - 1; i >= 0; i--) if (this.list[i]!.key.startsWith(prefix)) this.list.splice(i, 1);
  }

  has(key: string): boolean {
    return this.list.some((t) => t.key === key);
  }

  at(key: string): number | null {
    return this.list.find((t) => t.key === key)?.at ?? null;
  }

  next(): number | null {
    let min: number | null = null;
    for (const t of this.list) if (min === null || t.at < min) min = t.at;
    return min;
  }

  /** Removes and returns every timer due at or before `now`, earliest first. */
  takeDue(now: number): Timer[] {
    const due = this.list.filter((t) => t.at <= now).sort((a, b) => a.at - b.at);
    for (const t of due) this.clear(t.key);
    return due;
  }
}
