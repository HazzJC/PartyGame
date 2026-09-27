import { DRAW_PALETTE, sanitiseStrokes, type Stroke } from '@partygame/shared';
import { definePhase, type PhaseBase } from './phase.ts';
import type { RoomEngine } from './room.ts';

export interface LobbyPhase extends PhaseBase {
  kind: 'lobby';
  /** Message shown on every screen, e.g. why the game can't start yet. */
  notice?: string | null;
  /** Lobby toy: each player's doodled flag, drawn behind their sticker on the host screen. */
  doodles?: Record<string, Stroke[]>;
  /** Lobby toy: d-pad wiggle offset for each player's sticker. */
  nudges?: Record<string, { x: number; y: number }>;
}

export const MIN_PLAYERS = 2;
const MAX_DOODLE_STROKES = 60;

type StartHandler = (room: RoomEngine) => void;
let startHandler: StartHandler | null = null;

/** The game module registers what "Start" does. */
export function onStartGame(handler: StartHandler): void {
  startHandler = handler;
}

const clampUnit = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-1, Math.min(1, Math.round(v * 100) / 100)) : 0);

export const lobbyPhase = definePhase<LobbyPhase>({
  kind: 'lobby',
  intent(_room, s, seatId, intent) {
    if (intent.type === 'lobby.doodle') {
      s.doodles ??= {};
      s.doodles[seatId] = sanitiseStrokes(intent.strokes, DRAW_PALETTE.length).slice(0, MAX_DOODLE_STROKES);
    } else if (intent.type === 'lobby.nudge') {
      s.nudges ??= {};
      s.nudges[seatId] = { x: clampUnit(intent.x), y: clampUnit(intent.y) };
    }
  },
  hostAction(room, s, action) {
    if (action.action === 'toy') {
      // Toys run as their own phases and hand the lobby (doodles and all) back when done.
      const returnTo: LobbyPhase = { ...s, notice: null };
      if (action.toy === 'calibrate') room.goto({ kind: 'calibrate', flashes: [], results: {}, returnTo });
      if (action.toy === 'reaction') room.goto({ kind: 'reaction', returnTo });
      return true;
    }
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
  hostView: (_room, s) => ({ notice: s.notice ?? null, doodles: s.doodles ?? {}, nudges: s.nudges ?? {} }),
  playerView: (_room, s, seatId) => ({ notice: s.notice ?? null, myDoodle: s.doodles?.[seatId] ?? [] }),
});
