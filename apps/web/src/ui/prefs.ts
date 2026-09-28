/**
 * Per-device display preferences, applied as attributes on <html> so CSS can react:
 * data-motion="reduce" turns animation off, "low" keeps what you need to follow the game (pawns
 * walking, dice) but drops the decoration (scenery, idle bobbing, confetti) for slower PCs, and
 * data-contrast="high" strengthens muted text and edges.
 */
export type Motion = 'system' | 'reduce' | 'low' | 'full';

export interface DisplayPrefs {
  motion: Motion;
  highContrast: boolean;
}

const KEY = 'pg.display';
const listeners = new Set<() => void>();
let prefs: DisplayPrefs = load();

function load(): DisplayPrefs {
  try {
    return { motion: 'system', highContrast: false, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { motion: 'system', highContrast: false };
  }
}

export function applyDisplayPrefs(): void {
  const root = document.documentElement;
  const reduce = prefs.motion === 'reduce' || (prefs.motion === 'system' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.dataset.motion = reduce ? 'reduce' : prefs.motion === 'low' ? 'low' : 'full';
  root.dataset.contrast = prefs.highContrast ? 'high' : 'normal';
}

export function displayPrefs(): Readonly<DisplayPrefs> {
  return prefs;
}

export function setDisplayPrefs(p: Partial<DisplayPrefs>): void {
  prefs = { ...prefs, ...p };
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private mode: lasts for this page.
  }
  applyDisplayPrefs();
  listeners.forEach((l) => l());
}

export function subscribeDisplayPrefs(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** For JS animations: whether to skip them entirely. */
export const motionReduced = () => document.documentElement.dataset.motion === 'reduce';

/** For decorative extras (confetti, bursts): skipped on low animation as well. */
export const decorationOff = () => document.documentElement.dataset.motion !== 'full';
