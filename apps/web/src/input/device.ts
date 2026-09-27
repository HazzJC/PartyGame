import type { DeviceProfile, SizeClass } from '@partygame/shared';
import { useSyncExternalStore } from 'react';

export type LastInput = 'touch' | 'mouse' | 'keyboard' | 'gamepad';

export interface LiveProfile extends DeviceProfile {
  /** Most recently used input: drives whether on-screen controls or key hints show. */
  last: LastInput;
  width: number;
  height: number;
}

function sizeClass(w: number, h: number, coarse: boolean): SizeClass {
  const short = Math.min(w, h);
  if (short < 560) return w > h ? 'phone-landscape' : 'phone-portrait';
  if (coarse && short < 1000) return 'tablet';
  return 'desktop';
}

function compute(prev?: LiveProfile): LiveProfile {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const width = Math.round(window.visualViewport?.width ?? innerWidth);
  const height = Math.round(innerHeight);
  const kind = coarse && !fine ? 'touch' : fine ? 'mouse' : navigator.maxTouchPoints > 0 ? 'touch' : 'unknown';
  return {
    kind,
    size: sizeClass(width, height, coarse),
    keyboard: prev?.keyboard ?? kind === 'mouse',
    gamepad: prev?.gamepad ?? false,
    last: prev?.last ?? (kind === 'touch' ? 'touch' : 'mouse'),
    width,
    height,
  };
}

let profile: LiveProfile = compute();
const listeners = new Set<() => void>();

function update(patch?: Partial<LiveProfile>): void {
  const next = { ...compute(profile), ...patch };
  if (JSON.stringify(next) === JSON.stringify(profile)) return;
  profile = next;
  listeners.forEach((l) => l());
}

window.addEventListener('resize', () => update());
window.visualViewport?.addEventListener('resize', () => update());
window.addEventListener(
  'pointerdown',
  (e) => {
    const last: LastInput = e.pointerType === 'mouse' ? 'mouse' : 'touch';
    if (last !== profile.last) update({ last });
  },
  { capture: true, passive: true },
);
window.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Tab' || e.metaKey || e.ctrlKey) return;
    const target = e.target as HTMLElement | null;
    // Typing into a text box on a phone doesn't mean the player switched to a keyboard.
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (profile.last !== 'keyboard' || !profile.keyboard) update({ last: 'keyboard', keyboard: true });
  },
  { capture: true },
);
window.addEventListener('gamepadconnected', () => update({ gamepad: true, last: 'gamepad' }));
window.addEventListener('gamepaddisconnected', () => update({ gamepad: navigator.getGamepads().some(Boolean) }));

export function markGamepadUsed(): void {
  if (profile.last !== 'gamepad') update({ last: 'gamepad', gamepad: true });
}

export function getProfile(): LiveProfile {
  return profile;
}

export function useDevice(): LiveProfile {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => profile,
  );
}

/** Whether to draw on-screen controls (d-pads, thumb buttons) rather than key hints. */
export function wantsOnScreenControls(p: LiveProfile): boolean {
  if (p.last === 'keyboard' || p.last === 'gamepad') return false;
  return p.kind === 'touch' || p.last === 'touch';
}

export function controlScheme(p: LiveProfile): 'touch' | 'keys' | 'gamepad' {
  if (p.last === 'gamepad') return 'gamepad';
  return wantsOnScreenControls(p) ? 'touch' : 'keys';
}

/** Reports the profile to the server whenever it changes meaningfully. */
export function reportDevice(send: (p: DeviceProfile) => void): () => void {
  let last = '';
  const push = () => {
    const p: DeviceProfile = { kind: profile.kind, size: profile.size, keyboard: profile.keyboard, gamepad: profile.gamepad };
    const key = JSON.stringify(p);
    if (key === last) return;
    last = key;
    send(p);
  };
  push();
  listeners.add(push);
  return () => {
    listeners.delete(push);
  };
}
