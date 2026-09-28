import { TUTORIAL_SLIDES, TUTORIAL_SLIDE_MS } from '@partygame/shared';
import { describe, expect, it } from 'vitest';
import { createSimRoom, game } from './index.ts';

describe('how-to-play intro', () => {
  it('runs before the first board when turned on, then never again', () => {
    const { room, run } = createSimRoom({ seed: 3, bots: 4, length: 'quick' });
    room.state.settings.tutorial = true;
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'tutorial');
    expect(room.phase.kind).toBe('tutorial');
    expect(game(room).round).toBe(1);
    const start = room.now();
    run(() => room.phase.kind === 'board');
    expect(room.now() - start).toBeGreaterThanOrEqual((TUTORIAL_SLIDES.length - 1) * TUTORIAL_SLIDE_MS);
    const seen = run(() => room.phase.kind === 'podium');
    expect(seen.has('tutorial')).toBe(false);
  });

  it('is skipped once every connected human has pressed Got it', () => {
    const { room, run } = createSimRoom({ seed: 4, bots: 3, length: 'quick' });
    const joined = room.join('Ada', 1);
    if (!joined.ok) throw new Error(joined.error);
    const human = { seatId: joined.seat.id };
    room.setConnected(human.seatId, true);
    room.state.settings.tutorial = true;
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'tutorial');
    const start = room.now();
    room.intent(human.seatId, { type: 'ready' }, null);
    run(() => room.phase.kind === 'board');
    expect(room.now() - start).toBeLessThan(TUTORIAL_SLIDE_MS);
  });

  it('stays off by default', () => {
    const { room, run } = createSimRoom({ seed: 5, bots: 3, length: 'quick' });
    room.hostAction({ action: 'start' }, { role: 'host' });
    const seen = run(() => room.phase.kind === 'board');
    expect(seen.has('tutorial')).toBe(false);
  });
});
