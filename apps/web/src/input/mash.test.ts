import { describe, expect, it } from 'vitest';
import { isMashPointer, MashGate, mashStyleOfKey, TapLimiter } from './tapLimiter.ts';

describe('mash cap', () => {
  it('counts at most the cap in any one-second window', () => {
    const l = new TapLimiter(10);
    let counted = 0;
    // An auto-mash at 30 taps per second for two seconds.
    for (let t = 0; t < 2000; t += 33) if (l.accept(t)) counted++;
    expect(counted).toBeLessThanOrEqual(20);
    expect(counted).toBeGreaterThanOrEqual(18);
  });

  it('lets a very fast human (20 taps a second) through untouched at the default cap of 30', () => {
    const g = new MashGate();
    let counted = 0;
    for (let t = 0; t < 3000; t += 50) if (g.accept('space', t)) counted++;
    expect(counted).toBe(60);
  });

  it('stops a macro at 30 a second', () => {
    const g = new MashGate();
    let counted = 0;
    for (let t = 0; t < 1000; t += 5) if (g.accept('pointer', t)) counted++;
    expect(counted).toBe(30);
  });
});

describe('one input style at a time', () => {
  it('ignores a second style while the first is in use, then lets it take over after a pause', () => {
    const g = new MashGate();
    expect(g.accept('space', 0)).toBe(true);
    expect(g.accept('pointer', 60)).toBe(false);
    expect(g.accept('space', 120)).toBe(true);
    expect(g.accept('pointer', 200)).toBe(false);
    // Space idle for 700 ms: the mouse may take over, and then Space is locked out instead.
    expect(g.accept('pointer', 900)).toBe(true);
    expect(g.accept('space', 950)).toBe(false);
  });

  it('only Space (not other keys, not auto-repeat) or the pad A button counts', () => {
    expect(mashStyleOfKey({ key: 'confirm', raw: ' ', source: 'keyboard' })).toBe('space');
    expect(mashStyleOfKey({ key: 'confirm', raw: 'Enter', source: 'keyboard' })).toBeNull();
    expect(mashStyleOfKey({ key: 'char', raw: 'j', source: 'keyboard' })).toBeNull();
    expect(mashStyleOfKey({ key: 'confirm', raw: ' ', repeat: true, source: 'keyboard' })).toBeNull();
    expect(mashStyleOfKey({ key: 'confirm', source: 'gamepad' })).toBe('pad');
    expect(mashStyleOfKey({ key: 'alt', source: 'gamepad' })).toBeNull();
  });

  it('only a primary left click / single finger counts', () => {
    expect(isMashPointer({ button: 0, isPrimary: true })).toBe(true);
    expect(isMashPointer({ button: 2, isPrimary: true })).toBe(false);
    expect(isMashPointer({ button: 0, isPrimary: false })).toBe(false);
  });
});
