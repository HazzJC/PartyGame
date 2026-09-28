import type { VKey } from './keys.ts';

/**
 * Extra key bindings chosen by the player (accessibility: one-handed play, AZERTY layouts…).
 * They add to the defaults rather than replace them, so on-screen key hints always stay true.
 */
export type BindableKey = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'alt';

export const BINDABLE: { key: BindableKey; label: string; defaults: string }[] = [
  { key: 'up', label: 'Up', defaults: 'W / ↑' },
  { key: 'down', label: 'Down', defaults: 'S / ↓' },
  { key: 'left', label: 'Left', defaults: 'A / ←' },
  { key: 'right', label: 'Right', defaults: 'D / →' },
  { key: 'confirm', label: 'Confirm / action', defaults: 'Space / Enter' },
  { key: 'back', label: 'Back', defaults: 'Esc / Backspace' },
  { key: 'alt', label: 'Rotate / alt', defaults: 'R' },
];

const KEY = 'pg.keys';
let extra: Partial<Record<BindableKey, string>> = load();
const listeners = new Set<() => void>();

function load(): Partial<Record<BindableKey, string>> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(extra));
  } catch {
    // Private mode: bindings last for this page.
  }
  listeners.forEach((l) => l());
}

export const normaliseKey = (k: string) => (k.length === 1 ? k.toLowerCase() : k);

export function extraBindings(): Readonly<Partial<Record<BindableKey, string>>> {
  return extra;
}

export function setBinding(key: BindableKey, raw: string | null): void {
  const next = { ...extra };
  if (raw === null) delete next[key];
  else {
    const k = normaliseKey(raw);
    // One key does one thing.
    for (const b of Object.keys(next) as BindableKey[]) if (next[b] === k) delete next[b];
    next[key] = k;
  }
  extra = next;
  save();
}

export function resetBindings(): void {
  extra = {};
  save();
}

/** AZERTY keyboards: ZQSD movement. */
export function azertyPreset(): void {
  extra = { ...extra, up: 'z', left: 'q', down: 's', right: 'd' };
  save();
}

export function subscribeBindings(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The virtual key a player's own binding maps this key to, if any. */
export function boundKey(raw: string): VKey | undefined {
  const k = normaliseKey(raw);
  for (const b of Object.keys(extra) as BindableKey[]) if (extra[b] === k) return b;
  return undefined;
}

export function keyLabel(k: string): string {
  if (k === ' ') return 'Space';
  if (k.length === 1) return k.toUpperCase();
  return k.replace(/^Arrow/, '');
}
