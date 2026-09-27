import { definePhase, type PhaseBase } from '../phase.ts';
import type { LobbyPhase } from '../lobby.ts';

/**
 * Stream-delay calibration. The host screen flashes a star at scheduled server times; each player
 * taps when they see it on *their* stream, then taps on local flashes to measure their own reaction
 * time. The controller computes the difference and reports it. Stored per player, re-runnable.
 */
export interface CalibratePhase extends PhaseBase {
  kind: 'calibrate';
  flashes: number[];
  results: Record<string, number | null>;
  returnTo: LobbyPhase;
  done?: boolean;
}

export const FLASH_COUNT = 5;
export const MAX_STREAM_DELAY_MS = 8000;

export const calibratePhase = definePhase<CalibratePhase>({
  kind: 'calibrate',
  enter(room, s) {
    const start = room.now() + 4000;
    s.flashes = Array.from({ length: FLASH_COUNT }, (_, i) => start + i * 2400 + room.rng.int(0, 700));
    s.results = {};
    // Last flash, plus a slow Discord stream, plus the local reaction test.
    s.endsAt = s.flashes[FLASH_COUNT - 1]! + 16_000;
    room.setPhaseTimer('end', s.endsAt);
  },
  intent(room, s, seatId, intent) {
    if (intent.type !== 'cal.result' || s.done) return;
    const seat = room.seat(seatId);
    if (!seat) return;
    const raw = intent.delayMs;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
      seat.streamDelayMs = Math.max(0, Math.min(MAX_STREAM_DELAY_MS, Math.round(raw)));
      s.results[seatId] = seat.streamDelayMs;
    } else {
      s.results[seatId] = null;
    }
    const waiting = room.seats.filter((x) => !x.isBot && x.connected && !(x.id in s.results));
    if (waiting.length === 0) {
      s.done = true;
      room.setPhaseTimer('end', room.now() + 4000);
      s.endsAt = room.now() + 4000;
    }
  },
  timer(room, s, key) {
    if (key === 'end') room.goto({ ...s.returnTo, notice: null });
  },
  hostAction(room, s, action) {
    if (action.action === 'skip' || action.action === 'backToLobby') {
      room.goto({ ...s.returnTo, notice: null });
      return true;
    }
    return false;
  },
  hostView: (_room, s) => ({ flashes: s.flashes, results: s.results, done: !!s.done }),
  playerView: (_room, s, seatId) => ({ flashes: s.flashes, submitted: seatId in s.results, done: !!s.done }),
});
