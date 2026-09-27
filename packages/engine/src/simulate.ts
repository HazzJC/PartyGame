import { RoomEngine } from './room.ts';

/**
 * Runs a room on a fake clock: jumps to each next timer, and steps real-time mini games at their
 * tick rate. Used by tests and the balance simulator (tools/sim).
 */
export function createSimRoom(opts: { seed: number; bots: number; length?: 'quick' | 'standard' | 'long'; forceGame?: string }) {
  let t = 1_000_000;
  let n = 0;
  const room = new RoomEngine(RoomEngine.createState('SIMM', 'host', t, opts.seed), { clock: { now: () => t }, token: () => `tok${++n}` });
  room.state.settings.length = opts.length ?? 'quick';
  if (opts.forceGame) room.state.settings.forceGame = opts.forceGame;
  for (let i = 0; i < opts.bots; i++) room.addBot();

  /** Advances until `until()` is true or `maxMs` of game time passes. Returns phases seen. */
  const run = (until: () => boolean, maxMs = 3 * 60 * 60 * 1000): Set<string> => {
    const seen = new Set<string>();
    const end = t + maxMs;
    while (!until() && t < end) {
      seen.add(room.phase.kind);
      const hz = room.tickHz();
      const next = room.nextTimerAt();
      if (hz > 0) {
        const stepTo = t + 1000 / hz;
        if (next !== null && next <= stepTo) {
          t = Math.max(t, next);
          room.fireTimers();
        } else {
          t = stepTo;
          room.tick();
          room.fireTimers();
        }
        continue;
      }
      if (next === null) break;
      t = Math.max(t, next);
      room.fireTimers();
    }
    return seen;
  };
  return { room, run, now: () => t };
}
