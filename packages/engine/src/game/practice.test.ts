import { describe, expect, it } from 'vitest';
import { createSimRoom, game } from './index.ts';
import { PACE_SCALE } from './pace.ts';

function withHuman(seed: number, bots = 3) {
  const sim = createSimRoom({ seed, bots, length: 'quick', forceGame: 'lowest-unique' });
  const joined = sim.room.join('Ada', 1);
  if (!joined.ok) throw new Error(joined.error);
  sim.room.setConnected(joined.seat.id, true);
  return { ...sim, me: joined.seat.id };
}

describe('practice rounds', () => {
  it('run when players ask, pay nothing, then the rules card comes back for the real thing', () => {
    const { room, run, me } = withHuman(11);
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'rules');
    const coins = { ...Object.fromEntries(Object.entries(game(room).players).map(([id, p]) => [id, p.coins])) };
    room.intent(me, { type: 'practice' }, null);
    run(() => room.phase.kind === 'minigame');
    expect((room.phase as { practice?: boolean }).practice).toBe(true);

    run(() => room.phase.kind === 'rules');
    expect((room.phase as { practised?: boolean }).practised).toBe(true);
    // Nothing was paid and nothing was recorded.
    expect(Object.fromEntries(Object.entries(game(room).players).map(([id, p]) => [id, p.coins]))).toEqual(coins);
    expect(game(room).history).toHaveLength(0);
    // You can't ask for a second practice.
    room.intent(me, { type: 'practice' }, null);
    expect((room.phase as unknown as { practice: string[] }).practice).toEqual([]);

    room.intent(me, { type: 'ready' }, null);
    run(() => room.phase.kind === 'minigame');
    expect((room.phase as { practice?: boolean }).practice).toBeFalsy();
    run(() => room.phase.kind === 'payout');
    expect(game(room).history).toHaveLength(1);
  });

  it('is skipped when players just press Got it, or when the host turns it off', () => {
    const a = withHuman(12);
    a.room.hostAction({ action: 'start' }, { role: 'host' });
    a.run(() => a.room.phase.kind === 'rules');
    a.room.intent(a.me, { type: 'ready' }, null);
    a.run(() => a.room.phase.kind === 'minigame');
    expect((a.room.phase as { practice?: boolean }).practice).toBeFalsy();

    const b = withHuman(13);
    b.room.state.settings.practice = 'off';
    b.room.hostAction({ action: 'start' }, { role: 'host' });
    b.run(() => b.room.phase.kind === 'rules');
    b.room.intent(b.me, { type: 'practice' }, null);
    b.run(() => b.room.phase.kind === 'minigame');
    expect((b.room.phase as { practice?: boolean }).practice).toBeFalsy();
  });

  it('the rules card waits for Got it, and stays up long enough to read at a relaxed pace', () => {
    const { room, run, me } = withHuman(14);
    expect(room.state.settings.pace).toBe('relaxed');
    room.hostAction({ action: 'start' }, { role: 'host' });
    run(() => room.phase.kind === 'rules');
    const shown = room.now();
    room.intent(me, { type: 'ready' }, null);
    run(() => room.phase.kind === 'minigame');
    expect(room.now() - shown).toBeGreaterThanOrEqual(7000 * PACE_SCALE.relaxed);
  });
});
