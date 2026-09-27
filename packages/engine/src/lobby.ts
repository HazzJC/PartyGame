import { definePhase, type PhaseBase } from './phase.ts';
import type { RoomEngine } from './room.ts';

export interface LobbyPhase extends PhaseBase {
  kind: 'lobby';
  /** Message shown on every screen, e.g. why the game can't start yet. */
  notice?: string | null;
}

export const MIN_PLAYERS = 2;

type StartHandler = (room: RoomEngine) => void;
let startHandler: StartHandler | null = null;

/** The game module registers what "Start" does. */
export function onStartGame(handler: StartHandler): void {
  startHandler = handler;
}

export const lobbyPhase = definePhase<LobbyPhase>({
  kind: 'lobby',
  hostAction(room, s, action) {
    if (action.action !== 'start') return false;
    if (room.seats.length < MIN_PLAYERS) {
      s.notice = `Need at least ${MIN_PLAYERS} players. Add bots to test solo.`;
      return true;
    }
    if (!startHandler) {
      s.notice = 'The board game arrives in a later build. Try the toys for now!';
      return true;
    }
    s.notice = null;
    startHandler(room);
    return true;
  },
  hostView: (_room, s) => ({ notice: s.notice ?? null }),
  playerView: (_room, s) => ({ notice: s.notice ?? null }),
});
