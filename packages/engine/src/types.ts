import type { DeviceProfile, Intent } from '@partygame/shared';

export type SeatId = string;

export interface Seat {
  id: SeatId;
  name: string;
  /** Index into ANIMALS / PLAYER_COLOURS. Unique per room. */
  avatar: number;
  /** Secret. Never included in any view. */
  token: string;
  isBot: boolean;
  vip: boolean;
  connected: boolean;
  device: DeviceProfile | null;
  /** Measured by stream-delay calibration; 0 when watching a TV. */
  streamDelayMs: number;
  joinedAt: number;
}

export type GameLength = 'quick' | 'standard' | 'long';

export interface Settings {
  length: GameLength;
  movement: 'dice' | 'cards';
  /** Mini game ids the host removed from the decks. */
  removedGames: string[];
  /** Dev/testing: deal this mini game every round. */
  forceGame?: string | null;
  /** Dev/testing: allow the 'dev' host actions (give items, queue a duel, open the shop). */
  devTools?: boolean;
  /** Team board mode for big rooms: teams share a pawn, purse, items and stars. */
  teamBoard?: boolean;
}

export interface Timer {
  key: string;
  at: number;
}

/** Public projection of a seat, safe to send to every client. */
export interface PublicSeat {
  id: SeatId;
  name: string;
  avatar: number;
  isBot: boolean;
  vip: boolean;
  connected: boolean;
  device: DeviceProfile['kind'] | null;
  streamDelayMs: number;
}

export interface Clock {
  now(): number;
}

export type { Intent };
