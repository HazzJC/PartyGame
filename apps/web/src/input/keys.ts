import { useEffect, useRef } from 'react';
import { markGamepadUsed } from './device.ts';

/**
 * Virtual keys: keyboard events and gamepad buttons normalised to one stream, so every input
 * primitive supports keys and pads without its own polling code.
 */
export type VKey = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'alt' | 'digit' | 'char' | 'any';

export interface VKeyEvent {
  key: VKey;
  down: boolean;
  /** Raw keyboard key (e.g. "3", "r", " ") when it came from a keyboard. */
  raw?: string;
  shift?: boolean;
  repeat?: boolean;
  timeStamp: number;
  source: 'keyboard' | 'gamepad';
}

type Handler = (e: VKeyEvent) => void;
const handlers = new Set<Handler>();

function emit(e: VKeyEvent): void {
  for (const h of [...handlers]) h(e);
}

const KEYMAP: Record<string, VKey> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'back',
  Backspace: 'back',
  r: 'alt',
  R: 'alt',
};

function keyToV(key: string): VKey {
  const mapped = KEYMAP[key];
  if (mapped) return mapped;
  if (/^[0-9]$/.test(key)) return 'digit';
  if (/^[a-zA-Z]$/.test(key)) return 'char';
  return 'any';
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']);

window.addEventListener('keydown', (e) => {
  if (isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey || handlers.size === 0) return;
  emit({ key: keyToV(e.key), down: true, raw: e.key, shift: e.shiftKey, repeat: e.repeat, timeStamp: e.timeStamp, source: 'keyboard' });
  // Stop the page scrolling on arrows/space while a game surface is listening.
  if (SCROLL_KEYS.has(e.key)) e.preventDefault();
});

window.addEventListener('keyup', (e) => {
  if (isTyping(e.target) || handlers.size === 0) return;
  emit({ key: keyToV(e.key), down: false, raw: e.key, shift: e.shiftKey, timeStamp: e.timeStamp, source: 'keyboard' });
});

// ------------------------------------------------------------------ gamepad polling

const PAD_BUTTONS: [number, VKey][] = [
  [12, 'up'],
  [13, 'down'],
  [14, 'left'],
  [15, 'right'],
  [0, 'confirm'],
  [1, 'back'],
  [2, 'alt'],
  [3, 'alt'],
];

export interface PadAxes {
  x: number;
  y: number;
}

const padState = new Map<string, boolean>();
const axisListeners = new Set<(a: PadAxes) => void>();
let padAxes: PadAxes = { x: 0, y: 0 };
let polling = false;

function setPad(id: string, active: boolean, key: VKey, now: number): void {
  if (active === (padState.get(id) ?? false)) return;
  padState.set(id, active);
  if (active) markGamepadUsed();
  emit({ key, down: active, timeStamp: now, source: 'gamepad' });
}

function poll(): void {
  if (handlers.size === 0 && axisListeners.size === 0) {
    polling = false;
    return;
  }
  const now = performance.now();
  for (const pad of navigator.getGamepads?.() ?? []) {
    if (!pad) continue;
    for (const [index, key] of PAD_BUTTONS) setPad(`${pad.index}:${index}`, pad.buttons[index]?.pressed ?? false, key, now);
    const x = pad.axes[0] ?? 0;
    const y = pad.axes[1] ?? 0;
    setPad(`${pad.index}:ax:l`, x < -0.5, 'left', now);
    setPad(`${pad.index}:ax:r`, x > 0.5, 'right', now);
    setPad(`${pad.index}:ax:u`, y < -0.5, 'up', now);
    setPad(`${pad.index}:ax:d`, y > 0.5, 'down', now);
    const dead = (v: number) => (Math.abs(v) < 0.2 ? 0 : Math.round(v * 100) / 100);
    const next = { x: dead(x), y: dead(y) };
    if (next.x !== padAxes.x || next.y !== padAxes.y) {
      padAxes = next;
      axisListeners.forEach((l) => l(next));
    }
  }
  requestAnimationFrame(poll);
}

function ensurePolling(): void {
  if (polling || !('getGamepads' in navigator)) return;
  polling = true;
  requestAnimationFrame(poll);
}

window.addEventListener('gamepadconnected', ensurePolling);

export function onPadAxes(fn: (a: PadAxes) => void): () => void {
  axisListeners.add(fn);
  ensurePolling();
  return () => {
    axisListeners.delete(fn);
  };
}

/** Subscribe to virtual keys while mounted. The latest handler is always used. */
export function useVirtualKeys(handler: Handler, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const h: Handler = (e) => ref.current(e);
    handlers.add(h);
    ensurePolling();
    return () => {
      handlers.delete(h);
    };
  }, [enabled]);
}
