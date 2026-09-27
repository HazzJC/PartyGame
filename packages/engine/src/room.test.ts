import { describe, expect, it } from 'vitest';
import { RoomEngine, type RoomState } from './room.ts';
import './lobby.ts';

function makeRoom() {
  let t = 1_000_000;
  let n = 0;
  const clock = { now: () => t };
  const state: RoomState = RoomEngine.createState('BCDF', 'host-token', t, 42);
  const room = new RoomEngine(state, { clock, token: () => `tok${++n}` });
  return { room, advance: (ms: number) => (t += ms) };
}

describe('lobby seats', () => {
  it('first human becomes VIP and avatars are unique', () => {
    const { room } = makeRoom();
    const a = room.join('Harry', 3);
    const b = room.join('Sam', 3);
    expect(a.ok && a.seat.vip).toBe(true);
    expect(b.ok && b.seat.vip).toBe(false);
    expect(a.ok && b.ok && a.seat.avatar !== b.seat.avatar).toBe(true);
  });

  it('rejoins a disconnected seat by name but refuses a connected one', () => {
    const { room } = makeRoom();
    const a = room.join('Harry');
    if (!a.ok) throw new Error();
    room.setConnected(a.seat.id, true);
    expect(room.join('harry').ok).toBe(false);
    room.setConnected(a.seat.id, false);
    const again = room.join('HARRY');
    expect(again.ok && again.rejoined && again.seat.id === a.seat.id).toBe(true);
  });

  it('caps at 16 and bots make room for humans', () => {
    const { room } = makeRoom();
    for (let i = 0; i < 16; i++) room.addBot();
    expect(room.seats).toHaveLength(16);
    expect(room.addBot()).toBeNull();
    const h = room.join('Late');
    expect(h.ok).toBe(true);
    expect(room.seats).toHaveLength(16);
  });

  it('never leaks tokens in views', () => {
    const { room } = makeRoom();
    const a = room.join('Harry');
    if (!a.ok) throw new Error();
    room.addBot();
    expect(JSON.stringify(room.hostView())).not.toContain('tok');
    expect(JSON.stringify(room.playerView(a.seat.id))).not.toContain('tok');
    expect(JSON.stringify(room.hostView())).not.toContain('host-token');
  });

  it('only the VIP can run host actions; anyone can fetch their own link', () => {
    const { room } = makeRoom();
    const a = room.join('Harry');
    const b = room.join('Sam');
    if (!a.ok || !b.ok) throw new Error();
    room.hostAction({ action: 'addBot' }, { role: 'player', seatId: b.seat.id });
    expect(room.seats).toHaveLength(2);
    room.hostAction({ action: 'addBot' }, { role: 'player', seatId: a.seat.id });
    expect(room.seats).toHaveLength(3);
    expect(room.hostAction({ action: 'seatLink' }, { role: 'player', seatId: b.seat.id })).toEqual({ t: 'seatLink', token: b.seat.token });
  });

  it('kicking the VIP passes VIP on', () => {
    const { room } = makeRoom();
    const a = room.join('Harry');
    const b = room.join('Sam');
    if (!a.ok || !b.ok) throw new Error();
    room.hostAction({ action: 'kick', seatId: a.seat.id }, { role: 'host' });
    expect(room.seat(b.seat.id)?.vip).toBe(true);
    expect(room.kicked).toEqual([a.seat.id]);
  });

  it('VIP follows whoever is actually connected', () => {
    const { room } = makeRoom();
    const ghost = room.join('Ghost');
    const real = room.join('Real');
    if (!ghost.ok || !real.ok) throw new Error();
    expect(ghost.seat.vip).toBe(true);
    room.setConnected(real.seat.id, true);
    expect(room.vip?.id).toBe(real.seat.id);
    room.setConnected(ghost.seat.id, true);
    room.setConnected(real.seat.id, false);
    expect(room.vip?.id).toBe(ghost.seat.id);
  });

  it('expires after two idle hours', () => {
    const { room, advance } = makeRoom();
    advance(60 * 60 * 1000);
    expect(room.isExpired()).toBe(false);
    advance(61 * 60 * 1000);
    expect(room.isExpired()).toBe(true);
  });
});
