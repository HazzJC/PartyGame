import { describe, expect, it } from 'vitest';
import '../game/index.ts';
import { RoomEngine } from '../room.ts';

function makeRoom() {
  let t = 1_000_000;
  let n = 0;
  const room = new RoomEngine(RoomEngine.createState('BCDF', 'h', t, 7), { clock: { now: () => t }, token: () => `tok${++n}` });
  return { room, advance: (ms: number) => { t += ms; room.fireTimers(); } };
}

describe('lobby toys', () => {
  it('calibration stores each player\'s delay and returns to the lobby with doodles intact', () => {
    const { room, advance } = makeRoom();
    const a = room.join('A');
    if (!a.ok) throw new Error();
    room.setConnected(a.seat.id, true);
    room.intent(a.seat.id, { type: 'lobby.doodle', strokes: [{ c: 1, w: 10, p: [1, 2, 3, 4] }] });
    room.hostAction({ action: 'toy', toy: 'calibrate' }, { role: 'host' });
    expect(room.phase.kind).toBe('calibrate');
    expect(room.phase.flashes).toHaveLength(5);
    room.intent(a.seat.id, { type: 'cal.result', delayMs: 1834.6 });
    expect(room.seat(a.seat.id)!.streamDelayMs).toBe(1835);
    advance(5000);
    expect(room.phase.kind).toBe('lobby');
    expect(room.phase.doodles[a.seat.id]).toHaveLength(1);
  });

  it('reaction test plays three rounds with bots and ranks by total', () => {
    const { room, advance } = makeRoom();
    const a = room.join('A');
    if (!a.ok) throw new Error();
    room.setConnected(a.seat.id, true);
    room.addBot();
    room.hostAction({ action: 'toy', toy: 'reaction' }, { role: 'host' });
    for (let round = 1; round <= 3; round++) {
      advance(4000);
      expect(room.phase.stage).toBe('live');
      advance(10);
      room.intent(a.seat.id, { type: 'react', ms: 50 });
      expect(room.phase.results[a.seat.id]).toEqual({ falseStart: true });
    }
    expect(room.phase.stage).toBe('final');
    expect(room.phase.totals[a.seat.id]).toBe(4500);
    advance(9000);
    expect(room.phase.kind).toBe('lobby');
  });
});
